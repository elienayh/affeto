import { createClient } from "@/lib/supabase/server";
import type { Category, Product, ProductDetail } from "@/lib/types";

/**
 * Camada de acesso ao catálogo (Fase 2). Tudo aqui consulta o Supabase real —
 * nenhum dado mock. Para ter algo pra ver, rode supabase/seed.sql no seu projeto
 * (seção 54 do prompt-v2: dados demonstrativos).
 */

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, display_order")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, display_order")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getProductsByCategorySlug(
  categorySlug: string
): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, category_id, name, slug, description, price, promotional_price,
       unit, is_active,
       categories!inner(slug),
       product_images(id, storage_path, display_order),
       inventory(quantity, reserved)`
    )
    .eq("categories.slug", categorySlug)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map(mapProductRow);
}

export async function searchProducts(term: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, category_id, name, slug, description, price, promotional_price,
       unit, is_active,
       product_images(id, storage_path, display_order),
       inventory(quantity, reserved)`
    )
    .ilike("name", `%${term}%`)
    .eq("is_active", true)
    .limit(30);

  if (error) throw error;
  return (data ?? []).map(mapProductRow);
}

export async function getProductBySlug(
  slug: string
): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, category_id, name, slug, description, price, promotional_price,
       unit, is_active,
       product_images(id, storage_path, display_order),
       inventory(quantity, reserved),
       product_options(id, name, product_option_values(id, label, price_delta))`
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...mapProductRow(data),
    options: (data.product_options ?? []).map((opt: any) => ({
      id: opt.id,
      name: opt.name,
      values: opt.product_option_values ?? [],
    })),
  };
}

// Seções configuráveis da Home (seção 8 do prompt-v1). Fase 2: implementadas
// como consultas fixas simples; a Fase 4 (admin) troca isso por uma tabela
// `home_sections` configurável — deixado como TODO para não inventar schema
// além do que a Fase 1 já definiu.
export async function getFeaturedSections() {
  const supabase = await createClient();

  const { data: promoted, error: promotedError } = await supabase
    .from("products")
    .select(
      `id, category_id, name, slug, description, price, promotional_price,
       unit, is_active,
       product_images(id, storage_path, display_order),
       inventory(quantity, reserved)`
    )
    .not("promotional_price", "is", null)
    .eq("is_active", true)
    .limit(10);

  if (promotedError) throw promotedError;

  return {
    promotions: (promoted ?? []).map(mapProductRow),
  };
}

function mapProductRow(row: any): Product {
  const inventory = Array.isArray(row.inventory) ? row.inventory[0] : row.inventory;
  return {
    id: row.id,
    category_id: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: Number(row.price),
    promotional_price: row.promotional_price ? Number(row.promotional_price) : null,
    unit: row.unit,
    is_active: row.is_active,
    images: (row.product_images ?? []).sort(
      (a: any, b: any) => a.display_order - b.display_order
    ),
    available_quantity: inventory
      ? inventory.quantity - inventory.reserved
      : undefined,
  };
}
