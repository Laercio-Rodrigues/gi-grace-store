import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, cx } from "@/lib/format";
import {
  CFOP_OPTIONS,
  CST_OPTIONS,
  ORIGIN_OPTIONS,
  PAYMENT_OPTIONS,
  UFS,
  computeItem,
  customerSchema,
  firstFiscalIssue,
  invoiceItemSchema,
  nfeCustomerSchema,
  nfeItemSchema,
  round2,
} from "@/lib/fiscal";
import { Field } from "./empresa";

type Search = { tipo?: "receipt" | "nfe"; pedido?: string; produto?: string };

export const Route = createFileRoute("/_authenticated/admin/faturamento/nova")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tipo: s.tipo === "nfe" ? "nfe" : "receipt",
    pedido: typeof s.pedido === "string" ? s.pedido : undefined,
    produto: typeof s.produto === "string" ? s.produto : undefined,
  }),
  head: () => ({ meta: [{ title: "Emitir documento — Admin" }, { name: "robots", content: "noindex" }] }),
  component: NewInvoice,
});

type Item = {
  product_id: string | null;
  code: string;
  description: string;
  ncm: string;
  cest: string;
  cfop: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount: number;
  origin: string;
  cst: string;
  icms_rate: number;
  ipi_rate: number;
  pis_rate: number;
  cofins_rate: number;
};

const emptyItem = (): Item => ({
  product_id: null, code: "", description: "", ncm: "", cest: "", cfop: "5102", unit: "UN",
  quantity: 1, unit_price: 0, discount: 0, origin: "0", cst: "102",
  icms_rate: 0, ipi_rate: 0, pis_rate: 0, cofins_rate: 0,
});

const emptyCustomer = {
  name: "", doc: "", ie: "", email: "", phone: "",
  street: "", number: "", complement: "", district: "", city: "", state: "SP", zip_code: "",
};

function NewInvoice() {
  const { tipo, pedido, produto } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [type, setType] = useState<"receipt" | "nfe">(tipo ?? "receipt");
  const [customer, setCustomer] = useState({ ...emptyCustomer });
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [shipping, setShipping] = useState(0);
  const [otherExpenses, setOtherExpenses] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState("17");
  const [freight, setFreight] = useState("9");
  const [carrier, setCarrier] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const company = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const order = useQuery({
    queryKey: ["invoice-order", pedido],
    enabled: !!pedido,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, items:order_items(*)")
        .eq("id", pedido!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const product = useQuery({
    queryKey: ["invoice-product", produto],
    enabled: !!produto,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", produto!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const o = order.data as any;
    if (!o) return;
    const addr = o.address_json ?? {};
    setCustomer((c) => ({
      ...c,
      name: addr.name ?? c.name,
      street: addr.street ?? "",
      number: addr.number ?? "",
      complement: addr.complement ?? "",
      district: addr.district ?? "",
      city: addr.city ?? "",
      state: addr.state ?? c.state,
      zip_code: addr.zip_code ?? "",
    }));
    setShipping(Number(o.shipping ?? 0));
    setDiscount(Number(o.discount ?? 0));
    setItems(
      (o.items ?? []).map((it: any) => ({
        ...emptyItem(),
        product_id: it.product_id,
        description: it.product_name + (it.size_name ? ` - Tam. ${it.size_name}` : ""),
        quantity: Number(it.quantity),
        unit_price: Number(it.price),
      })),
    );
  }, [order.data]);

  useEffect(() => {
    const p = product.data as any;
    if (!p) return;
    setItems([
      {
        ...emptyItem(),
        product_id: p.id,
        code: p.sku ?? "",
        description: p.name,
        ncm: p.ncm ?? "",
        cest: p.cest ?? "",
        cfop: p.cfop ?? "5102",
        unit: p.unit ?? "UN",
        unit_price: Number(p.sale_price ?? p.price),
        origin: p.origin ?? "0",
        cst: p.cst ?? "102",
        icms_rate: Number(p.icms_rate ?? 0),
        ipi_rate: Number(p.ipi_rate ?? 0),
        pis_rate: Number(p.pis_rate ?? 0),
        cofins_rate: Number(p.cofins_rate ?? 0),
      },
    ]);
  }, [product.data]);

  const computed = useMemo(() => items.map((i) => computeItem(i)), [items]);
  const productsTotal = round2(computed.reduce((s, c) => s + c.total, 0));
  const taxTotal = round2(computed.reduce((s, c) => s + c.tax_total, 0));
  const total = round2(Math.max(0, productsTotal - discount) + shipping + otherExpenses);

  const setItem = (idx: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const submit = async () => {
    const custSchema = type === "nfe" ? nfeCustomerSchema : customerSchema;
    const parsedCust = custSchema.safeParse(customer);
    if (!parsedCust.success) {
      const errs: Record<string, string> = {};
      for (const i of parsedCust.error.issues) errs[String(i.path[0])] = i.message;
      setErrors(errs);
      return toast.error(firstFiscalIssue(parsedCust.error));
    }
    setErrors({});

    if (!items.length) return toast.error("Adicione ao menos um item");
    const itemSchema = type === "nfe" ? nfeItemSchema : invoiceItemSchema;
    for (let i = 0; i < items.length; i++) {
      const parsed = itemSchema.safeParse(items[i]);
      if (!parsed.success) return toast.error(`Item ${i + 1}: ${firstFiscalIssue(parsed.error)}`);
    }
    if (type === "nfe") {
      const c = company.data as any;
      if (!c?.cnpj) return toast.error("Cadastre os dados da empresa antes de emitir uma nota fiscal");
    }

    setSaving(true);
    const series = type === "nfe" ? String((company.data as any)?.nfe_series ?? "1") : "1";
    const { data: nextNumber, error: numErr } = await supabase.rpc("next_invoice_number", {
      _type: type,
      _series: series,
    });
    if (numErr) { setSaving(false); return toast.error(numErr.message); }

    const { data: inv, error } = await supabase
      .from("invoices")
      .insert({
        order_id: pedido ?? null,
        type,
        number: nextNumber as number,
        series,
        customer_name: parsedCust.data.name,
        customer_doc: parsedCust.data.doc || null,
        customer_email: parsedCust.data.email || null,
        products_total: productsTotal,
        shipping,
        discount,
        other_expenses: otherExpenses,
        tax_total: taxTotal,
        total,
        payment_method: payment,
        notes: notes || null,
        payload: {
          company: company.data ?? null,
          customer: parsedCust.data,
          freight_mode: freight,
          carrier,
        },
        created_by: user?.id ?? null,
      })
      .select("id")
      .maybeSingle();

    if (error || !inv) { setSaving(false); return toast.error(error?.message ?? "Falha ao emitir"); }

    const rows = items.map((it, idx) => ({
      invoice_id: inv.id,
      position: idx,
      product_id: it.product_id,
      code: it.code || null,
      description: it.description,
      ncm: it.ncm || null,
      cest: it.cest || null,
      cfop: it.cfop || null,
      unit: it.unit,
      quantity: it.quantity,
      unit_price: it.unit_price,
      discount: it.discount,
      total: computed[idx].total,
      origin: it.origin || null,
      cst: it.cst || null,
      icms_base: computed[idx].icms_base,
      icms_rate: it.icms_rate,
      icms_value: computed[idx].icms_value,
      ipi_rate: it.ipi_rate,
      ipi_value: computed[idx].ipi_value,
      pis_rate: it.pis_rate,
      pis_value: computed[idx].pis_value,
      cofins_rate: it.cofins_rate,
      cofins_value: computed[idx].cofins_value,
    }));
    const { error: itemsErr } = await supabase.from("invoice_items").insert(rows);
    setSaving(false);
    if (itemsErr) return toast.error(itemsErr.message);

    toast.success(type === "nfe" ? "Nota fiscal emitida" : "Recibo emitido");
    navigate({ to: "/admin/faturamento/$id", params: { id: inv.id } });
  };

  const isNfe = type === "nfe";

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate({ to: "/admin/faturamento" })}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div>
        <h2 className="text-2xl font-bold">Emitir documento</h2>
        <p className="text-sm text-muted-foreground">
          Escolha entre faturar sem nota fiscal (recibo/fatura de venda) ou emitir uma nota fiscal completa.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(["receipt", "nfe"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cx(
              "rounded-lg border p-4 text-left transition-colors",
              type === t ? "border-brand bg-surface" : "border-border hover:bg-surface",
            )}
          >
            <div className="font-bold">{t === "receipt" ? "Faturar sem nota fiscal" : "Faturar com nota fiscal"}</div>
            <div className="text-xs text-muted-foreground">
              {t === "receipt"
                ? "Recibo / fatura de venda com dados do cliente, itens e forma de pagamento."
                : "Documento completo com CNPJ, NCM, CFOP, CST/CSOSN e tributos por item."}
            </div>
          </button>
        ))}
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 font-bold">{isNfe ? "Destinatário" : "Cliente"}</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Nome / Razão social" error={errors.name}>
            <input className="inp" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
          </Field>
          <Field label={isNfe ? "CPF / CNPJ" : "CPF / CNPJ (opcional)"} error={errors.doc}>
            <input className="inp" value={customer.doc} onChange={(e) => setCustomer({ ...customer, doc: e.target.value })} />
          </Field>
          <Field label="Inscrição estadual" error={errors.ie}>
            <input className="inp" value={customer.ie} onChange={(e) => setCustomer({ ...customer, ie: e.target.value })} placeholder="ISENTO" />
          </Field>
          <Field label="E-mail" error={errors.email}>
            <input className="inp" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
          </Field>
          <Field label="Telefone" error={errors.phone}>
            <input className="inp" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
          </Field>
          <Field label="CEP" error={errors.zip_code}>
            <input className="inp" value={customer.zip_code} onChange={(e) => setCustomer({ ...customer, zip_code: e.target.value })} />
          </Field>
          <Field label="Logradouro" error={errors.street}>
            <input className="inp" value={customer.street} onChange={(e) => setCustomer({ ...customer, street: e.target.value })} />
          </Field>
          <Field label="Número" error={errors.number}>
            <input className="inp" value={customer.number} onChange={(e) => setCustomer({ ...customer, number: e.target.value })} />
          </Field>
          <Field label="Complemento" error={errors.complement}>
            <input className="inp" value={customer.complement} onChange={(e) => setCustomer({ ...customer, complement: e.target.value })} />
          </Field>
          <Field label="Bairro" error={errors.district}>
            <input className="inp" value={customer.district} onChange={(e) => setCustomer({ ...customer, district: e.target.value })} />
          </Field>
          <Field label="Município" error={errors.city}>
            <input className="inp" value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} />
          </Field>
          <Field label="UF" error={errors.state}>
            <select className="inp" value={customer.state} onChange={(e) => setCustomer({ ...customer, state: e.target.value })}>
              {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold">Itens</h3>
          <button
            onClick={() => setItems((a) => [...a, emptyItem()])}
            className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-xs font-bold uppercase hover:bg-surface"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar item
          </button>
        </div>

        <div className="space-y-5">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-md border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Item {idx + 1}</span>
                <button
                  onClick={() => setItems((a) => a.filter((_, i) => i !== idx))}
                  className="rounded-md border border-input p-1.5 text-destructive hover:bg-surface"
                  aria-label="Remover item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Field label="Descrição">
                    <input className="inp" value={it.description} onChange={(e) => setItem(idx, { description: e.target.value })} />
                  </Field>
                </div>
                <Field label="Código / SKU">
                  <input className="inp" value={it.code} onChange={(e) => setItem(idx, { code: e.target.value })} />
                </Field>
                <Field label="Unidade">
                  <input className="inp" value={it.unit} onChange={(e) => setItem(idx, { unit: e.target.value })} />
                </Field>
                <Field label="Quantidade">
                  <input className="inp" type="number" step="0.001" value={it.quantity} onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })} />
                </Field>
                <Field label="Valor unitário">
                  <input className="inp" type="number" step="0.01" value={it.unit_price} onChange={(e) => setItem(idx, { unit_price: Number(e.target.value) })} />
                </Field>
                <Field label="Desconto">
                  <input className="inp" type="number" step="0.01" value={it.discount} onChange={(e) => setItem(idx, { discount: Number(e.target.value) })} />
                </Field>
                <Field label="Total do item">
                  <input className="inp bg-surface" readOnly value={brl(computed[idx]?.total ?? 0)} />
                </Field>

                {isNfe && (
                  <>
                    <Field label="NCM">
                      <input className="inp" value={it.ncm} onChange={(e) => setItem(idx, { ncm: e.target.value })} placeholder="62031900" />
                    </Field>
                    <Field label="CEST">
                      <input className="inp" value={it.cest} onChange={(e) => setItem(idx, { cest: e.target.value })} />
                    </Field>
                    <Field label="CFOP">
                      <select className="inp" value={it.cfop} onChange={(e) => setItem(idx, { cfop: e.target.value })}>
                        {CFOP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Origem">
                      <select className="inp" value={it.origin} onChange={(e) => setItem(idx, { origin: e.target.value })}>
                        {ORIGIN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </Field>
                    <Field label="CST / CSOSN">
                      <select className="inp" value={it.cst} onChange={(e) => setItem(idx, { cst: e.target.value })}>
                        {CST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </Field>
                    <Field label="ICMS %">
                      <input className="inp" type="number" step="0.01" value={it.icms_rate} onChange={(e) => setItem(idx, { icms_rate: Number(e.target.value) })} />
                    </Field>
                    <Field label="IPI %">
                      <input className="inp" type="number" step="0.01" value={it.ipi_rate} onChange={(e) => setItem(idx, { ipi_rate: Number(e.target.value) })} />
                    </Field>
                    <Field label="PIS %">
                      <input className="inp" type="number" step="0.01" value={it.pis_rate} onChange={(e) => setItem(idx, { pis_rate: Number(e.target.value) })} />
                    </Field>
                    <Field label="COFINS %">
                      <input className="inp" type="number" step="0.01" value={it.cofins_rate} onChange={(e) => setItem(idx, { cofins_rate: Number(e.target.value) })} />
                    </Field>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <h3 className="mb-4 font-bold">Pagamento e transporte</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Forma de pagamento">
              <select className="inp" value={payment} onChange={(e) => setPayment(e.target.value)}>
                {PAYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Frete (R$)">
              <input className="inp" type="number" step="0.01" value={shipping} onChange={(e) => setShipping(Number(e.target.value))} />
            </Field>
            <Field label="Desconto geral (R$)">
              <input className="inp" type="number" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </Field>
            <Field label="Outras despesas (R$)">
              <input className="inp" type="number" step="0.01" value={otherExpenses} onChange={(e) => setOtherExpenses(Number(e.target.value))} />
            </Field>
            {isNfe && (
              <>
                <Field label="Modalidade do frete">
                  <select className="inp" value={freight} onChange={(e) => setFreight(e.target.value)}>
                    {["0", "1", "2", "3", "4", "9"].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Transportadora">
                  <input className="inp" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
                </Field>
              </>
            )}
            <div className="md:col-span-2">
              <Field label="Informações complementares">
                <textarea className="inp min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 font-bold">Totais</h3>
          <Row label="Produtos" value={brl(productsTotal)} />
          <Row label="Frete" value={brl(shipping)} />
          <Row label="Outras despesas" value={brl(otherExpenses)} />
          <Row label="Desconto" value={`- ${brl(discount)}`} />
          {isNfe && <Row label="Tributos" value={brl(taxTotal)} />}
          <div className="mt-3 border-t border-border pt-3">
            <Row label="Total" value={brl(total)} bold />
          </div>
          <button
            onClick={submit}
            disabled={saving}
            className="mt-5 w-full rounded-md bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-brand disabled:opacity-60"
          >
            {saving ? "Emitindo..." : isNfe ? "Emitir nota fiscal" : "Emitir recibo"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cx("flex justify-between py-1 text-sm", bold && "text-lg font-bold")}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
