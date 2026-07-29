import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { resolveImage } from "@/lib/assets";

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  component: ProductsLayout,
});

function ProductsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isRoot = pathname === "/admin/produtos" || pathname === "/admin/produtos/";
  return isRoot ? <ProductsList /> : <Outlet />;
}

function ProductsList() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const products = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,price,sale_price,stock,active,sales_count,featured,images:product_images(image_url,position),category:categories(name),brand:brands(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (products.data ?? []).filter((p) =>
    q ? p.name.toLowerCase().includes(q.toLowerCase()) : true,
  );

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("products").update({ active: !active }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(active ? "Produto desativado" : "Produto ativado");
    qc.invalidateQueries({ queryKey: ["admin-products-list"] });
  };

  const toggleFeatured = async (id: string, featured: boolean) => {
    const { error } = await supabase.from("products").update({ featured: !featured }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-products-list"] });
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"? Essa ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Produto excluído");
    qc.invalidateQueries({ queryKey: ["admin-products-list"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <Link
          to="/admin/produtos/$id"
          params={{ id: "novo" }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-brand transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo produto
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left p-3">Produto</th>
                <th className="text-left p-3">Categoria</th>
                <th className="text-right p-3">Preço</th>
                <th className="text-right p-3">Estoque</th>
                <th className="text-right p-3">Vendas</th>
                <th className="text-center p-3">Destaque</th>
                <th className="text-center p-3">Status</th>
                <th className="text-right p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={resolveImage(p.images?.[0]?.image_url)} alt="" className="h-10 w-10 rounded bg-surface object-cover" />
                      <div className="min-w-0">
                        <div className="font-semibold line-clamp-1">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.brand?.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{p.category?.name ?? "—"}</td>
                  <td className="text-right p-3">{brl(p.sale_price ?? p.price)}</td>
                  <td className={`text-right p-3 ${p.stock === 0 ? "text-destructive font-bold" : p.stock <= 5 ? "text-warning font-bold" : ""}`}>
                    {p.stock}
                  </td>
                  <td className="text-right p-3">{p.sales_count}</td>
                  <td className="text-center p-3">
                    <button
                      onClick={() => toggleFeatured(p.id, p.featured)}
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${p.featured ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground"}`}
                    >
                      {p.featured ? "Sim" : "Não"}
                    </button>
                  </td>
                  <td className="text-center p-3">
                    <button
                      onClick={() => toggleActive(p.id, p.active)}
                      className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${p.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
                    >
                      {p.active ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="text-right p-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        to="/admin/produtos/$id"
                        params={{ id: p.id }}
                        className="rounded border border-border px-3 py-1 text-xs font-semibold hover:bg-surface"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => remove(p.id, p.name)}
                        className="rounded border border-destructive/40 text-destructive px-3 py-1 text-xs font-semibold hover:bg-destructive/10"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
