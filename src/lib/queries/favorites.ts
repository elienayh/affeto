import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export async function getFavoriteProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("favorites")
    .select(
      `product_id, products(
        id, category_id, name, slug, description, price, promotional_price,
        unit, is_active, product_images(id, storage_path, display_order)
      )`
    )
    .eq("customer_id", user.id);

  if (error) throw error;

  return (data ?? [])
    .map((row: any) => row.products)
    .filter(Boolean)
    .map((row: any) => ({
      id: row.id,
      category_id: row.category_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      price: Number(row.price),
      promotional_price: row.promotional_price ? Number(row.promotional_price) : null,
      unit: row.unit,
      is_active: row.is_active,
      images: row.product_images ?? [],
    }));
}

export async function isFavorite(productId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("favorites")
    .select("product_id")
    .eq("customer_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  return Boolean(data);
}
