import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/assets";

export const Route = createFileRoute("/_authenticated/admin/produtos/$id")({
  component: ProductEditor,
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

type Form = {
  name: string;
  slug: string;
  description: string;
  technical_description: string;
  category_id: string;
  brand_id: string;
  price: string;
  sale_price: string;
  stock: string;
  sku: string;
  weight: string;
  material: string;
  color: string;
  featured: boolean;
  active: boolean;
};

const EMPTY: Form = {
  name: "",
  slug: "",
  description: "",
  technical_description: "",
  category_id: "",
  brand_id: "",
  price: "",
  sale_price: "",
  stock: "0",
  sku: "",
  weight: "",
  material: "",
  color: "",
  featured: false,
  active: true,
};

function ProductEditor() {
  const { id } = useParams({ from: "/_authenticated/admin/produtos/$id" });
  const isNew = id === "novo";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(EMPTY);
  const [images, setImages] = useState<{ id?: string; image_url: string; position: number }[]>([]);
  const [sizes, setSizes] = useState<{ size_id: string; stock: number }[]>([]);
  const [saving, setSaving] = useState(false);

  const lookups = useQuery({
    queryKey: ["admin-lookups"],
    queryFn: async () => {
      const [cats, brs, szs] = await Promise.all([
        supabase.from("categories").select("id,name").order("name"),
        supabase.from("brands").select("id,name").order("name"),
        supabase.from("sizes").select("id,name,position").order("position"),
      ]);
      return { categories: cats.data ?? [], brands: brs.data ?? [], sizes: szs.data ?? [] };
    },
  });

  const product = useQuery({
    queryKey: ["admin-product", id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, images:product_images(id,image_url,position), sizes:product_sizes(size_id,stock)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (product.data) {
      const p = product.data;
      setForm({
        name: p.name,
        slug: p.slug,
        description: p.description ?? "",
        technical_description: p.technical_description ?? "",
        category_id: p.category_id ?? "",
        brand_id: p.brand_id ?? "",
        price: String(p.price),
        sale_price: p.sale_price != null ? String(p.sale_price) : "",
        stock: String(p.stock),
        sku: p.sku ?? "",
        weight: p.weight ?? "",
        material: p.material ?? "",
        color: p.color ?? "",
        featured: p.featured,
        active: p.active,
      });
      setImages((p.images ?? []).sort((a: any, b: any) => a.position - b.position));
      setSizes((p.sizes ?? []).map((s: any) => ({ size_id: s.size_id, stock: s.stock })));
    }
  }, [product.data]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) return toast.error("Nome é obrigatório");
    if (!form.price || Number(form.price) <= 0) return toast.error("Preço inválido");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: (form.slug || slugify(form.name)).trim(),
        description: form.description || null,
        technical_description: form.technical_description || null,
        category_id: form.category_id || null,
        brand_id: form.brand_id || null,
        price: Number(form.price),
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        stock: Number(form.stock) || 0,
        sku: form.sku || null,
        weight: form.weight || null,
        material: form.material || null,
        color: form.color || null,
        featured: form.featured,
        active: form.active,
      };

      let productId = id;
      if (isNew) {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
      } else {
        const { error } = await supabase.from("products").update(payload).eq("id", id);
        if (error) throw error;
      }

      // Replace images
      await supabase.from("product_images").delete().eq("product_id", productId);
      const validImages = images.filter((im) => im.image_url.trim());
      if (validImages.length) {
        await supabase
          .from("product_images")
          .insert(validImages.map((im, i) => ({ product_id: productId, image_url: im.image_url, position: i })));
      }

      // Replace sizes
      await supabase.from("product_sizes").delete().eq("product_id", productId);
      const validSizes = sizes.filter((s) => s.size_id);
      if (validSizes.length) {
        await supabase
          .from("product_sizes")
          .insert(validSizes.map((s) => ({ product_id: productId, size_id: s.size_id, stock: s.stock })));
      }

      toast.success(isNew ? "Produto criado" : "Produto atualizado");
      qc.invalidateQueries({ queryKey: ["admin-products-list"] });
      qc.invalidateQueries({ queryKey: ["admin-product", productId] });
      if (isNew) navigate({ to: "/admin/produtos" });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const cats = lookups.data?.categories ?? [];
  const brs = lookups.data?.brands ?? [];
  const szs = lookups.data?.sizes ?? [];

  if (!isNew && product.isLoading) {
    return <div className="py-16 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin/produtos" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-primary px-6 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-brand transition-colors disabled:opacity-60"
        >
          {saving ? "Salvando..." : isNew ? "Criar produto" : "Salvar alterações"}
        </button>
      </div>

      <h2 className="text-2xl font-bold">{isNew ? "Novo produto" : form.name || "Editar produto"}</h2>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5 rounded-lg border border-border bg-card p-5">
          <Field label="Nome">
            <input value={form.name} onChange={(e) => set("name", e.target.value)} onBlur={() => !form.slug && set("slug", slugify(form.name))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Slug (URL)">
            <input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="ex: kimono-branco-a2" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
          </Field>
          <Field label="Descrição">
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Descrição técnica">
            <textarea value={form.technical_description} onChange={(e) => set("technical_description", e.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Categoria">
              <select value={form.category_id} onChange={(e) => set("category_id", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">—</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Marca">
              <select value={form.brand_id} onChange={(e) => set("brand_id", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">—</option>
                {brs.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Material"><input value={form.material} onChange={(e) => set("material", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
            <Field label="Cor"><input value={form.color} onChange={(e) => set("color", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
            <Field label="Peso"><input value={form.weight} onChange={(e) => set("weight", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
            <Field label="SKU"><input value={form.sku} onChange={(e) => set("sku", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
          </div>

          {/* Images */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Imagens (URL)</label>
              <button
                onClick={() => setImages((im) => [...im, { image_url: "", position: im.length }])}
                className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-semibold hover:bg-surface"
              >
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {images.map((im, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <img src={resolveImage(im.image_url)} alt="" className="h-10 w-10 rounded bg-surface object-cover" />
                  <input
                    value={im.image_url}
                    onChange={(e) => setImages((arr) => arr.map((x, i) => (i === idx ? { ...x, image_url: e.target.value } : x)))}
                    placeholder="https://... ou asset:gi-white"
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  />
                  <button onClick={() => setImages((arr) => arr.filter((_, i) => i !== idx))} className="rounded p-2 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {!images.length && <p className="text-xs text-muted-foreground">Nenhuma imagem. Aceita URL externa ou <code>asset:key</code>.</p>}
            </div>
          </div>

          {/* Sizes / stock per size */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Tamanhos disponíveis</label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {szs.map((sz) => {
                const current = sizes.find((s) => s.size_id === sz.id);
                return (
                  <div key={sz.id} className="flex items-center gap-2 rounded border border-border p-2">
                    <label className="flex flex-1 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!current}
                        onChange={(e) =>
                          setSizes((arr) =>
                            e.target.checked
                              ? [...arr, { size_id: sz.id, stock: 0 }]
                              : arr.filter((s) => s.size_id !== sz.id),
                          )
                        }
                      />
                      <span className="font-semibold">{sz.name}</span>
                    </label>
                    {current && (
                      <input
                        type="number"
                        min={0}
                        value={current.stock}
                        onChange={(e) =>
                          setSizes((arr) => arr.map((s) => (s.size_id === sz.id ? { ...s, stock: Number(e.target.value) } : s)))
                        }
                        className="w-16 rounded border border-input bg-background px-2 py-1 text-right text-sm"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h3 className="font-bold">Preço e estoque</h3>
            <Field label="Preço (R$)">
              <input type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </Field>
            <Field label="Preço promocional (R$)">
              <input type="number" step="0.01" value={form.sale_price} onChange={(e) => set("sale_price", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </Field>
            <Field label="Estoque total">
              <input type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </Field>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h3 className="font-bold">Visibilidade</h3>
            <label className="flex items-center justify-between text-sm">
              <span>Produto ativo</span>
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Destacar na home</span>
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
