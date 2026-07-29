import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Filter, X } from "lucide-react";
import { fetchBrands, fetchCategories, fetchProducts } from "@/lib/queries";
import { ProductCard } from "@/components/product-card";
import { cx } from "@/lib/format";

const search = z.object({
  categoria: z.string().optional(),
  marca: z.string().optional(),
  busca: z.string().optional(),
  ordem: z.enum(["vendidos", "menor", "maior", "recentes", "promocoes"]).optional(),
});

export const Route = createFileRoute("/produtos")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Produtos — Kimono Store Pro" },
      { name: "description", content: "Catálogo completo de kimonos, rash guards, faixas e acessórios de Jiu-Jitsu." },
      { property: "og:title", content: "Produtos — Kimono Store Pro" },
      { property: "og:description", content: "Catálogo completo de Jiu-Jitsu." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const sp = Route.useSearch();
  const navigate = Route.useNavigate();
  const [showFilters, setShowFilters] = useState(false);

  const { data: products } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: brands } = useQuery({ queryKey: ["brands"], queryFn: fetchBrands });

  const filtered = useMemo(() => {
    let list = products ?? [];
    if (sp.categoria) list = list.filter((p) => p.category?.slug === sp.categoria);
    if (sp.marca) list = list.filter((p) => p.brand?.slug === sp.marca);
    if (sp.busca) {
      const q = sp.busca.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand?.name.toLowerCase().includes(q) ||
          p.color?.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    switch (sp.ordem) {
      case "menor":
        sorted.sort((a, b) => (a.sale_price ?? a.price) - (b.sale_price ?? b.price));
        break;
      case "maior":
        sorted.sort((a, b) => (b.sale_price ?? b.price) - (a.sale_price ?? a.price));
        break;
      case "recentes":
        sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
        break;
      case "promocoes":
        return sorted.filter((p) => p.sale_price != null);
      default:
        sorted.sort((a, b) => b.sales_count - a.sales_count);
    }
    return sorted;
  }, [products, sp]);

  const currentCat = cats?.find((c) => c.slug === sp.categoria);

  const setSearchParam = (patch: Partial<typeof sp>) =>
    navigate({ search: (prev: typeof sp) => ({ ...prev, ...patch }), replace: true });

  return (
    <div className="container-app py-8 md:py-12">
      {/* header */}
      <div className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Link to="/" className="hover:text-brand">Início</Link> / Produtos
          {currentCat && <> / {currentCat.name}</>}
        </div>
        <h1 className="text-display text-4xl md:text-5xl mt-2">
          {sp.busca
            ? `Busca: "${sp.busca}"`
            : currentCat
            ? currentCat.name
            : "Todos os Produtos"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {filtered.length} produto{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex gap-8">
        {/* filters — desktop */}
        <aside className="hidden lg:block w-60 shrink-0">
          <FiltersPanel
            sp={sp}
            cats={cats ?? []}
            brands={brands ?? []}
            onChange={setSearchParam}
          />
        </aside>

        {/* main */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6 gap-3">
            <button
              onClick={() => setShowFilters(true)}
              className="lg:hidden inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm font-semibold"
            >
              <Filter className="h-4 w-4" /> Filtros
            </button>
            <label className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-muted-foreground hidden sm:inline">Ordenar:</span>
              <select
                value={sp.ordem ?? "vendidos"}
                onChange={(e) => setSearchParam({ ordem: e.target.value as typeof sp.ordem })}
                className="bg-surface border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
              >
                <option value="vendidos">Mais vendidos</option>
                <option value="recentes">Mais recentes</option>
                <option value="menor">Menor preço</option>
                <option value="maior">Maior preço</option>
                <option value="promocoes">Promoções</option>
              </select>
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-lg font-semibold">Nenhum produto encontrado</p>
              <p className="text-sm text-muted-foreground mt-2">Tente ajustar os filtros ou a busca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* filters — mobile drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-background rounded-t-2xl overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-background">
              <h2 className="text-lg font-bold">Filtros</h2>
              <button onClick={() => setShowFilters(false)} className="p-2" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <FiltersPanel
                sp={sp}
                cats={cats ?? []}
                brands={brands ?? []}
                onChange={setSearchParam}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FiltersPanel({
  sp,
  cats,
  brands,
  onChange,
}: {
  sp: { categoria?: string; marca?: string };
  cats: { slug: string; name: string }[];
  brands: { slug: string; name: string }[];
  onChange: (p: { categoria?: string; marca?: string }) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-3">Categoria</h3>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => onChange({ categoria: undefined })}
              className={cx(
                "block text-sm w-full text-left py-1.5 hover:text-brand transition-colors",
                !sp.categoria && "font-bold text-brand",
              )}
            >
              Todas
            </button>
          </li>
          {cats.map((c) => (
            <li key={c.slug}>
              <button
                onClick={() => onChange({ categoria: c.slug })}
                className={cx(
                  "block text-sm w-full text-left py-1.5 hover:text-brand transition-colors",
                  sp.categoria === c.slug && "font-bold text-brand",
                )}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-3">Marca</h3>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => onChange({ marca: undefined })}
              className={cx(
                "block text-sm w-full text-left py-1.5 hover:text-brand transition-colors",
                !sp.marca && "font-bold text-brand",
              )}
            >
              Todas
            </button>
          </li>
          {brands.map((b) => (
            <li key={b.slug}>
              <button
                onClick={() => onChange({ marca: b.slug })}
                className={cx(
                  "block text-sm w-full text-left py-1.5 hover:text-brand transition-colors",
                  sp.marca === b.slug && "font-bold text-brand",
                )}
              >
                {b.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
