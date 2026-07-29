import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl } from "@/lib/format";
import { resolveImage } from "@/lib/assets";
import { LogOut, Package, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: "Minha Conta — Kimono Store Pro" },
      { name: "description", content: "Gerencie seu perfil, pedidos e endereços." },
      { property: "og:title", content: "Minha Conta" },
      { property: "og:description", content: "Perfil, pedidos e endereços." },
    ],
  }),
  component: Conta,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

function Conta() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"perfil" | "pedidos">("pedidos");

  const orders = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total, created_at, items:order_items(product_name, product_image, quantity, price, size_name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const savedProfile = profile.data;
  if (savedProfile && name === "" && savedProfile.name) setName(savedProfile.name);
  if (savedProfile && phone === "" && savedProfile.phone) setPhone(savedProfile.phone);

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ name, phone })
      .eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Perfil atualizado");
  };

  return (
    <div className="container-app py-8 md:py-12">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-display text-4xl md:text-5xl">Minha Conta</h1>
          <p className="text-muted-foreground mt-1 text-sm">{user?.email}</p>
        </div>
        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold border border-border rounded-md px-4 py-2 hover:border-brand hover:text-brand"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>

      <div className="flex gap-1 border-b border-border mb-8">
        {[
          { id: "pedidos", label: "Pedidos", icon: Package },
          { id: "perfil", label: "Perfil", icon: UserIcon },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors -mb-px ${
              tab === t.id ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4 inline mr-2" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pedidos" && (
        <div className="space-y-4">
          {orders.data?.length === 0 && (
            <p className="text-muted-foreground text-center py-16">Você ainda não fez pedidos.</p>
          )}
          {orders.data?.map((o) => (
            <div key={o.id} className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    Pedido #{o.id.slice(0, 8)}
                  </div>
                  <div className="text-sm mt-1">
                    {new Date(o.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest bg-surface px-3 py-1.5 rounded-full">
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
              <div className="space-y-2">
                {(o.items ?? []).map((i, idx) => (
                  <div key={idx} className="flex gap-3 items-center text-sm">
                    <img
                      src={resolveImage(i.product_image)}
                      alt=""
                      className="h-12 w-12 rounded bg-surface object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold line-clamp-1">{i.product_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {i.size_name ? `${i.size_name} · ` : ""}Qtd {i.quantity}
                      </div>
                    </div>
                    <div className="font-bold">{brl(i.price * i.quantity)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex justify-between font-bold">
                <span>Total</span>
                <span className="text-lg">{brl(o.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "perfil" && (
        <div className="max-w-lg space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full bg-surface border border-border rounded-md px-4 py-3 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest">Telefone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full bg-surface border border-border rounded-md px-4 py-3 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest">E-mail</label>
            <input
              disabled
              value={user?.email ?? ""}
              className="mt-1.5 w-full bg-muted border border-border rounded-md px-4 py-3 text-muted-foreground"
            />
          </div>
          <button
            onClick={saveProfile}
            className="bg-primary text-primary-foreground px-8 py-3 rounded-md font-bold uppercase tracking-widest text-sm hover:bg-brand"
          >
            Salvar
          </button>
        </div>
      )}
    </div>
  );
}
