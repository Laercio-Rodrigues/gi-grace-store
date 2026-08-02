import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { companySchema, CRT_OPTIONS, UFS, firstFiscalIssue } from "@/lib/fiscal";

export const Route = createFileRoute("/_authenticated/admin/empresa")({
  head: () => ({ meta: [{ title: "Dados da empresa — Admin" }, { name: "robots", content: "noindex" }] }),
  component: CompanyPage,
});

const EMPTY = {
  legal_name: "", trade_name: "", cnpj: "", ie: "", im: "", crt: "1",
  street: "", number: "", complement: "", district: "", city: "", city_code: "",
  state: "SP", zip_code: "", phone: "", email: "", nfe_series: "1",
};

type Form = typeof EMPTY;

function CompanyPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (q.data) {
      const d = q.data as Record<string, unknown>;
      setForm((f) => {
        const next = { ...f };
        for (const k of Object.keys(EMPTY) as (keyof Form)[]) {
          if (d[k] != null) next[k] = String(d[k]);
        }
        return next;
      });
    }
  }, [q.data]);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const parsed = companySchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] = i.message;
      setErrors(errs);
      return toast.error(firstFiscalIssue(parsed.error));
    }
    setErrors({});
    setSaving(true);
    const payload = { ...parsed.data, singleton: true };
    const existing = q.data as { id?: string } | null;
    const res = existing?.id
      ? await supabase.from("company_settings").update(payload).eq("id", existing.id)
      : await supabase.from("company_settings").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Dados da empresa salvos");
    qc.invalidateQueries({ queryKey: ["company-settings"] });
  };

  if (q.isLoading) return <div className="py-16 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dados da empresa (emitente)</h2>
        <p className="text-sm text-muted-foreground">
          Usados no cabeçalho dos recibos e das notas fiscais. Obrigatórios para emitir NF-e.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 grid gap-4 md:grid-cols-2">
        <Field label="Razão social" error={errors.legal_name}>
          <input className="inp" value={form.legal_name} onChange={(e) => set("legal_name", e.target.value)} />
        </Field>
        <Field label="Nome fantasia" error={errors.trade_name}>
          <input className="inp" value={form.trade_name} onChange={(e) => set("trade_name", e.target.value)} />
        </Field>
        <Field label="CNPJ" error={errors.cnpj}>
          <input className="inp" value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
        </Field>
        <Field label="Inscrição estadual" error={errors.ie}>
          <input className="inp" value={form.ie} onChange={(e) => set("ie", e.target.value)} placeholder="ISENTO se não houver" />
        </Field>
        <Field label="Inscrição municipal" error={errors.im}>
          <input className="inp" value={form.im} onChange={(e) => set("im", e.target.value)} />
        </Field>
        <Field label="Regime tributário (CRT)" error={errors.crt}>
          <select className="inp" value={form.crt} onChange={(e) => set("crt", e.target.value)}>
            {CRT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Logradouro" error={errors.street}>
          <input className="inp" value={form.street} onChange={(e) => set("street", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Número" error={errors.number}>
            <input className="inp" value={form.number} onChange={(e) => set("number", e.target.value)} />
          </Field>
          <Field label="Complemento" error={errors.complement}>
            <input className="inp" value={form.complement} onChange={(e) => set("complement", e.target.value)} />
          </Field>
        </div>
        <Field label="Bairro" error={errors.district}>
          <input className="inp" value={form.district} onChange={(e) => set("district", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Município" error={errors.city}>
            <input className="inp" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="Cód. IBGE" error={errors.city_code}>
            <input className="inp" value={form.city_code} onChange={(e) => set("city_code", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="UF" error={errors.state}>
            <select className="inp" value={form.state} onChange={(e) => set("state", e.target.value)}>
              {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="CEP" error={errors.zip_code}>
            <input className="inp" value={form.zip_code} onChange={(e) => set("zip_code", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Telefone" error={errors.phone}>
            <input className="inp" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="E-mail" error={errors.email}>
            <input className="inp" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
        </div>
        <Field label="Série da NF-e" error={errors.nfe_series}>
          <input className="inp" value={form.nfe_series} onChange={(e) => set("nfe_series", e.target.value)} />
        </Field>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-brand disabled:opacity-60"
      >
        <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar dados"}
      </button>
    </div>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-destructive">{error}</span>}
    </label>
  );
}
