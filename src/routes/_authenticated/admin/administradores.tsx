import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, ShieldOff, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cx } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/administradores")({
  head: () => ({ meta: [{ title: "Administradores — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminsPage,
});

type AdminUser = {
  user_id: string;
  name: string | null;
  email: string | null;
  created_at: string;
  is_admin: boolean;
};

function AdminsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return (data ?? []) as AdminUser[];
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

  const toggle = async (u: AdminUser) => {
    if (u.is_admin && !confirm(`Remover o acesso de administrador de ${u.email ?? u.name}?`)) return;
    setBusy(u.user_id);
    const { error } = await supabase.rpc("admin_set_admin", { _user_id: u.user_id, _make_admin: !u.is_admin });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(u.is_admin ? "Acesso de admin removido" : "Agora é administrador");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["role-audit"] });
  };

  const list = (users.data ?? []).filter((u) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (u.email ?? "").toLowerCase().includes(t) || (u.name ?? "").toLowerCase().includes(t);
  });
  const admins = list.filter((u) => u.is_admin);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Administradores</h2>
          <p className="text-sm text-muted-foreground">
            Conceda ou remova o acesso ao painel. {admins.length} administrador(es) ativo(s).
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

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Usuário</th>
              <th className="px-4 py-3 text-left">E-mail</th>
              <th className="px-4 py-3 text-left">Cadastro</th>
              <th className="px-4 py-3 text-left">Perfil</th>
              <th className="px-4 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.isLoading && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
            )}
            {!users.isLoading && !list.length && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
            )}
            {list.map((u) => (
              <tr key={u.user_id}>
                <td className="px-4 py-3 font-semibold">
                  {u.name ?? "—"}
                  {u.user_id === user?.id && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cx(
                      "rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider",
                      u.is_admin ? "bg-brand text-brand-foreground" : "bg-surface text-muted-foreground",
                    )}
                  >
                    {u.is_admin ? "Administrador" : "Cliente"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggle(u)}
                    disabled={busy === u.user_id || (u.is_admin && u.user_id === user?.id)}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-40",
                      u.is_admin
                        ? "border border-input hover:bg-surface"
                        : "bg-primary text-primary-foreground hover:bg-brand",
                    )}
                  >
                    {u.is_admin ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    {u.is_admin ? "Remover" : "Tornar admin"}
                  </button>
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
