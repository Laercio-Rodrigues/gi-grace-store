import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign, Package, ShoppingBag, TrendingUp, Users, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { resolveImage } from "@/lib/assets";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  paid: "#3B82F6",
  shipped: "#8B5CF6",
  delivered: "#10B981",
  cancelled: "#EF4444",
};

function Dashboard() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [orders, products, users] = await Promise.all([
        supabase.from("orders").select("id,total,status,created_at").order("created_at", { ascending: false }),
        supabase.from("products").select("id,name,stock,sales_count,price,sale_price,active,images:product_images(image_url)"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        orders: orders.data ?? [],
        products: products.data ?? [],
        userCount: users.count ?? 0,
      };
    },
  });

  if (stats.isLoading || !stats.data) {
    return <div className="py-16 text-center text-muted-foreground">Carregando dashboard...</div>;
  }

  const { orders, products, userCount } = stats.data;

  const totalRevenue = orders.filter((o) => o.status !== "cancelled").reduce((n, o) => n + Number(o.total), 0);
  const totalStock = products.reduce((n, p) => n + p.stock, 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5);
  const outOfStock = products.filter((p) => p.stock === 0).length;

  // Revenue by day (last 14)
  const days: { day: string; receita: number; pedidos: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const dayOrders = orders.filter((o) => o.created_at.slice(0, 10) === key && o.status !== "cancelled");
    days.push({
      day: label,
      receita: dayOrders.reduce((n, o) => n + Number(o.total), 0),
      pedidos: dayOrders.length,
    });
  }

  // Status breakdown
  const statusData = Object.entries(
    orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([status, value]) => ({ status, value }));

  // Top products
  const topProducts = [...products].sort((a, b) => b.sales_count - a.sales_count).slice(0, 6);

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={DollarSign} label="Receita total" value={brl(totalRevenue)} accent />
        <Kpi icon={ShoppingBag} label="Pedidos" value={String(orders.length)} />
        <Kpi icon={Package} label="Estoque total" value={String(totalStock)} />
        <Kpi icon={Users} label="Clientes" value={String(userCount)} />
      </div>

      {/* Alerts */}
      {(outOfStock > 0 || lowStock.length > 0) && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-warning" />
            <div className="text-sm">
              <div className="font-bold">Atenção ao estoque</div>
              <div className="text-muted-foreground">
                {outOfStock > 0 && <>{outOfStock} produto(s) sem estoque. </>}
                {lowStock.length > 0 && <>{lowStock.length} produto(s) com estoque baixo (≤ 5).</>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold">Receita — últimos 14 dias</h3>
              <p className="text-xs text-muted-foreground">Excluindo pedidos cancelados</p>
            </div>
            <TrendingUp className="h-4 w-4 text-brand" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={days}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Line type="monotone" dataKey="receita" stroke="#D90429" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 font-bold">Pedidos por status</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="status" outerRadius={90} label>
                  {statusData.map((d) => (
                    <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? "#888"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 font-bold">Pedidos por dia (volume)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="pedidos" fill="#111111" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top products */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="border-b border-border p-5">
          <h3 className="font-bold">Top produtos por vendas</h3>
        </div>
        <div className="divide-y divide-border">
          {topProducts.map((p, i) => (
            <div key={p.id} className="flex items-center gap-4 p-4">
              <div className="w-8 text-center text-xs font-black text-muted-foreground">#{i + 1}</div>
              <img src={resolveImage(p.images?.[0]?.image_url)} alt="" className="h-12 w-12 rounded bg-surface object-cover" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold line-clamp-1">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.sales_count} vendas · estoque {p.stock}
                </div>
              </div>
              <div className="text-right font-bold">{brl(p.sale_price ?? p.price)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-5 ${accent ? "border-brand/40 bg-brand/5" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${accent ? "text-brand" : "text-muted-foreground"}`} />
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
