import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Heart, Minus, Plus, Share2, ShieldCheck, Truck, Star } from "lucide-react";
import { fetchProductBySlug, fetchProducts } from "@/lib/queries";
import { resolveImage } from "@/lib/assets";
import { brl, cx } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { ProductCard } from "@/components/product-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/produto/$slug")({
  loader: async ({ params }) => {
    const p = await fetchProductBySlug(params.slug);
    if (!p) throw notFound();
    return { product: p };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product as { name?: string; description?: string } | undefined;
    const title = p?.name ? `${p.name} — Kimono Store Pro` : "Produto";
    const description = p?.description ?? "Equipamento premium de Jiu-Jitsu.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
      ],
    };
  },
  component: ProductPage,
});

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  technical_description: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  sku: string | null;
  weight: string | null;
  material: string | null;
  color: string | null;
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
  images: { image_url: string; position: number }[];
  sizes: { stock: number; size: { id: string; name: string; position: number } }[];
};

function ProductPage() {
  const { product } = Route.useLoaderData() as { product: ProductRow };
  const { addItem } = useCart();
  const { user } = useAuth();
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [sizeId, setSizeId] = useState<string | null>(
    product.sizes?.[0]?.size.id ?? null,
  );

  const { data: all } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const related = (all ?? [])
    .filter((p) => p.category?.slug === product.category?.slug && p.slug !== product.slug)
    .slice(0, 4);

  const sortedSizes = [...(product.sizes ?? [])].sort(
    (a, b) => a.size.position - b.size.position,
  );
  const selectedSize = sortedSizes.find((s) => s.size.id === sizeId);
  const outOfStock = product.stock <= 0;
  const hasSale = product.sale_price != null && product.sale_price < product.price;
  const price = hasSale ? product.sale_price! : product.price;
  const off = hasSale ? Math.round((1 - product.sale_price! / product.price) * 100) : 0;

  const images = product.images.length
    ? product.images
    : [{ image_url: "asset:gi-white", position: 0 }];
  const mainImg = resolveImage(images[imgIdx]?.image_url);

  const addToCart = () => {
    if (outOfStock) return toast.error("Produto indisponível");
    if (sortedSizes.length && !sizeId) return toast.error("Selecione um tamanho");
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: images[0].image_url,
      price,
      size: selectedSize?.size.name ?? null,
      quantity: qty,
    });
    toast.success("Adicionado ao carrinho");
  };

  const favorite = async () => {
    if (!user) return toast.error("Faça login para favoritar");
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: user.id, product_id: product.id });
    if (error && !error.message.includes("duplicate")) toast.error(error.message);
    else toast.success("Adicionado aos favoritos");
  };

  return (
    <div className="container-app py-8">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
        <Link to="/" className="hover:text-brand">Início</Link> /{" "}
        <Link to="/produtos" className="hover:text-brand">Produtos</Link>
        {product.category && (
          <>
            {" / "}
            <Link
              to="/produtos"
              search={{ categoria: product.category.slug }}
              className="hover:text-brand"
            >
              {product.category.name}
            </Link>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* GALLERY */}
        <div>
          <div className="relative aspect-[4/5] bg-surface rounded-lg overflow-hidden">
            <img src={mainImg} alt={product.name} className="h-full w-full object-cover" />
            {hasSale && (
              <span className="absolute top-4 left-4 bg-brand text-brand-foreground text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded">
                -{off}%
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2 mt-3">
              {images.map((im, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={cx(
                    "aspect-square rounded-md overflow-hidden bg-surface border-2 transition-colors",
                    i === imgIdx ? "border-primary" : "border-transparent",
                  )}
                >
                  <img
                    src={resolveImage(im.image_url)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* INFO */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-brand">
            {product.brand?.name ?? "Kimono Store"}
          </div>
          <h1 className="text-display text-3xl md:text-4xl mt-2">{product.name}</h1>

          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className="h-4 w-4 fill-brand text-brand" />
              ))}
            </div>
            <span>(128 avaliações)</span>
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-4xl font-bold">{brl(price)}</span>
            {hasSale && (
              <span className="text-lg text-muted-foreground line-through">{brl(product.price)}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            em até 10x de {brl(price / 10)} sem juros
          </p>

          {product.description && (
            <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          )}

          {/* sizes */}
          {sortedSizes.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold uppercase tracking-widest">Tamanho</div>
                <button className="text-xs text-muted-foreground underline">Guia de tamanhos</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedSizes.map((s) => {
                  const disabled = s.stock <= 0;
                  const active = s.size.id === sizeId;
                  return (
                    <button
                      key={s.size.id}
                      disabled={disabled}
                      onClick={() => setSizeId(s.size.id)}
                      className={cx(
                        "min-w-14 h-12 px-4 border-2 rounded-md text-sm font-bold uppercase tracking-wider transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary",
                        disabled && "opacity-40 cursor-not-allowed line-through",
                      )}
                    >
                      {s.size.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* qty */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center border border-border rounded-md">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-3">
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-10 text-center font-bold">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="p-3">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              {product.stock} unidades em estoque
            </span>
          </div>

          {/* actions */}
          <div className="mt-8 grid grid-cols-[1fr_auto_auto] gap-2">
            <button
              onClick={addToCart}
              disabled={outOfStock}
              className={cx(
                "h-14 px-6 rounded-md font-bold uppercase tracking-widest text-sm transition-colors",
                outOfStock
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-brand",
              )}
            >
              {outOfStock ? "Produto indisponível" : "Adicionar ao carrinho"}
            </button>
            <button
              onClick={favorite}
              className="h-14 w-14 grid place-items-center border border-border rounded-md hover:border-brand hover:text-brand"
              aria-label="Favoritar"
            >
              <Heart className="h-5 w-5" />
            </button>
            <button
              className="h-14 w-14 grid place-items-center border border-border rounded-md hover:border-primary"
              aria-label="Compartilhar"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Link copiado");
              }}
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>

          {/* perks */}
          <div className="mt-8 space-y-3 pt-6 border-t border-border">
            <div className="flex gap-3 items-start">
              <Truck className="h-5 w-5 text-brand mt-0.5" />
              <div>
                <div className="text-sm font-semibold">Frete grátis acima de R$ 499</div>
                <div className="text-xs text-muted-foreground">Entrega para todo Brasil</div>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <ShieldCheck className="h-5 w-5 text-brand mt-0.5" />
              <div>
                <div className="text-sm font-semibold">Compra 100% segura</div>
                <div className="text-xs text-muted-foreground">Pix, boleto e cartão em até 10x</div>
              </div>
            </div>
          </div>

          {/* specs */}
          {product.technical_description && (
            <div className="mt-8 pt-8 border-t border-border">
              <h2 className="text-lg font-bold mb-3">Especificações</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {product.technical_description}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                {product.material && (
                  <>
                    <dt className="text-muted-foreground">Material</dt>
                    <dd className="font-semibold">{product.material}</dd>
                  </>
                )}
                {product.weight && (
                  <>
                    <dt className="text-muted-foreground">Peso</dt>
                    <dd className="font-semibold">{product.weight}</dd>
                  </>
                )}
                {product.color && (
                  <>
                    <dt className="text-muted-foreground">Cor</dt>
                    <dd className="font-semibold">{product.color}</dd>
                  </>
                )}
                {product.sku && (
                  <>
                    <dt className="text-muted-foreground">SKU</dt>
                    <dd className="font-semibold">{product.sku}</dd>
                  </>
                )}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-display text-2xl md:text-3xl mb-6">Produtos relacionados</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
