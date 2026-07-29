import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { resolveImage } from "@/lib/assets";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos — Kimono Store Pro" },
      { name: "description", content: "Seus produtos favoritos salvos." },
      { property: "og:title", content: "Favoritos" },
      { property: "og:description", content: "Sua wishlist de Jiu-Jitsu." },
    ],
  }),
  component: Favoritos,
});

function Favoritos() {
  const { user } = useAuth();

  const q = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("id, product:products(id,name,slug,price,sale_price,images:product_images(image_url,position))")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const remove = async (id: string) => {
    const { error } = await supabase.from("favorites").delete().eq("id", id);
    if (error) return toast.error(error.message);
    q.refetch();
    toast.success("Removido");
  };

  const items = q.data ?? [];

  return (
    <div className="container-app py-8 md:py-12">
      <h1 className="text-display text-4xl md:text-5xl mb-8">Favoritos</h1>
      {items.length === 0 ? (
        <div className="py-16 text-center">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold">Sua lista está vazia</p>
          <Link
            to="/produtos"
            className="mt-6 inline-flex bg-primary text-primary-foreground px-6 py-3 text-sm font-bold uppercase tracking-widest rounded-md hover:bg-brand"
          >
            Explorar produtos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
          {items.map((f) => {
            const p = f.product as unknown as {
              slug: string;
              name: string;
              price: number;
              sale_price: number | null;
              images: { image_url: string }[];
            } | null;
            if (!p) return null;
            const price = p.sale_price ?? p.price;
            return (
              <div key={f.id} className="group relative">
                <button
                  onClick={() => remove(f.id)}
                  className="absolute top-2 right-2 z-10 h-9 w-9 grid place-items-center rounded-full bg-white/90 hover:bg-brand hover:text-brand-foreground"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Link to="/produto/$slug" params={{ slug: p.slug }}>
                  <div className="aspect-[4/5] bg-surface rounded-lg overflow-hidden">
                    <img
                      src={resolveImage(p.images?.[0]?.image_url)}
                      alt={p.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="pt-3">
                    <h3 className="text-sm font-semibold line-clamp-2">{p.name}</h3>
                    <div className="text-base font-bold mt-1">{brl(price)}</div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
