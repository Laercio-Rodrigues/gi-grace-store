import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { resolveImage } from "@/lib/assets";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Kimono Store Pro" },
      { name: "description", content: "Finalize seu pedido com segurança." },
      { property: "og:title", content: "Checkout" },
      { property: "og:description", content: "Finalize seu pedido." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);

  const [address, setAddress] = useState({
    street: "",
    number: "",
    complement: "",
    district: "",
    city: "",
    state: "",
    zip_code: "",
  });
  const [payment, setPayment] = useState<"pix" | "credit" | "boleto">("pix");

  const shipping = subtotal > 499 || subtotal === 0 ? 0 : 39.9;
  const total = subtotal + shipping;

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || items.length === 0) return;
    setPlacing(true);

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        subtotal,
        shipping,
        discount: 0,
        total,
        payment_method: payment,
        address_json: address,
      })
      .select()
      .single();

    if (error || !order) {
      setPlacing(false);
      return toast.error(error?.message ?? "Falha ao criar pedido");
    }

    const { error: itemsErr } = await supabase.from("order_items").insert(
      items.map((i) => ({
        order_id: order.id,
        product_id: i.productId,
        product_name: i.name,
        product_image: i.image,
        size_name: i.size,
        quantity: i.quantity,
        price: i.price,
      })),
    );
    if (itemsErr) {
      setPlacing(false);
      return toast.error(itemsErr.message);
    }

    clear();
    toast.success("Pedido realizado com sucesso!");
    navigate({ to: "/conta" });
  };

  if (items.length === 0) {
    return (
      <div className="container-app py-24 text-center">
        <h1 className="text-display text-3xl">Carrinho vazio</h1>
        <p className="text-muted-foreground mt-2">
          Adicione produtos antes de finalizar a compra.
        </p>
      </div>
    );
  }

  return (
    <div className="container-app py-8 md:py-12">
      <h1 className="text-display text-4xl md:text-5xl mb-8">Finalizar compra</h1>

      <form onSubmit={placeOrder} className="grid lg:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-8">
          <section className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4">Endereço de entrega</h2>
            <div className="grid grid-cols-2 gap-3">
              <Input label="CEP" value={address.zip_code} onChange={(v) => setAddress({ ...address, zip_code: v })} />
              <Input label="Estado" value={address.state} onChange={(v) => setAddress({ ...address, state: v })} />
              <Input label="Rua" full value={address.street} onChange={(v) => setAddress({ ...address, street: v })} />
              <Input label="Número" value={address.number} onChange={(v) => setAddress({ ...address, number: v })} />
              <Input label="Complemento" value={address.complement} onChange={(v) => setAddress({ ...address, complement: v })} required={false} />
              <Input label="Bairro" value={address.district} onChange={(v) => setAddress({ ...address, district: v })} />
              <Input label="Cidade" full value={address.city} onChange={(v) => setAddress({ ...address, city: v })} />
            </div>
          </section>

          <section className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4">Pagamento</h2>
            <div className="grid grid-cols-3 gap-2">
              {(["pix", "credit", "boleto"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayment(m)}
                  className={`p-4 border-2 rounded-md text-sm font-bold uppercase tracking-wider transition-colors ${
                    payment === m ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {m === "pix" ? "PIX" : m === "credit" ? "Cartão" : "Boleto"}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              {payment === "pix"
                ? "Aprovação instantânea. Enviaremos o QR code após confirmar o pedido."
                : payment === "credit"
                ? "Parcelamos em até 10x sem juros."
                : "O boleto vence em 3 dias úteis."}
            </p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 h-fit p-6 bg-card border border-border rounded-lg space-y-4">
          <h2 className="text-lg font-bold">Seu pedido</h2>
          <ul className="space-y-3 max-h-64 overflow-y-auto">
            {items.map((i) => (
              <li key={`${i.productId}-${i.size ?? "_"}`} className="flex gap-3 text-sm">
                <img
                  src={resolveImage(i.image)}
                  alt=""
                  className="h-14 w-14 rounded bg-surface object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold line-clamp-2">{i.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {i.size ? `${i.size} · ` : ""}Qtd {i.quantity}
                  </div>
                </div>
                <div className="font-bold">{brl(i.price * i.quantity)}</div>
              </li>
            ))}
          </ul>
          <div className="space-y-2 pt-4 border-t border-border text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{brl(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span>{shipping === 0 ? "Grátis" : brl(shipping)}</span>
            </div>
          </div>
          <div className="flex justify-between pt-3 border-t border-border">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-bold">{brl(total)}</span>
          </div>
          <button
            disabled={placing}
            className="w-full bg-brand text-brand-foreground py-4 rounded-md font-bold uppercase tracking-widest text-sm hover:opacity-90 disabled:opacity-50"
          >
            {placing ? "Processando..." : "Confirmar pedido"}
          </button>
        </aside>
      </form>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  full,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
  required?: boolean;
}) {
  return (
    <label className={full ? "col-span-2" : ""}>
      <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
      />
    </label>
  );
}
