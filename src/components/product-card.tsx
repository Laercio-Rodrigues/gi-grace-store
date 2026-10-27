import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { resolveImage } from "@/lib/assets";
import { brl } from "@/lib/format";
import type { ProductListItem } from "@/lib/queries";

export function ProductCard({ product }: { product: ProductListItem }) {
  const img = resolveImage(product.images?.[0]?.image_url);
  const hasSale = product.sale_price != null && product.sale_price < product.price;
  const finalPrice = hasSale ? product.sale_price! : product.price;
  const off = hasSale ? Math.round((1 - product.sale_price! / product.price) * 100) : 0;

  return (
    <Link
      to="/produto/$slug"
      params={{ slug: product.slug }}
      className="group block"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface rounded-lg">
        <img
          src={img}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {hasSale && (
          <span className="absolute top-3 left-3 bg-brand text-brand-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">
            -{off}%
          </span>
        )}
        <button
          className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full bg-white/90 hover:bg-brand hover:text-brand-foreground transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Favoritar"
          onClick={(e) => e.preventDefault()}
        >
          <Heart className="h-4 w-4" />
        </button>
      </div>
      <div className="pt-3 space-y-1">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
          {product.brand?.name ?? "Kimono Store"}
        </div>
        <h3 className="text-sm font-semibold line-clamp-2 leading-snug">{product.name}</h3>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-base font-bold">{brl(finalPrice)}</span>
          {hasSale && (
            <span className="text-xs text-muted-foreground line-through">{brl(product.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
