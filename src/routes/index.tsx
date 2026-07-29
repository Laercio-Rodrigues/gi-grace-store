import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, Truck, RotateCcw, Trophy } from "lucide-react";
import { fetchCategories, fetchFeatured, fetchProducts } from "@/lib/queries";
import { ProductCard } from "@/components/product-card";
import { heroImage, resolveImage } from "@/lib/assets";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kimono Store Pro — Loja premium de Jiu-Jitsu" },
      {
        name: "description",
        content:
          "Kimonos trançados, rash guards, faixas oficiais e acessórios das melhores marcas de BJJ. Frete grátis acima de R$ 499.",
      },
      { property: "og:title", content: "Kimono Store Pro — Loja premium de Jiu-Jitsu" },
      { property: "og:description", content: "Kimonos trançados, rash guards, faixas oficiais e acessórios das melhores marcas de BJJ. Frete grátis acima de R$ 499." },
    ],
  }),
  component: Home,
});

const CAT_IMAGES: Record<string, string> = {
  kimonos: "asset:gi-white",
  "rash-guards": "asset:rashguard-black",
  faixas: "asset:belts",
  shorts: "asset:shorts",
  camisetas: "asset:rashguard-black",
  acessorios: "asset:shorts",
};

function Home() {
  const { data: featured } = useQuery({ queryKey: ["featured"], queryFn: fetchFeatured });
  const { data: all } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const promos = (all ?? []).filter((p) => p.sale_price != null).slice(0, 4);
  const newest = [...(all ?? [])]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 4);

  return (
    <>
      {/* HERO */}
      <section className="relative bg-primary text-primary-foreground overflow-hidden">
        <img
          src={heroImage}
          alt="Kimono branco com faixa preta"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/70 to-transparent" />
        <div className="container-app relative py-20 md:py-32 lg:py-40 max-w-3xl">
          <span className="inline-block bg-brand text-brand-foreground text-[11px] font-bold uppercase tracking-[0.25em] px-3 py-1 rounded-full">
            Nova Coleção
          </span>
          <h1 className="mt-6 text-display text-5xl md:text-7xl lg:text-8xl">
            Corte.<br />Grip.<br />
            <span className="text-brand">Domine.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-primary-foreground/80 max-w-xl">
            Kimonos trançados 550gsm, corte anatômico e reforços premium. Feitos para
            competidores que não aceitam segundo lugar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/produtos"
              search={{ categoria: "kimonos" }}
              className="inline-flex items-center gap-2 bg-brand text-brand-foreground px-8 py-4 text-sm font-bold uppercase tracking-widest rounded-md hover:opacity-90 transition-opacity"
            >
              Ver kimonos <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/produtos"
              className="inline-flex items-center gap-2 border border-white/30 text-white px-8 py-4 text-sm font-bold uppercase tracking-widest rounded-md hover:bg-white hover:text-primary transition-colors"
            >
              Coleção completa
            </Link>
          </div>
        </div>
      </section>

      {/* PERKS */}
      <section className="border-b border-border bg-surface">
        <div className="container-app grid grid-cols-2 md:grid-cols-4 gap-6 py-8">
          {[
            { icon: Truck, label: "Frete grátis", sub: "acima de R$ 499" },
            { icon: ShieldCheck, label: "Pagamento seguro", sub: "Pix, boleto e cartão" },
            { icon: RotateCcw, label: "Troca fácil", sub: "em até 30 dias" },
            { icon: Trophy, label: "Marcas oficiais", sub: "Atama, Kingz, Tatami..." },
          ].map((p) => (
            <div key={p.label} className="flex items-center gap-3">
              <p.icon className="h-6 w-6 text-brand shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold uppercase tracking-wider">{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container-app py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-brand">Categorias</div>
            <h2 className="text-display text-3xl md:text-4xl mt-1">Compre por tipo</h2>
          </div>
          <Link to="/produtos" className="text-sm font-semibold uppercase tracking-wider hover:text-brand">
            Ver tudo →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {(cats ?? []).map((c) => (
            <Link
              key={c.id}
              to="/produtos"
              search={{ categoria: c.slug }}
              className="group relative aspect-square overflow-hidden rounded-lg bg-surface"
            >
              <img
                src={resolveImage(CAT_IMAGES[c.slug])}
                alt={c.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <div className="text-white text-sm font-bold uppercase tracking-wider">{c.name}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="container-app pb-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-brand">Destaques</div>
            <h2 className="text-display text-3xl md:text-4xl mt-1">Mais vendidos</h2>
          </div>
          <Link to="/produtos" className="text-sm font-semibold uppercase tracking-wider hover:text-brand">
            Ver tudo →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
          {(featured ?? []).slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* PROMOS BANNER */}
      <section className="bg-primary text-primary-foreground">
        <div className="container-app py-16 md:py-20 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-block bg-brand text-brand-foreground text-[11px] font-bold uppercase tracking-[0.25em] px-3 py-1 rounded-full">
              Promoção
            </span>
            <h2 className="mt-4 text-display text-4xl md:text-5xl">
              Até <span className="text-brand">25% OFF</span><br />
              em rash guards
            </h2>
            <p className="mt-4 text-primary-foreground/70 max-w-md">
              Compressão profissional, secagem rápida e proteção anti-microbiana. Enquanto durar o estoque.
            </p>
            <Link
              to="/produtos"
              search={{ categoria: "rash-guards" }}
              className="mt-6 inline-flex items-center gap-2 bg-white text-primary px-6 py-3 text-sm font-bold uppercase tracking-widest rounded-md hover:bg-brand hover:text-brand-foreground transition-colors"
            >
              Aproveitar <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {promos.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                to="/produto/$slug"
                params={{ slug: p.slug }}
                className="aspect-square overflow-hidden bg-surface rounded-lg group"
              >
                <img
                  src={resolveImage(p.images?.[0]?.image_url)}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* NEWEST */}
      <section className="container-app py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-brand">Lançamentos</div>
            <h2 className="text-display text-3xl md:text-4xl mt-1">Chegou agora</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
          {newest.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </>
  );
}
