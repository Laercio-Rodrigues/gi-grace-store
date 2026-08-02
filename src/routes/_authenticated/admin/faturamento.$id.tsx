import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CheckCircle2, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { brl, cx } from "@/lib/format";
import { PAYMENT_OPTIONS, formatDoc, formatCep } from "@/lib/fiscal";

export const Route = createFileRoute("/_authenticated/admin/faturamento/$id")({
  head: () => ({ meta: [{ title: "Documento — Admin" }, { name: "robots", content: "noindex" }] }),
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { id } = useParams({ from: "/_authenticated/admin/faturamento/$id" });
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin-invoice", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, items:invoice_items(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (q.isLoading) return <div className="py-16 text-center text-muted-foreground">Carregando...</div>;
  if (!q.data) return <div className="py-16 text-center text-muted-foreground">Documento não encontrado.</div>;

  const inv = q.data as any;
  const payload = inv.payload ?? {};
  const company = payload.company ?? {};
  const cust = payload.customer ?? {};
  const items = [...(inv.items ?? [])].sort((a: any, b: any) => a.position - b.position);
  const isNfe = inv.type === "nfe";
  const payLabel = PAYMENT_OPTIONS.find((p) => p.value === inv.payment_method)?.label ?? inv.payment_method ?? "—";

  const setStatus = async (status: "issued" | "paid" | "cancelled") => {
    const { error } = await supabase.from("invoices").update({ status }).eq("id", inv.id);
    if (error) return toast.error(error.message);
    toast.success("Situação atualizada");
    qc.invalidateQueries({ queryKey: ["admin-invoice", id] });
    qc.invalidateQueries({ queryKey: ["admin-invoices"] });
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/faturamento" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex flex-wrap gap-2">
          {inv.status !== "paid" && (
            <button onClick={() => setStatus("paid")} className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-xs font-bold uppercase hover:bg-surface">
              <CheckCircle2 className="h-4 w-4" /> Marcar como paga
            </button>
          )}
          {inv.status !== "cancelled" && (
            <button onClick={() => setStatus("cancelled")} className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-xs font-bold uppercase text-destructive hover:bg-surface">
              <Ban className="h-4 w-4" /> Cancelar
            </button>
          )}
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase text-primary-foreground hover:bg-brand">
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="print-area rounded-lg border border-border bg-card p-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="text-lg font-bold">{company.legal_name || "Empresa não configurada"}</div>
            {company.trade_name && <div className="text-sm">{company.trade_name}</div>}
            <div className="text-xs text-muted-foreground">
              CNPJ {formatDoc(company.cnpj ?? "")} · IE {company.ie ?? "—"}
              {company.im ? ` · IM ${company.im}` : ""}
            </div>
            <div className="text-xs text-muted-foreground">
              {company.street} {company.number}
              {company.complement ? `, ${company.complement}` : ""} — {company.district}, {company.city}/{company.state} · CEP {formatCep(company.zip_code ?? "")}
            </div>
            <div className="text-xs text-muted-foreground">
              {company.phone ?? ""} {company.email ? `· ${company.email}` : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {isNfe ? "Nota fiscal de venda (modelo 55)" : "Recibo / fatura de venda"}
            </div>
            <div className="text-2xl font-bold">Nº {String(inv.number).padStart(6, "0")}</div>
            <div className="text-xs text-muted-foreground">Série {inv.series}</div>
            <div className="text-xs text-muted-foreground">Emissão: {new Date(inv.issued_at).toLocaleString("pt-BR")}</div>
            <div className={cx("mt-1 text-xs font-bold uppercase", inv.status === "cancelled" && "text-destructive")}>
              {inv.status === "paid" ? "Paga" : inv.status === "cancelled" ? "Cancelada" : "Emitida"}
            </div>
          </div>
        </header>

        <section className="grid gap-4 border-b border-border py-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {isNfe ? "Destinatário" : "Cliente"}
            </div>
            <div className="font-semibold">{inv.customer_name}</div>
            <div className="text-sm text-muted-foreground">
              {inv.customer_doc ? formatDoc(inv.customer_doc) : "—"}
              {cust.ie ? ` · IE ${cust.ie}` : ""}
            </div>
            <div className="text-sm text-muted-foreground">
              {cust.street} {cust.number}
              {cust.complement ? `, ${cust.complement}` : ""}
            </div>
            <div className="text-sm text-muted-foreground">
              {cust.district ? `${cust.district} — ` : ""}{cust.city}{cust.state ? `/${cust.state}` : ""} {cust.zip_code ? `· CEP ${formatCep(cust.zip_code)}` : ""}
            </div>
            <div className="text-sm text-muted-foreground">{inv.customer_email ?? cust.email ?? ""} {cust.phone ?? ""}</div>
          </div>
          <div className="md:text-right">
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Pagamento</div>
            <div className="text-sm">{payLabel}</div>
            {isNfe && (
              <div className="mt-2 text-sm text-muted-foreground">
                Frete (modalidade): {payload.freight_mode ?? "9"}
                {payload.carrier ? ` · Transportadora: ${payload.carrier}` : ""}
              </div>
            )}
            {inv.order_id && (
              <div className="mt-2 text-xs text-muted-foreground">Pedido nº {String(inv.order_id).slice(0, 8)}</div>
            )}
          </div>
        </section>

        <section className="py-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">Descrição</th>
                  {isNfe && <th className="py-2 text-left">NCM</th>}
                  {isNfe && <th className="py-2 text-left">CFOP</th>}
                  {isNfe && <th className="py-2 text-left">CST</th>}
                  <th className="py-2 text-left">Un.</th>
                  <th className="py-2 text-right">Qtd.</th>
                  <th className="py-2 text-right">Vl. unit.</th>
                  {isNfe && <th className="py-2 text-right">ICMS</th>}
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((it: any) => (
                  <tr key={it.id}>
                    <td className="py-2">
                      {it.description}
                      {it.code && <span className="block text-xs text-muted-foreground">Cód. {it.code}</span>}
                    </td>
                    {isNfe && <td className="py-2">{it.ncm ?? "—"}</td>}
                    {isNfe && <td className="py-2">{it.cfop ?? "—"}</td>}
                    {isNfe && <td className="py-2">{it.cst ?? "—"}</td>}
                    <td className="py-2">{it.unit}</td>
                    <td className="py-2 text-right">{Number(it.quantity)}</td>
                    <td className="py-2 text-right">{brl(Number(it.unit_price))}</td>
                    {isNfe && <td className="py-2 text-right">{brl(Number(it.icms_value))}</td>}
                    <td className="py-2 text-right font-semibold">{brl(Number(it.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 border-t border-border pt-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Informações complementares</div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {inv.notes ??
                (isNfe
                  ? "Documento fiscal de controle interno. Não substitui a NF-e autorizada pela SEFAZ."
                  : "Recibo de venda sem emissão de nota fiscal.")}
            </p>
            {isNfe && (
              <p className="mt-2 text-xs text-muted-foreground">
                Regime tributário (CRT): {company.crt ?? "—"}. Valores de ICMS, IPI, PIS e COFINS destacados por item conforme layout da NF-e.
              </p>
            )}
          </div>
          <div className="md:justify-self-end md:w-64">
            <Row label="Produtos" value={brl(Number(inv.products_total))} />
            <Row label="Frete" value={brl(Number(inv.shipping))} />
            <Row label="Outras despesas" value={brl(Number(inv.other_expenses))} />
            <Row label="Desconto" value={`- ${brl(Number(inv.discount))}`} />
            {isNfe && <Row label="Tributos" value={brl(Number(inv.tax_total))} />}
            <div className="mt-2 border-t border-border pt-2">
              <Row label="Total" value={brl(Number(inv.total))} bold />
            </div>
          </div>
        </section>
      </div>
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
