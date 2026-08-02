import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, ShieldOff, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cx } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/administradores")({
  head: () => ({ meta: [{ title: "Administradores — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminsPage,
});

type Member = {
  id: string;
  email: string;
  name: string | null;
  note: string | null;
  is_admin: boolean;
  user_id: string | null;
  created_at: string;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function AdminsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", name: "", note: "", is_admin: false });
  const [error, setError] = useState<string | null>(null);

  const members = useQuery({
    queryKey: ["admin-invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_invites")
        .select("id,email,name,note,is_admin,user_id,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const audit = useQuery({
    queryKey: ["role-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-invites"] });
    qc.invalidateQueries({ queryKey: ["role-audit"] });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setError("Informe um e-mail válido.");
      return;
    }
    setError(null);
    setBusy("new");
    const { error: err } = await supabase.rpc("admin_upsert_invite", {
      _email: email,
      _name: form.name.trim(),
      _note: form.note.trim(),
      _make_admin: form.is_admin,
    });
    setBusy(null);
    if (err) return toast.error(err.message);
    toast.success(form.is_admin ? "E-mail cadastrado como administrador" : "E-mail cadastrado");
    setForm({ email: "", name: "", note: "", is_admin: false });
    refresh();
  };

  const toggle = async (m: Member) => {
    if (m.is_admin && !confirm(`Remover o acesso de administrador de ${m.email}?`)) return;
    setBusy(m.id);
    const { error: err } = await supabase.rpc("admin_upsert_invite", {
      _email: m.email,
      _name: m.name ?? "",
      _note: m.note ?? "",
      _make_admin: !m.is_admin,
    });
    setBusy(null);
    if (err) return toast.error(err.message);
    toast.success(m.is_admin ? "Acesso de admin removido" : "Agora é administrador");
    refresh();
  };

  const remove = async (m: Member) => {
    if (!confirm(`Excluir ${m.email} da lista?`)) return;
    setBusy(m.id);
    const { error: err } = await supabase.from("admin_invites").delete().eq("id", m.id);
    setBusy(null);
    if (err) return toast.error(err.message);
    toast.success("Registro removido");
    refresh();
  };

  const list = (members.data ?? []).filter((m) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return m.email.toLowerCase().includes(t) || (m.name ?? "").toLowerCase().includes(t);
  });
  const admins = list.filter((m) => m.is_admin);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Administradores</h2>
          <p className="text-sm text-muted-foreground">
            Cadastre os e-mails da equipe e defina quem tem acesso ao painel. {admins.length} administrador(es).
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="inp pl-9 md:w-72"
          />
        </div>
      </div>

      <form onSubmit={submit} className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 flex items-center gap-2 font-bold">
          <UserPlus className="h-4 w-4 text-brand" /> Cadastrar e-mail
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              E-mail *
            </label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="pessoa@empresa.com.br"
              className="inp"
              type="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nome
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome da pessoa"
              className="inp"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Função / observação
            </label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Ex.: financeiro"
              className="inp"
            />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-brand">{error}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.is_admin}
              onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            Conceder acesso de administrador
          </label>
          <button
            type="submit"
            disabled={busy === "new"}
            className="rounded-md bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground hover:bg-brand disabled:opacity-50"
          >
            {busy === "new" ? "Salvando..." : "Cadastrar"}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Se a pessoa ainda não tiver conta, o acesso é aplicado automaticamente quando ela se cadastrar com este e-mail.
        </p>
      </form>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">E-mail cadastrado</th>
              <th className="px-4 py-3 text-left">Função</th>
              <th className="px-4 py-3 text-left">Situação</th>
              <th className="px-4 py-3 text-left">Perfil</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.isLoading && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
            )}
            {!members.isLoading && !list.length && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum e-mail cadastrado ainda.</td></tr>
            )}
            {list.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 font-semibold">{m.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.note ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {m.user_id ? "Conta ativa" : "Aguardando cadastro"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cx(
                      "rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider",
                      m.is_admin ? "bg-brand text-brand-foreground" : "bg-surface text-muted-foreground",
                    )}
                  >
                    {m.is_admin ? "Administrador" : "Sem acesso"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => toggle(m)}
                      disabled={busy === m.id}
                      className={cx(
                        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-40",
                        m.is_admin
                          ? "border border-input hover:bg-surface"
                          : "bg-primary text-primary-foreground hover:bg-brand",
                      )}
                    >
                      {m.is_admin ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      {m.is_admin ? "Remover" : "Tornar admin"}
                    </button>
                    <button
                      onClick={() => remove(m)}
                      disabled={busy === m.id}
                      className="rounded-md border border-input p-2 text-muted-foreground hover:bg-surface disabled:opacity-40"
                      aria-label={`Excluir ${m.email}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 font-bold">Histórico de alterações</h3>
        <div className="space-y-2 text-sm">
          {!audit.data?.length && <div className="text-muted-foreground">Nenhuma alteração registrada.</div>}
          {(audit.data ?? []).map((a) => (
            <div key={a.id} className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-2">
              <span>
                <span className="font-semibold">{a.action === "grant" ? "Concedido" : "Removido"}</span>{" "}
                acesso admin — usuário <span className="font-mono text-xs">{a.target_user_id.slice(0, 8)}</span>
              </span>
              <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
