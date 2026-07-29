import { supabase } from "@/integrations/supabase/client";

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  color: string | null;
  featured: boolean;
  sales_count: number;
  created_at: string;
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
  images: { image_url: string; position: number }[];
};

const listSelect =
  "id, name, slug, price, sale_price, color, featured, sales_count, created_at, brand:brands(name,slug), category:categories(name,slug), images:product_images(image_url,position)";

export async function fetchProducts(): Promise<ProductListItem[]> {
  const { data, error } = await supabase
    .from("products")
    .select(listSelect)
    .eq("active", true)
    .order("sales_count", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ProductListItem[];
}

export async function fetchFeatured(): Promise<ProductListItem[]> {
  const { data, error } = await supabase
    .from("products")
    .select(listSelect)
    .eq("active", true)
    .eq("featured", true)
    .limit(8);
  if (error) throw error;
  return (data ?? []) as unknown as ProductListItem[];
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,image_url,position")
    .eq("active", true)
    .order("position");
  if (error) throw error;
  return data ?? [];
}

export async function fetchBrands() {
  const { data, error } = await supabase.from("brands").select("id,name,slug").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchBanners() {
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("active", true)
    .order("position");
  if (error) throw error;
  return data ?? [];
}

export async function fetchProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, brand:brands(name,slug), category:categories(name,slug), images:product_images(image_url,position), sizes:product_sizes(stock, size:sizes(id,name,position))",
    )
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}
