import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { resolveImage } from "@/lib/assets";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — Kimono Store Pro" },
      { name: "description", content: "Revise seus itens e finalize sua compra." },
      { property: "og:title", content: "Carrinho — Kimono Store Pro" },
      { property: "og:description", content: "Revise e finalize sua compra." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, count, removeItem, updateQty, coupon: appliedCoupon, couponPercent, setCoupon } =
    useCart();
  const { user } = useAuth();
  const [coupon, setCouponInput] = useState(appliedCoupon ?? "");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const discount = (subtotal * couponPercent) / 100;
  const shipping = subtotal > 499 || subtotal === 0 ? 0 : 39.9;
  const total = Math.max(0, subtotal - discount) + shipping;

  const applyCoupon = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code || code.length > 40) return;
    if (!user) return toast.error("Entre na sua conta para usar cupons");
    setApplyingCoupon(true);
    const { data, error } = await supabase.rpc("validate_coupon", { _code: code });
    setApplyingCoupon(false);
    const row = data?.[0];
    if (error || !row) {
      setCoupon(null, 0);
      return toast.error("Cupom inválido ou expirado");
    }
    setCoupon(row.code, row.discount_percent);
    toast.success(`Cupom aplicado: -${row.discount_percent}%`);
  };


  if (count === 0) {
    return (
      <div className="container-app py-24 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-surface grid place-items-center">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-display text-3xl mt-6">Seu carrinho está vazio</h1>
        <p className="text-muted-foreground mt-2">Que tal explorar nossa coleção?</p>
        <Link
          to="/produtos"
          className="mt-6 inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 text-sm font-bold uppercase tracking-widest rounded-md hover:bg-brand"
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="container-app py-8 md:py-12">
      <h1 className="text-display text-4xl md:text-5xl mb-8">Carrinho</h1>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        {/* items */}
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.size ?? "_"}`}
              className="grid grid-cols-[100px_1fr_auto] md:grid-cols-[120px_1fr_auto_auto] gap-4 p-4 bg-card border border-border rounded-lg"
            >
              <Link
                to="/produto/$slug"
                params={{ slug: item.slug }}
                className="aspect-square bg-surface rounded-md overflow-hidden"
              >
                <img
                  src={resolveImage(item.image)}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </Link>
              <div className="min-w-0">
                <Link
                  to="/produto/$slug"
                  params={{ slug: item.slug }}
                  className="font-semibold hover:text-brand line-clamp-2"
                >
                  {item.name}
                </Link>
                {item.size && (
                  <div className="text-xs text-muted-foreground mt-1">Tamanho: {item.size}</div>
                )}
                <div className="text-lg font-bold mt-2 md:hidden">{brl(item.price * item.quantity)}</div>
                <div className="flex items-center gap-3 mt-3 md:mt-2">
                  <div className="flex items-center border border-border rounded-md">
                    <button
                      onClick={() => updateQty(item.productId, item.size, item.quantity - 1)}
                      className="p-2"
                      aria-label="Diminuir"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.size, item.quantity + 1)}
                      className="p-2"
                      aria-label="Aumentar"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId, item.size)}
                    className="text-muted-foreground hover:text-brand inline-flex items-center gap-1 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remover
                  </button>
                </div>
              </div>
              <div className="hidden md:block text-right">
                <div className="text-lg font-bold">{brl(item.price * item.quantity)}</div>
                <div className="text-xs text-muted-foreground">{brl(item.price)} un.</div>
              </div>
            </div>
          ))}
        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-24 h-fit p-6 bg-card border border-border rounded-lg space-y-4">
          <h2 className="text-lg font-bold">Resumo do pedido</h2>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Cupom
            </label>
            <div className="flex gap-2 mt-1.5">
              <input
                value={coupon}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="BEMVINDO10"
                className="flex-1 bg-surface border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
              <button
                disabled={applyingCoupon}
                onClick={applyCoupon}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider rounded-md hover:bg-brand disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{brl(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-brand">
                <span>Desconto</span>
                <span>-{brl(discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span>{shipping === 0 ? "Grátis" : brl(shipping)}</span>
            </div>
          </div>
          <div className="flex justify-between pt-3 border-t border-border">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-bold">{brl(total)}</span>
          </div>

          <Link
            to={user ? "/checkout" : "/auth"}
            search={user ? undefined : { redirect: "/checkout" }}
            className="block w-full text-center bg-brand text-brand-foreground py-4 rounded-md font-bold uppercase tracking-widest text-sm hover:opacity-90"
          >
            Finalizar compra
          </Link>
          <Link
            to="/produtos"
            className="block w-full text-center text-sm font-semibold py-2 hover:text-brand"
          >
            Continuar comprando
          </Link>
        </aside>
      </div>
    </div>
  );
}
