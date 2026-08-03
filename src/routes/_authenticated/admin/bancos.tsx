import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Landmark, Plus, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cx } from "@/lib/format";
import { Field } from "./empresa";

export const Route = createFileRoute("/_authenticated/admin/bancos")({
  head: () => ({
    meta: [
      { title: "Contas de recebimento — Admin" },
      { name: "description", content: "Escolha o banco usado para receber os pagamentos da loja." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BanksPage,
});

type Account = {
  id: string;
  label: string;
  bank_name: string;
  bank_code: string | null;
  agency: string | null;
  account_number: string | null;
  account_type: string;
  holder_name: string;
  holder_doc: string | null;
  pix_key_type: string | null;
  pix_key: string | null;
  notes: string | null;
  active: boolean;
  is_default: boolean;
};

const EMPTY = {
  label: "", bank_name: "", bank_code: "", agency: "", account_number: "",
  account_type: "corrente", holder_name: "", holder_doc: "",
  pix_key_type: "cnpj", pix_key: "", notes: "",
};

const ACCOUNT_TYPES = [
  { value: "corrente", label: "Conta corrente" },
  { value: "poupanca", label: "Conta poupança" },
  { value: "pagamento", label: "Conta de pagamento" },
];

const PIX_TYPES = [
  { value: "cnpj", label: "CNPJ" },
  { value: "cpf", label: "CPF" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "aleatoria", label: "Chave aleatória" },
];

function BanksPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["admin-payment-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_accounts")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });

  const list = q.data ?? [];
  const current = list.find((a) => a.is_default && a.active) ?? null;
  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-payment-accounts"] });

  const save = async () => {
    const errs: Record<string, string> = {};
    if (form.label.trim().length < 2) errs.label = "Informe um apelido para a conta";
    if (form.bank_name.trim().length < 2) errs.bank_name = "Informe o banco";
    if (form.holder_name.trim().length < 2) errs.holder_name = "Informe o titular";
    if (!form.pix_key.trim() && !form.account_number.trim())
      errs.account_number = "Informe a conta ou uma chave PIX";
    setErrors(errs);
    if (Object.keys(errs).length) return toast.error(Object.values(errs)[0]);

    setSaving(true);
    const { error } = await supabase.from("payment_accounts").insert({
      label: form.label.trim(),
      bank_name: form.bank_name.trim(),
      bank_code: form.bank_code.trim() || null,
      agency: form.agency.trim() || null,
      account_number: form.account_number.trim() || null,
      account_type: form.account_type,
      holder_name: form.holder_name.trim(),
      holder_doc: form.holder_doc.trim() || null,
      pix_key_type: form.pix_key.trim() ? form.pix_key_type : null,
      pix_key: form.pix_key.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Conta cadastrada");
    setForm({ ...EMPTY });
    setOpen(false);
    refresh();
  };

  const makeDefault = async (acc: Account) => {
    const clear = await supabase
      .from("payment_accounts")
      .update({ is_default: false })
      .eq("is_default", true);
    if (clear.error) return toast.error(clear.error.message);
    const { error } = await supabase
      .from("payment_accounts")
      .update({ is_default: true, active: true })
      .eq("id", acc.id);
    if (error) return toast.error(error.message);
    toast.success(`${acc.bank_name} agora recebe os pagamentos`);
    refresh();
  };

  const toggleActive = async (acc: Account) => {
    if (acc.is_default && acc.active)
      return toast.error("Escolha outro banco como principal antes de desativar este");
    const { error } = await supabase
      .from("payment_accounts")
      .update({ active: !acc.active })
      .eq("id", acc.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const remove = async (acc: Account) => {
    if (acc.is_default) return toast.error("Não é possível excluir a conta principal");
    if (!confirm(`Excluir a conta "${acc.label}"?`)) return;
    const { error } = await supabase.from("payment_accounts").delete().eq("id", acc.id);
    if (error) return toast.error(error.message);
    toast.success("Conta excluída");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Contas de recebimento</h2>
          <p className="text-sm text-muted-foreground">
            Escolha em qual banco a loja recebe os pagamentos dos pedidos.
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-brand"
        >
          {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {open ? "Cancelar" : "Nova conta"}
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Landmark className="h-5 w-5 text-brand" />
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Banco que recebe os pagamentos
            </div>
            <div className="text-lg font-bold">
              {current ? `${current.bank_name} — ${current.label}` : "Nenhum banco selecionado"}
            </div>
            {current && (
              <div className="text-sm text-muted-foreground">
                Ag. {current.agency ?? "—"} · Conta {current.account_number ?? "—"}
                {current.pix_key ? ` · PIX ${current.pix_key}` : ""}
              </div>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="rounded-lg border border-border bg-card p-5 grid gap-4 md:grid-cols-2">
          <Field label="Apelido da conta" error={errors.label}>
            <input className="inp" value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="Conta principal" />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Field label="Banco" error={errors.bank_name}>
                <input className="inp" value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} placeholder="Banco do Brasil" />
              </Field>
            </div>
            <Field label="Código">
              <input className="inp" value={form.bank_code} onChange={(e) => set("bank_code", e.target.value)} placeholder="001" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Agência">
              <input className="inp" value={form.agency} onChange={(e) => set("agency", e.target.value)} />
            </Field>
            <Field label="Conta" error={errors.account_number}>
              <input className="inp" value={form.account_number} onChange={(e) => set("account_number", e.target.value)} />
            </Field>
          </div>
          <Field label="Tipo de conta">
            <select className="inp" value={form.account_type} onChange={(e) => set("account_type", e.target.value)}>
              {ACCOUNT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Titular" error={errors.holder_name}>
            <input className="inp" value={form.holder_name} onChange={(e) => set("holder_name", e.target.value)} />
          </Field>
          <Field label="CPF/CNPJ do titular">
            <input className="inp" value={form.holder_doc} onChange={(e) => set("holder_doc", e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Tipo PIX">
              <select className="inp" value={form.pix_key_type} onChange={(e) => set("pix_key_type", e.target.value)}>
                {PIX_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Chave PIX">
                <input className="inp" value={form.pix_key} onChange={(e) => set("pix_key", e.target.value)} />
              </Field>
            </div>
          </div>
          <Field label="Observações">
            <input className="inp" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-brand disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Cadastrar conta"}
            </button>
          </div>
        </div>
      )}

      {q.isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando...</div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          Nenhuma conta cadastrada ainda.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((a) => (
            <div
              key={a.id}
              className={cx(
                "rounded-lg border bg-card p-5",
                a.is_default ? "border-brand" : "border-border",
                !a.active && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{a.bank_name}</span>
                    {a.bank_code && <span className="text-xs text-muted-foreground">#{a.bank_code}</span>}
                  </div>
                  <div className="text-sm text-muted-foreground">{a.label}</div>
                </div>
                {a.is_default && (
                  <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                    Principal
                  </span>
                )}
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <Info label="Agência" value={a.agency} />
                <Info label="Conta" value={a.account_number} />
                <Info label="Tipo" value={ACCOUNT_TYPES.find((t) => t.value === a.account_type)?.label ?? a.account_type} />
                <Info label="Titular" value={a.holder_name} />
                {a.pix_key && <Info label={`PIX (${a.pix_key_type})`} value={a.pix_key} />}
                <Info label="Status" value={a.active ? "Ativa" : "Inativa"} />
              </dl>
              {a.notes && <p className="mt-3 text-sm text-muted-foreground">{a.notes}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => makeDefault(a)}
                  disabled={a.is_default}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                >
                  <Star className="h-3.5 w-3.5" /> Receber neste banco
                </button>
                <button
                  onClick={() => toggleActive(a)}
                  className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                >
                  {a.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  onClick={() => remove(a)}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold text-destructive hover:bg-muted"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
