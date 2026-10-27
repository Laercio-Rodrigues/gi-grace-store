import {
  fetchBannersFn,
  fetchBrandsFn,
  fetchCategoriesFn,
  fetchFeaturedFn,
  fetchProductBySlugFn,
  fetchProductsFn,
} from "@/server/store.functions";

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

export const fetchProducts = (): Promise<ProductListItem[]> => fetchProductsFn();
export const fetchFeatured = (): Promise<ProductListItem[]> => fetchFeaturedFn();
export const fetchCategories = () => fetchCategoriesFn();
export const fetchBrands = () => fetchBrandsFn();
export const fetchBanners = () => fetchBannersFn();
export const fetchProductBySlug = (slug: string) => fetchProductBySlugFn({ data: { slug } });
