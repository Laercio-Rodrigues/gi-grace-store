import crypto from "node:crypto";
import { prisma } from "./db.server";

/**
 * Integração com o Checkout Pro via API de Orders do Mercado Pago.
 * Fluxo: POST /v1/orders -> checkout_url -> comprador paga -> webhook (type "order")
 * -> GET /v1/orders/{id} confirma o pagamento -> pedido vira "pago".
 */

const API = "https://api.mercadopago.com";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const mpEnabled = () => !!process.env.MP_ACCESS_TOKEN;
export const cashEnabled = () => process.env.ALLOW_CASH_PICKUP === "true";
export const maxInstallments = () => {
  const n = Number(process.env.MP_MAX_INSTALLMENTS ?? 12);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : 12;
};

function accessToken() {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("Pagamento online indisponível no momento.");
  return t;
}

function baseUrl() {
  const url = process.env.APP_URL?.replace(/\/$/, "");
  if (!url) throw new Error("APP_URL não configurado.");
  return url;
}

async function mpFetch(path: string, init?: RequestInit) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

// ───────────── Criar order (Checkout Pro) ─────────────

type OrderInput = { orderId: string; total: number; email: string };

function buildOrderBody(input: OrderInput, level: "full" | "minimal") {
  const base = baseUrl();
  const https = base.startsWith("https://");
  const url = (state: string) => `${base}/conta?pagamento=${state}&pedido=${input.orderId}`;
  const title = `Pedido #${input.orderId.slice(0, 8)}`;

  const online: Record<string, unknown> = {
    callback_url: `${base}/conta?pedido=${input.orderId}`,
    success_url: url("sucesso"),
    failure_url: url("falha"),
    pending_url: url("pendente"),
  };
  const paymentMethod: Record<string, unknown> = {
    max_installments: maxInstallments(),
    // Por padrão só PIX e cartão. MP_ALLOW_BOLETO=true libera boleto.
    ...(process.env.MP_ALLOW_BOLETO === "true" ? {} : { not_allowed_types: ["ticket"] }),
  };

  if (level === "full") {
    // retorno automático só funciona em endereço público HTTPS
    if (https) online.auto_return = "approved";
    // permite o comprador tentar de novo com outro cartão depois de uma recusa
    online.retries = { allowed: true };
    // parcelas sem juros: de 2x até N (opcional)
    const free = Number(process.env.MP_INTEREST_FREE_UP_TO ?? 0);
    if (Number.isInteger(free) && free >= 2 && free <= 12) {
      paymentMethod.installments = { interest_free: { type: "range", values: [2, free] } };
    }
  }

  return {
    type: "online",
    processing_mode: "manual",
    total_amount: money(input.total),
    external_reference: input.orderId,
    description: title,
    expiration_time: process.env.MP_ORDER_EXPIRATION || "P1D",
    payer: { email: input.email },
    // O total (já com frete e desconto) é calculado no servidor.
    items: [{ title, unit_price: money(input.total), quantity: 1 }],
    config: { online, payment_method: paymentMethod },
  };
}

export async function createOrder(input: OrderInput) {
  let lastStatus = 0;
  // Se o Mercado Pago rejeitar algum campo opcional (400), tenta de novo com o corpo mínimo.
  for (const level of ["full", "minimal"] as const) {
    const res = await mpFetch("/v1/orders", {
      method: "POST",
      headers: { "X-Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(buildOrderBody(input, level)),
    });
    if (res.ok) {
      const data = (await res.json()) as { id: string; checkout_url: string };
      if (!data.checkout_url) throw new Error("Resposta do Mercado Pago sem checkout_url");
      return { id: data.id, url: data.checkout_url };
    }
    lastStatus = res.status;
    console.error(`[mercadopago] criar order (${level}) falhou`, res.status, await res.text());
    if (res.status !== 400) break;
  }
  throw new Error(
    lastStatus === 401
      ? "Pagamento indisponível: credenciais do Mercado Pago inválidas."
      : "Não foi possível iniciar o pagamento. Tente novamente em instantes.",
  );
}

// ───────────── Consultar order ─────────────

type MpPayment = {
  id?: string;
  amount?: string;
  paid_amount?: string;
  status?: string;
  status_detail?: string;
  payment_method?: { id?: string; type?: string; installments?: number };
};

export type MpOrder = {
  id: string;
  status: string;
  status_detail?: string;
  external_reference?: string | null;
  total_amount?: string;
  total_paid_amount?: string;
  currency?: string;
  transactions?: { payments?: MpPayment[] };
};

export async function fetchMpOrder(id: string): Promise<MpOrder | null> {
  const res = await mpFetch(`/v1/orders/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error("[mercadopago] consultar order falhou", res.status, await res.text());
    throw new Error(`Mercado Pago respondeu ${res.status} ao consultar a order`);
  }
  return (await res.json()) as MpOrder;
}

// ───────────── Aplicar o resultado no pedido ─────────────

type LocalStatus = "pending" | "approved" | "rejected" | "cancelled" | "refunded";

function mapStatus(s: string): LocalStatus | null {
  switch (s) {
    case "processed":
      return "approved";
    case "refunded":
      return "refunded";
    case "canceled":
    case "cancelled":
      return "cancelled";
    case "failed":
      return "rejected";
    case "created":
    case "processing":
    case "action_required":
      return "pending";
    default:
      return null;
  }
}

function methodLabel(p?: MpPayment): string {
  const id = p?.payment_method?.id;
  const type = p?.payment_method?.type;
  if (id === "pix" || type === "bank_transfer") return "pix";
  if (type === "credit_card") return "credit";
  if (type === "debit_card") return "debit";
  if (type === "ticket") return "boleto";
  return "mercadopago";
}

/** Atualiza o pedido a partir de uma order do Mercado Pago (idempotente). */
export async function applyMpOrder(o: MpOrder): Promise<{ applied: boolean; reason?: string }> {
  const ref = o.external_reference;
  if (!ref || !UUID_RE.test(ref)) return { applied: false, reason: "sem referência do pedido" };

  const order = await prisma.order.findUnique({ where: { id: ref } });
  if (!order) return { applied: false, reason: "pedido não encontrado" };
  // a order do MP precisa ser a que nós criamos para este pedido
  if (order.mp_order_id && order.mp_order_id !== o.id) {
    return { applied: false, reason: "order diferente da registrada" };
  }

  const next = mapStatus(o.status);
  if (!next) return { applied: false, reason: `status desconhecido: ${o.status}` };

  // Um pagamento aprovado nunca é "desfeito" por um estado pendente/recusado/cancelado.
  if (order.payment_status === "approved" && (next === "pending" || next === "rejected" || next === "cancelled")) {
    return { applied: false, reason: "pedido já pago" };
  }

  const payments = o.transactions?.payments ?? [];
  const paidPayment = payments.find((p) => p.status === "processed") ?? payments[payments.length - 1];

  if (next === "approved") {
    const total = Number(o.total_amount);
    const paid = Number(o.total_paid_amount ?? o.total_amount);
    const expected = Number(order.total);
    if (
      (o.currency && o.currency !== "BRL") ||
      Math.abs(total - expected) > 0.01 ||
      paid + 0.01 < expected
    ) {
      console.error(
        `[mercadopago] valor divergente no pedido ${order.id}: total ${total}, pago ${paid}, esperado ${expected}`,
      );
      return { applied: false, reason: "valor divergente" };
    }
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      payment_status: next,
      mp_order_id: o.id,
      ...(paidPayment?.id ? { mp_payment_id: paidPayment.id } : {}),
      ...(next === "approved" || payments.length ? { payment_method: methodLabel(paidPayment) } : {}),
      ...(next === "approved"
        ? {
            paid_at: order.paid_at ?? new Date(),
            ...(order.status === "pending" ? { status: "paid" as const } : {}),
          }
        : {}),
    },
  });
  return { applied: true };
}

/** Consulta o Mercado Pago pelo pedido (usado ao voltar do pagamento, caso o aviso demore). */
export async function syncOrderPayment(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, user_id: userId } });
  if (!order || !order.mp_order_id || order.payment_status === "approved" || !mpEnabled()) return;
  const mpOrder = await fetchMpOrder(order.mp_order_id);
  if (mpOrder) await applyMpOrder(mpOrder);
}

// ───────────── Webhook ─────────────

function validSignature(request: Request, dataId: string | null): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  // Sem segredo configurado, a segurança vem de reconsultar a order na API do Mercado Pago.
  if (!secret) return true;

  const header = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!header || !requestId || !dataId) return false;

  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, ...v] = kv.trim().split("=");
      return [k, v.join("=")];
    }),
  ) as Record<string, string>;
  if (!parts.ts || !parts.v1) return false;

  const received = Buffer.from(parts.v1);
  // o formato do id no texto assinado (original ou minúsculo) varia por tópico: aceitamos os dois
  return [dataId, dataId.toLowerCase()].some((id) => {
    const manifest = `id:${id};request-id:${requestId};ts:${parts.ts};`;
    const expected = Buffer.from(crypto.createHmac("sha256", secret).update(manifest).digest("hex"));
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  });
}

export async function handleMpWebhook(request: Request): Promise<Response> {
  const url = new URL(request.url);
  let body: { type?: string; topic?: string; data?: { id?: string | number } } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const type = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? body.type ?? body.topic ?? "";
  const dataIdRaw = url.searchParams.get("data.id") ?? body.data?.id ?? null;
  const dataId = dataIdRaw == null ? null : String(dataIdRaw);

  if (!validSignature(request, dataId)) {
    return new Response("assinatura inválida", { status: 401 });
  }
  // só nos interessam avisos de order (type "order" / tópico "orders_v2")
  if (!/^order/i.test(type) || !dataId) return new Response("ok", { status: 200 });

  try {
    const mpOrder = await fetchMpOrder(dataId);
    if (mpOrder) await applyMpOrder(mpOrder);
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("[mercadopago] erro no webhook", e);
    // 500 faz o Mercado Pago tentar de novo mais tarde
    return new Response("erro", { status: 500 });
  }
}
