import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Copy, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { run } from "@/lib/api";
import {
  adminDeleteSubscriberFn,
  adminSaveSiteSettingsFn,
  adminSiteSettingsFn,
  adminSubscribersFn,
} from "@/server/site.functions";
import { normalizeInstagram, normalizeWhatsapp, normalizeYoutube, whatsappLink } from "@/lib/social";

export const Route = createFileRoute("/_authenticated/admin/rodape")({
  head: () => ({ meta: [{ title: "Redes sociais — Admin" }, { name: "robots", content: "noindex" }] }),
  component: SocialPage,
});

const EMPTY = {
  instagram_url: "",
  youtube_url: "",
  whatsapp_number: "",
  whatsapp_message: "",
  contact_email: "",
};

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-destructive">{error}</span>}
    </label>
  );
}

function SocialPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-site-settings"], queryFn: () => adminSiteSettingsFn() });
  const subs = useQuery({ queryKey: ["admin-subscribers"], queryFn: () => adminSubscribersFn() });
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const errors: Partial<Record<keyof typeof EMPTY, string>> = {};
  if (normalizeInstagram(form.instagram_url) === null) errors.instagram_url = "Use @perfil ou o link do perfil";
  if (normalizeYoutube(form.youtube_url) === null) errors.youtube_url = "Use @canal ou o link do canal";
  if (normalizeWhatsapp(form.whatsapp_number) === null) errors.whatsapp_number = "Informe DDD + número";
  const hasErrors = Object.keys(errors).length > 0;

  const waPreview = whatsappLink(form.whatsapp_number, form.whatsapp_message);

  const save = async () => {
    if (hasErrors) return toast.error("Corrija os campos destacados");
    setSaving(true);
    const { error } = await run(adminSaveSiteSettingsFn({ data: form }));
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Redes sociais salvas. O rodapé do site já foi atualizado.");
    qc.invalidateQueries({ queryKey: ["admin-site-settings"] });
    qc.invalidateQueries({ queryKey: ["site-settings"] });
  };

  const removeSub = async (id: string) => {
    const { error } = await run(adminDeleteSubscriberFn({ data: { id } }));
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-subscribers"] });
  };

  const copyEmails = async () => {
    const list = (subs.data?.rows ?? []).map((r) => r.email).join("; ");
    try {
      await navigator.clipboard.writeText(list);
      toast.success("E-mails copiados");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  if (q.isLoading) return <div className="py-16 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Redes sociais e contato</h2>
        <p className="text-sm text-muted-foreground">
          Os ícones do rodapé do site usam estes dados. Campo vazio = o ícone não aparece.
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-2">
        <Field label="Instagram" hint="Ex.: @apskimonos ou https://instagram.com/apskimonos" error={errors.instagram_url}>
          <input className="inp" value={form.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} placeholder="@seu_perfil" />
        </Field>
        <Field label="YouTube" hint="Ex.: @seucanal ou o link do canal" error={errors.youtube_url}>
          <input className="inp" value={form.youtube_url} onChange={(e) => set("youtube_url", e.target.value)} placeholder="@seu_canal" />
        </Field>
        <Field label="WhatsApp (com DDD)" hint="Ex.: (66) 99999-9999. O código do Brasil (55) é adicionado sozinho." error={errors.whatsapp_number}>
          <input className="inp" value={form.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} placeholder="(66) 99999-9999" />
        </Field>
        <Field label="Mensagem inicial do WhatsApp" hint="Texto que já aparece escrito quando o cliente abre a conversa">
          <input className="inp" value={form.whatsapp_message} onChange={(e) => set("whatsapp_message", e.target.value)} placeholder="Olá! Vim pelo site da Kimono Store." />
        </Field>
        <Field label="E-mail de contato" hint="Usado em “Fale conosco” se não houver WhatsApp">
          <input className="inp" type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} placeholder="contato@sualoja.com.br" />
        </Field>
        <div className="flex items-end">
          {waPreview && (
            <a href={waPreview} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand underline">
              Testar link do WhatsApp
            </a>
          )}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving || hasErrors}
        className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-bold uppercase tracking-widest text-brand-foreground hover:opacity-90 disabled:opacity-50"
      >
        <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
      </button>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h3 className="font-bold">Inscritos na newsletter</h3>
            <p className="text-xs text-muted-foreground">{subs.data?.total ?? 0} e-mail(s) cadastrado(s) pelo rodapé do site</p>
          </div>
          <button
            onClick={copyEmails}
            disabled={!subs.data?.rows.length}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar e-mails
          </button>
        </div>
        {!subs.data?.rows.length ? (
          <p className="p-5 text-sm text-muted-foreground">Ninguém se inscreveu ainda.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto text-sm">
            {subs.data.rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <span>{r.email}</span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  <button onClick={() => removeSub(r.id)} aria-label="Remover" className="hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
