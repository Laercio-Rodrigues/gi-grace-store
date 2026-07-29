import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Package, ShoppingBag, Users, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl } from "@/lib/format";
import { resolveImage } from "@/lib/assets";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel Admin — Kimono Store Pro" },
      { name: "description", content: "Painel administrativo da loja." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/" });
  }, [loading, isAdmin, navigate]);

  const products = useQuery({
    queryKey: ["admin-products"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,slug,price,sale_price,stock,active,sales_count,images:product_images(image_url)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const orders = useQuery({
    queryKey: ["admin-orders"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,total,status,created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  if (loading || !isAdmin) {
    return (
      <div className="container-app py-24 text-center text-muted-foreground">Carregando...</div>
    );
  }

  const totalRevenue = (orders.data ?? []).reduce((n, o) => n + Number(o.total), 0);
  const totalProducts = products.data?.length ?? 0;
  const totalStock = (products.data ?? []).reduce((n, p) => n + p.stock, 0);

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("products").update({ active: !active }).eq("id", id);
    products.refetch();
  };

  return (
    <div className="container-app py-8">
      <h1 className="text-display text-4xl md:text-5xl mb-8">Painel Admin</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Kpi icon={Package} label="Produtos" value={String(totalProducts)} />
        <Kpi icon={ShoppingBag} label="Pedidos" value={String(orders.data?.length ?? 0)} />
        <Kpi icon={DollarSign} label="Receita (últ. 10)" value={brl(totalRevenue)} />
        <Kpi icon={Users} label="Estoque total" value={String(totalStock)} />
      </div>

      {/* Products */}
      <section className="bg-card border border-border rounded-lg overflow-hidden mb-10">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-bold">Produtos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left p-3">Produto</th>
                <th className="text-right p-3">Preço</th>
                <th className="text-right p-3">Estoque</th>
                <th className="text-right p-3">Vendas</th>
                <th className="text-right p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(products.data ?? []).map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={resolveImage(p.images?.[0]?.image_url)}
                        alt=""
                        className="h-10 w-10 rounded bg-surface object-cover"
                      />
                      <span className="font-semibold line-clamp-1">{p.name}</span>
                    </div>
                  </td>
                  <td className="text-right p-3">{brl(p.sale_price ?? p.price)}</td>
                  <td className="text-right p-3">{p.stock}</td>
                  <td className="text-right p-3">{p.sales_count}</td>
                  <td className="text-right p-3">
                    <button
                      onClick={() => toggleActive(p.id, p.active)}
                      className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                        p.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.active ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Orders */}
      <section className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-bold">Pedidos recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left p-3">Pedido</th>
                <th className="text-left p-3">Data</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(orders.data ?? []).map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">#{o.id.slice(0, 8)}</td>
                  <td className="p-3">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                  <td className="text-right p-3 font-bold">{brl(o.total)}</td>
                  <td className="text-right p-3">
                    <span className="text-xs uppercase tracking-wider bg-surface px-3 py-1 rounded-full">
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!orders.data?.length && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    Nenhum pedido ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <Icon className="h-4 w-4 text-brand" />
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}
