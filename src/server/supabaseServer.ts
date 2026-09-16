import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Category, Product, StoreSettings } from '../types';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ropgdbgkjghwdxdglchz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let serverClient: SupabaseClient | null = null;

export function getServerSupabaseClient(): SupabaseClient | null {
  if (!supabaseKey) return null;
  if (!serverClient) {
    try {
      serverClient = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
    } catch (err) {
      console.warn('[ServerSupabase] Client init failed:', err);
      return null;
    }
  }
  return serverClient;
}

export function toServerUuid(id: string): string {
  if (!id) return '00000000-0000-4000-8000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id.toLowerCase();

  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < id.length; i++) {
    const ch = id.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = ((h2 >>> 16) & 0xffff).toString(16).padStart(4, '0');
  const p3 = (0x4000 | (h2 & 0x0fff)).toString(16).padStart(4, '0');
  const p4 = (0x8000 | ((h1 >>> 16) & 0x3fff)).toString(16).padStart(4, '0');
  const p5 = (((h1 & 0xffff) * 65536) + (h2 & 0xffff)).toString(16).padStart(12, '0');
  return `${p1}-${p2}-${p3}-${p4}-${p5}`.toLowerCase();
}

/**
 * Sync store settings (including logo, name, address, pix) to Supabase stores table.
 */
export async function syncStoreSettingsToSupabase(settings: StoreSettings): Promise<void> {
  const client = getServerSupabaseClient();
  if (!client) return;

  try {
    const payload = {
      id: toServerUuid(settings.id || 'store-affeto-matriz'),
      name: settings.name,
      slug: settings.slug || 'affeto-paes',
      address: settings.address,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      pix_key: settings.pix_key,
      logo_url: settings.logo_url || null,
      min_order_value: Number(settings.min_order_value || 0),
      lead_time_minutes: Number(settings.lead_time_minutes || 45),
      is_open: Boolean(settings.is_open ?? true),
      opening_hours: settings.opening_hours || [],
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('stores').upsert(payload, { onConflict: 'slug' });
    if (error) {
      console.warn('[ServerSupabase] Stores upsert warning:', error.message);
    } else {
      console.info('[ServerSupabase] Store settings & logo successfully synced to Supabase');
    }
  } catch (err: any) {
    console.warn('[ServerSupabase] Store sync failed:', err?.message || err);
  }
}

/**
 * Sync product (including image, price, options, schedule) to Supabase products table.
 */
export async function syncProductToSupabase(product: Product): Promise<void> {
  const client = getServerSupabaseClient();
  if (!client) return;

  try {
    const payload = {
      id: toServerUuid(product.id),
      category_id: product.category_id ? toServerUuid(product.category_id) : null,
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price: Number(product.base_price || 0),
      base_price: Number(product.base_price || 0),
      promotional_price: product.promotional_price ? Number(product.promotional_price) : null,
      unit: product.unit || 'unidade',
      image_url: product.image_url || null,
      is_active: Boolean(product.is_active ?? true),
      active: Boolean(product.is_active ?? true),
      is_featured: Boolean(product.is_featured ?? false),
      stock_quantity: Number(product.stock_quantity ?? 15),
      track_stock: Boolean(product.track_stock ?? true),
      allergens: Array.isArray(product.allergens) ? product.allergens : [],
      tags: Array.isArray(product.tags) ? product.tags : [],
      options: product.options || [],
      schedule_config: product.schedule_config || {},
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('products').upsert(payload, { onConflict: 'slug' });
    if (error) {
      console.warn('[ServerSupabase] Product upsert warning:', error.message);
    } else {
      console.info(`[ServerSupabase] Product "${product.name}" synced to Supabase`);
    }
  } catch (err: any) {
    console.warn('[ServerSupabase] Product sync failed:', err?.message || err);
  }
}

/**
 * Delete product from Supabase.
 */
export async function deleteProductFromSupabase(productId: string): Promise<void> {
  const client = getServerSupabaseClient();
  if (!client) return;

  try {
    const uuid = toServerUuid(productId);
    await client.from('products').delete().or(`id.eq.${uuid},slug.eq.${productId}`);
    console.info(`[ServerSupabase] Product "${productId}" deleted from Supabase`);
  } catch (err: any) {
    console.warn('[ServerSupabase] Product delete failed:', err?.message || err);
  }
}

/**
 * Sync category to Supabase categories table.
 */
export async function syncCategoryToSupabase(category: Category): Promise<void> {
  const client = getServerSupabaseClient();
  if (!client) return;

  try {
    const payload = {
      id: toServerUuid(category.id),
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      display_order: Number(category.sort_order ?? 0),
      sort_order: Number(category.sort_order ?? 0),
      active: Boolean(category.active ?? true),
      is_active: Boolean(category.active ?? true),
      image_url: category.image_url || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('categories').upsert(payload, { onConflict: 'slug' });
    if (error) {
      console.warn('[ServerSupabase] Category upsert warning:', error.message);
    } else {
      console.info(`[ServerSupabase] Category "${category.name}" synced to Supabase`);
    }
  } catch (err: any) {
    console.warn('[ServerSupabase] Category sync failed:', err?.message || err);
  }
}

/**
 * Delete category from Supabase.
 */
export async function deleteCategoryFromSupabase(categoryId: string): Promise<void> {
  const client = getServerSupabaseClient();
  if (!client) return;

  try {
    const uuid = toServerUuid(categoryId);
    await client.from('categories').delete().or(`id.eq.${uuid},slug.eq.${categoryId}`);
    console.info(`[ServerSupabase] Category "${categoryId}" deleted from Supabase`);
  } catch (err: any) {
    console.warn('[ServerSupabase] Category delete failed:', err?.message || err);
  }
}
