import crypto from "node:crypto";
import { prisma } from "./db.server";

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
      ...(init?.headers ?? {}),
    },
  });
}

// ───────────── Criar cobrança (Checkout Pro) ─────────────

export async function createPreference(input: { orderId: string; total: number; email: string }) {
  const base = baseUrl();
  const https = base.startsWith("https://");
  const orderUrl = (state: string) => `${base}/conta?pagamento=${state}&pedido=${input.orderId}`;
  const now = Date.now();

  const body: Record<string, unknown> = {
    // O total (já com frete e desconto) é calculado no servidor.
    items: [
      {
        id: input.orderId,
        title: `Pedido #${input.orderId.slice(0, 8)}`,
        quantity: 1,
        unit_price: Math.round(input.total * 100) / 100,
        currency_id: "BRL",
      },
    ],
    payer: { email: input.email },
    external_reference: input.orderId,
    back_urls: {
      success: orderUrl("sucesso"),
      pending: orderUrl("pendente"),
      failure: orderUrl("falha"),
    },
    payment_methods: {
      // Por padrão só PIX e cartão. Defina MP_ALLOW_BOLETO=true para liberar boleto.
      excluded_payment_types: process.env.MP_ALLOW_BOLETO === "true" ? [] : [{ id: "ticket" }],
      installments: maxInstallments(),
    },
    expires: true,
    expiration_date_from: new Date(now).toISOString(),
    expiration_date_to: new Date(now + 72 * 3600 * 1000).toISOString(),
  };
  // O Mercado Pago só aceita notificação e retorno automático em endereços públicos HTTPS.
  if (https) {
    body.notification_url = `${base}/api/mercadopago/webhook`;
    body.auto_return = "approved";
  }

  const res = await mpFetch("/checkout/preferences", { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) {
    console.error("[mercadopago] erro ao criar preferência", res.status, await res.text());
    throw new Error("Não foi possível iniciar o pagamento. Tente novamente em instantes.");
  }
  const data = (await res.json()) as { id: string; init_point: string };
  return { id: data.id, url: data.init_point };
}

// ───────────── Consultar pagamentos ─────────────

export type MpPayment = {
  id: number | string;
  status: string;
  status_detail?: string;
  transaction_amount: number;
  currency_id?: string;
  external_reference?: string | null;
  payment_type_id?: string;
  payment_method_id?: string;
};

export async function fetchPayment(id: string | number): Promise<MpPayment | null> {
  const res = await mpFetch(`/v1/payments/${encodeURIComponent(String(id))}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Mercado Pago respondeu ${res.status} ao consultar o pagamento`);
  return (await res.json()) as MpPayment;
}

async function searchPayments(orderId: string): Promise<MpPayment[]> {
  const q = new URLSearchParams({
    external_reference: orderId,
    sort: "date_created",
    criteria: "desc",
    limit: "10",
  });
  const res = await mpFetch(`/v1/payments/search?${q}`);
  if (!res.ok) throw new Error(`Mercado Pago respondeu ${res.status} na busca de pagamentos`);
  const data = (await res.json()) as { results?: MpPayment[] };
  return data.results ?? [];
}

// ───────────── Aplicar o resultado no pedido ─────────────

type LocalStatus = "pending" | "approved" | "rejected" | "cancelled" | "refunded";

const STATUS_MAP: Record<string, LocalStatus> = {
  approved: "approved",
  authorized: "pending",
  pending: "pending",
  in_process: "pending",
  in_mediation: "pending",
  rejected: "rejected",
  cancelled: "cancelled",
  refunded: "refunded",
  charged_back: "refunded",
};

function methodLabel(p: MpPayment): string {
  if (p.payment_method_id === "pix") return "pix";
  if (p.payment_type_id === "credit_card") return "credit";
  if (p.payment_type_id === "debit_card") return "debit";
  if (p.payment_type_id === "ticket") return "boleto";
  return "mercadopago";
}

/** Atualiza o pedido a partir de um pagamento do Mercado Pago (idempotente). */
export async function applyPayment(p: MpPayment): Promise<{ applied: boolean; reason?: string }> {
  const orderId = p.external_reference;
  if (!orderId || !UUID_RE.test(orderId)) return { applied: false, reason: "sem pedido" };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { applied: false, reason: "pedido não encontrado" };

  const next = STATUS_MAP[p.status];
  if (!next) return { applied: false, reason: `status desconhecido: ${p.status}` };

  const paymentId = String(p.id);

  // Um pagamento aprovado nunca é "desfeito" por outra tentativa recusada ou pendente.
  if (order.payment_status === "approved" && order.mp_payment_id !== paymentId && next !== "approved") {
    return { applied: false, reason: "pedido já pago por outro pagamento" };
  }

  if (next === "approved") {
    const paid = Number(p.transaction_amount);
    const expected = Number(order.total);
    if ((p.currency_id && p.currency_id !== "BRL") || Math.abs(paid - expected) > 0.01) {
      console.error(
        `[mercadopago] valor divergente no pedido ${order.id}: pago ${paid} ${p.currency_id}, esperado ${expected}`,
      );
      return { applied: false, reason: "valor divergente" };
    }
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      payment_status: next,
      mp_payment_id: paymentId,
      payment_method: methodLabel(p),
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
  if (!order || order.payment_status === "approved" || !mpEnabled()) return;
  const payments = await searchPayments(order.id);
  const best = payments.find((p) => p.status === "approved") ?? payments[0];
  if (best) await applyPayment(best);
}

// ───────────── Webhook ─────────────

function validSignature(request: Request, dataId: string | null): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  // Sem segredo configurado, a segurança vem de reconsultar o pagamento na API do Mercado Pago.
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

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function handleMpWebhook(request: Request): Promise<Response> {
  const url = new URL(request.url);
  let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const type = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? body.type;
  const dataIdRaw = url.searchParams.get("data.id") ?? body.data?.id ?? null;
  const dataId = dataIdRaw == null ? null : String(dataIdRaw);

  if (!validSignature(request, dataId)) {
    return new Response("assinatura inválida", { status: 401 });
  }
  if (type !== "payment" || !dataId) return new Response("ok", { status: 200 });

  try {
    const payment = await fetchPayment(dataId);
    if (payment) await applyPayment(payment);
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("[mercadopago] erro no webhook", e);
    // 500 faz o Mercado Pago tentar de novo mais tarde
    return new Response("erro", { status: 500 });
  }
}
