import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  component: OrdersLayout,
});

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  paid: "bg-primary/10 text-primary",
  shipped: "bg-brand/10 text-brand",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

function OrdersLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isRoot = pathname === "/admin/pedidos" || pathname === "/admin/pedidos/";
  return isRoot ? <OrdersList /> : <Outlet />;
}

function OrdersList() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const orders = useQuery({
    queryKey: ["admin-orders-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,total,status,payment_method,created_at,user_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    qc.invalidateQueries({ queryKey: ["admin-orders-list"] });
  };

  const list = (orders.data ?? []).filter((o) => filter === "all" || o.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>Todos</FilterPill>
        {STATUSES.map((s) => (
          <FilterPill key={s} active={filter === s} onClick={() => setFilter(s)}>{STATUS_LABEL[s]}</FilterPill>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left p-3">Pedido</th>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Pagamento</th>
                <th className="text-right p-3">Total</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">#{o.id.slice(0, 8)}</td>
                  <td className="p-3">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-muted-foreground">{o.payment_method ?? "—"}</td>
                  <td className="text-right p-3 font-bold">{brl(Number(o.total))}</td>
                  <td className="p-3">
                    <select
                      value={o.status}
                      onChange={(e) => setStatus(o.id, e.target.value)}
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${STATUS_STYLE[o.status] ?? "bg-muted"}`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td className="text-right p-3">
                    <Link to="/admin/pedidos/$id" params={{ id: o.id }} className="rounded border border-border px-3 py-1 text-xs font-semibold hover:bg-surface">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum pedido.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${active ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}
