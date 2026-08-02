import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Receipt } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { resolveImage } from "@/lib/assets";

export const Route = createFileRoute("/_authenticated/admin/pedidos/$id")({
  component: OrderDetail,
});

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", paid: "Pago", shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado",
};

function OrderDetail() {
  const { id } = useParams({ from: "/_authenticated/admin/pedidos/$id" });
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, items:order_items(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (q.isLoading) return <div className="py-16 text-center text-muted-foreground">Carregando...</div>;
  if (!q.data) return <div className="py-16 text-center text-muted-foreground">Pedido não encontrado.</div>;

  const o = q.data;
  const addr = (o.address_json as any) ?? {};

  const setStatus = async (status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    qc.invalidateQueries({ queryKey: ["admin-order", id] });
    qc.invalidateQueries({ queryKey: ["admin-orders-list"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/pedidos" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex gap-2">
          <Link
            to="/admin/faturamento/nova"
            search={{ tipo: "receipt", pedido: o.id }}
            className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-surface"
          >
            <Receipt className="h-4 w-4" /> Faturar sem nota
          </Link>
          <Link
            to="/admin/faturamento/nova"
            search={{ tipo: "nfe", pedido: o.id }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-brand"
          >
            <FileText className="h-4 w-4" /> Gerar nota fiscal
          </Link>
        </div>
      </div>


      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pedido</div>
          <h2 className="font-mono text-2xl font-bold">#{o.id.slice(0, 8)}</h2>
          <div className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</label>
          <select
            value={o.status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-bold uppercase tracking-wider"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border p-4 font-bold">Itens</div>
          <div className="divide-y divide-border">
            {(o.items ?? []).map((it: any) => (
              <div key={it.id} className="flex items-center gap-4 p-4">
                <img src={resolveImage(it.product_image)} alt="" className="h-14 w-14 rounded bg-surface object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold line-clamp-1">{it.product_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.size_name ? `Tam. ${it.size_name} · ` : ""}Qtd. {it.quantity}
                  </div>
                </div>
                <div className="text-right font-bold">{brl(Number(it.price) * it.quantity)}</div>
              </div>
            ))}
            {!o.items?.length && <div className="p-6 text-center text-muted-foreground">Sem itens.</div>}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Resumo</h3>
            <Row label="Subtotal" value={brl(Number(o.subtotal))} />
            <Row label="Frete" value={brl(Number(o.shipping))} />
            <Row label="Desconto" value={`- ${brl(Number(o.discount))}`} />
            <div className="mt-3 border-t border-border pt-3">
              <Row label="Total" value={brl(Number(o.total))} bold />
            </div>
            <div className="mt-3 text-xs text-muted-foreground">Pagamento: {o.payment_method ?? "—"}</div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Endereço de entrega</h3>
            {addr && Object.keys(addr).length ? (
              <div className="text-sm text-muted-foreground space-y-0.5">
                <div>{addr.street} {addr.number}{addr.complement ? `, ${addr.complement}` : ""}</div>
                <div>{addr.district}</div>
                <div>{addr.city} - {addr.state}</div>
                <div>{addr.zip_code}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Sem endereço.</div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-2 font-bold">Cliente</h3>
            <div className="font-mono text-xs text-muted-foreground break-all">{o.user_id}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${bold ? "text-lg font-bold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
