import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Plus, Receipt, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl, cx } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/faturamento")({
  head: () => ({ meta: [{ title: "Faturamento — Admin" }, { name: "robots", content: "noindex" }] }),
  component: BillingLayout,
});

function BillingLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isRoot = pathname === "/admin/faturamento" || pathname === "/admin/faturamento/";
  return isRoot ? <BillingList /> : <Outlet />;
}

type Invoice = {
  id: string;
  type: "receipt" | "nfe";
  number: number;
  series: string;
  status: "issued" | "paid" | "cancelled";
  customer_name: string;
  customer_doc: string | null;
  total: number;
  tax_total: number;
  payment_method: string | null;
  issued_at: string;
};

const TYPE_LABEL = { receipt: "Recibo / Fatura", nfe: "Nota fiscal" };
const STATUS_LABEL = { issued: "Emitida", paid: "Paga", cancelled: "Cancelada" };

function BillingList() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "receipt" | "nfe">("all");

  const invoices = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id,type,number,series,status,customer_name,customer_doc,total,tax_total,payment_method,issued_at")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });

  const all = invoices.data ?? [];
  const month = new Date().toISOString().slice(0, 7);
  const monthTotal = all
    .filter((i) => i.status !== "cancelled" && i.issued_at.slice(0, 7) === month)
    .reduce((s, i) => s + Number(i.total), 0);
  const taxTotal = all.filter((i) => i.status !== "cancelled").reduce((s, i) => s + Number(i.tax_total), 0);

  const list = all.filter((i) => {
    if (type !== "all" && i.type !== type) return false;
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (
      i.customer_name.toLowerCase().includes(t) ||
      String(i.number).includes(t) ||
      (i.customer_doc ?? "").includes(t)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Faturamento</h2>
          <p className="text-sm text-muted-foreground">
            Emita recibos profissionais (sem nota fiscal) ou notas fiscais completas.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/faturamento/nova"
            search={{ tipo: "receipt" }}
            className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-surface"
          >
            <Receipt className="h-4 w-4" /> Novo recibo
          </Link>
          <Link
            to="/admin/faturamento/nova"
            search={{ tipo: "nfe" }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-brand"
          >
            <Plus className="h-4 w-4" /> Nova nota fiscal
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Faturado no mês" value={brl(monthTotal)} />
        <Kpi label="Documentos emitidos" value={String(all.filter((i) => i.status !== "cancelled").length)} />
        <Kpi label="Tributos destacados" value={brl(taxTotal)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "receipt", "nfe"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cx(
              "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider",
              type === t ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "all" ? "Todos" : TYPE_LABEL[t]}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente, número ou CPF/CNPJ" className="inp pl-9 md:w-72" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-surface text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Documento</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Emissão</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Situação</th>
              <th className="px-4 py-3 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.isLoading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>}
            {!invoices.isLoading && !list.length && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum documento emitido ainda.</td></tr>
            )}
            {list.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3">
                  <div className="inline-flex items-center gap-2 font-semibold">
                    {i.type === "nfe" ? <FileText className="h-4 w-4 text-brand" /> : <Receipt className="h-4 w-4" />}
                    Nº {String(i.number).padStart(6, "0")}
                  </div>
                  <div className="text-xs text-muted-foreground">{TYPE_LABEL[i.type]} · série {i.series}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{i.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{i.customer_doc ?? "—"}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(i.issued_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 text-right font-bold">{brl(Number(i.total))}</td>
                <td className="px-4 py-3">
                  <span
                    className={cx(
                      "rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider",
                      i.status === "paid" && "bg-emerald-500/15 text-emerald-600",
                      i.status === "issued" && "bg-amber-500/15 text-amber-600",
                      i.status === "cancelled" && "bg-surface text-muted-foreground line-through",
                    )}
                  >
                    {STATUS_LABEL[i.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to="/admin/faturamento/$id"
                    params={{ id: i.id }}
                    className="rounded-md border border-input px-3 py-1.5 text-xs font-bold uppercase hover:bg-surface"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
