import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Barcode, CheckCircle2, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { brl, cx } from "@/lib/format";
import { billSchema, firstFiscalIssue, formatDate } from "@/lib/fiscal";
import { Field } from "./empresa";

export const Route = createFileRoute("/_authenticated/admin/boletos")({
  head: () => ({ meta: [{ title: "Boletos — Admin" }, { name: "robots", content: "noindex" }] }),
  component: BillsPage,
});

type Bill = {
  id: string;
  description: string;
  supplier: string;
  category: string | null;
  amount: number;
  due_date: string;
  barcode: string | null;
  attachment_url: string | null;
  notes: string | null;
  status: "pending" | "paid" | "cancelled";
  paid_at: string | null;
  paid_amount: number | null;
  created_at: string;
};

const EMPTY = {
  description: "", supplier: "", category: "", amount: "", due_date: "",
  barcode: "", attachment_url: "", notes: "",
};

const FILTERS = [
  { key: "pending", label: "A pagar" },
  { key: "paid", label: "Pagos" },
  { key: "cancelled", label: "Cancelados" },
  { key: "all", label: "Histórico completo" },
] as const;

function BillsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("pending");
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  const bills = useQuery({
    queryKey: ["admin-bills"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bills").select("*").order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Bill[];
    },
  });

  const all = bills.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const pending = all.filter((b) => b.status === "pending");
  const overdue = pending.filter((b) => b.due_date < today);
  const paid = all.filter((b) => b.status === "paid");
  const list = filter === "all" ? all : all.filter((b) => b.status === filter);

  const sum = (arr: Bill[], key: "amount" | "paid_amount" = "amount") =>
    arr.reduce((s, b) => s + Number(b[key] ?? b.amount), 0);

  const save = async () => {
    const parsed = billSchema.safeParse({ ...form, amount: Number(form.amount) });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] = i.message;
      setErrors(errs);
      return toast.error(firstFiscalIssue(parsed.error));
    }
    setErrors({});
    const d = parsed.data;
    const { error } = await supabase.from("bills").insert({
      description: d.description,
      supplier: d.supplier,
      category: d.category || null,
      amount: d.amount,
      due_date: d.due_date,
      barcode: d.barcode || null,
      attachment_url: d.attachment_url || null,
      notes: d.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Boleto cadastrado");
    setForm({ ...EMPTY });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-bills"] });
  };

  const update = async (id: string, patch: Record<string, unknown>, msg: string) => {
    const { error } = await supabase.from("bills").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["admin-bills"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este boleto do histórico?")) return;
    const { error } = await supabase.from("bills").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Boleto excluído");
    qc.invalidateQueries({ queryKey: ["admin-bills"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Boletos</h2>
          <p className="text-sm text-muted-foreground">Contas a pagar, pagamentos e histórico completo.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-brand"
        >
          <Plus className="h-4 w-4" /> Novo boleto
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="A pagar" value={brl(sum(pending))} hint={`${pending.length} boleto(s)`} />
        <Kpi label="Vencidos" value={brl(sum(overdue))} hint={`${overdue.length} em atraso`} danger />
        <Kpi label="Pagos" value={brl(sum(paid, "paid_amount"))} hint={`${paid.length} quitado(s)`} />
        <Kpi label="Total lançado" value={brl(sum(all))} hint={`${all.length} registro(s)`} />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cx(
              "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider",
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-surface text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Descrição</th>
              <th className="px-4 py-3 text-left">Fornecedor</th>
              <th className="px-4 py-3 text-left">Vencimento</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-left">Situação</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bills.isLoading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>}
            {!bills.isLoading && !list.length && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum boleto nesta lista.</td></tr>
            )}
            {list.map((b) => {
              const late = b.status === "pending" && b.due_date < today;
              return (
                <tr key={b.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{b.description}</div>
                    {b.barcode && <div className="font-mono text-[11px] text-muted-foreground">{b.barcode}</div>}
                    {b.category && <div className="text-xs text-muted-foreground">{b.category}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{b.supplier}</td>
                  <td className={cx("px-4 py-3", late ? "font-bold text-destructive" : "text-muted-foreground")}>
                    {formatDate(b.due_date)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{brl(Number(b.amount))}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cx(
                        "rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider",
                        b.status === "paid" && "bg-emerald-500/15 text-emerald-600",
                        b.status === "pending" && (late ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600"),
                        b.status === "cancelled" && "bg-surface text-muted-foreground",
                      )}
                    >
                      {b.status === "paid" ? `Pago ${formatDate(b.paid_at)}` : b.status === "pending" ? (late ? "Vencido" : "A pagar") : "Cancelado"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {b.status === "pending" && (
                        <>
                          <button
                            onClick={() => update(b.id, { status: "paid", paid_at: today, paid_amount: b.amount }, "Boleto marcado como pago")}
                            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground hover:bg-brand"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Pagar
                          </button>
                          <button
                            onClick={() => update(b.id, { status: "cancelled" }, "Boleto cancelado")}
                            className="rounded-md border border-input px-2 py-1.5 text-xs hover:bg-surface"
                            aria-label="Cancelar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {b.status !== "pending" && (
                        <button
                          onClick={() => update(b.id, { status: "pending", paid_at: null, paid_amount: null }, "Boleto reaberto")}
                          className="rounded-md border border-input px-2 py-1.5 text-xs hover:bg-surface"
                          aria-label="Reabrir"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => remove(b.id)}
                        className="rounded-md border border-input px-2 py-1.5 text-xs text-destructive hover:bg-surface"
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 text-lg font-bold">
                <Barcode className="h-5 w-5" /> Novo boleto
              </h3>
              <button onClick={() => setOpen(false)} className="p-1" aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Descrição" error={errors.description}>
                <input className="inp" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <Field label="Fornecedor" error={errors.supplier}>
                <input className="inp" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              </Field>
              <Field label="Categoria" error={errors.category}>
                <input className="inp" placeholder="Ex.: Fornecedores, Aluguel" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </Field>
              <Field label="Valor (R$)" error={errors.amount}>
                <input className="inp" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Field>
              <Field label="Vencimento" error={errors.due_date}>
                <input className="inp" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </Field>
              <Field label="Linha digitável" error={errors.barcode}>
                <input className="inp font-mono" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
              </Field>
              <Field label="Anexo (URL do PDF)" error={errors.attachment_url}>
                <input className="inp" value={form.attachment_url} onChange={(e) => setForm({ ...form, attachment_url: e.target.value })} />
              </Field>
              <Field label="Observações" error={errors.notes}>
                <input className="inp" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-md border border-input px-5 py-2.5 text-sm font-semibold">Cancelar</button>
              <button onClick={save} className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-brand">
                Salvar boleto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, hint, danger }: { label: string; value: string; hint?: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cx("mt-1 text-2xl font-bold", danger && "text-destructive")}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
