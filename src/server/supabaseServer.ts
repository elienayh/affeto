import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Category, DeliveryCepRule, Product, StoreSettings } from '../types';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ropgdbgkjghwdxdglchz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export const CANONICAL_STORE_ID = 'a2e33509-1264-431a-a2e3-00003509831a';
export const CANONICAL_STORE_SLUG = 'affeto-paes-artesanais';
export const ASSETS_BUCKET = 'affeto-assets';

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
 * Upload an image (base64 data URL or Buffer) directly into Supabase Storage
 * to generate a permanent, CDN-backed public URL accessible by all devices globally.
 */
export async function uploadAssetToSupabaseStorage(
  dataUrlOrBuffer: string | Buffer,
  folder: string = 'general',
  filePrefix: string = 'asset'
): Promise<string | null> {
  const client = getServerSupabaseClient();
  if (!client) return null;

  try {
    let buffer: Buffer;
    let contentType = 'image/jpeg';
    let ext = 'jpg';

    if (typeof dataUrlOrBuffer === 'string') {
      if (!dataUrlOrBuffer.startsWith('data:image/')) {
        // If it is already an HTTPS URL, return it as-is
        if (dataUrlOrBuffer.startsWith('http://') || dataUrlOrBuffer.startsWith('https://')) {
          return dataUrlOrBuffer;
        }
        return null;
      }
      const match = dataUrlOrBuffer.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (!match) return null;
      ext = match[1].toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      if (ext === 'svg+xml') ext = 'svg';
      contentType = `image/${match[1]}`;
      buffer = Buffer.from(match[2], 'base64');
    } else {
      buffer = dataUrlOrBuffer;
    }

    const filename = `${folder}/${filePrefix}_${Date.now()}.${ext}`;
    const { error } = await client.storage
      .from(ASSETS_BUCKET)
      .upload(filename, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.warn('[ServerSupabase] Storage upload failed:', error.message);
      return null;
    }

    const { data: pubData } = client.storage.from(ASSETS_BUCKET).getPublicUrl(filename);
    return pubData?.publicUrl || null;
  } catch (err: any) {
    console.error('[ServerSupabase] Storage upload exception:', err?.message || err);
    return null;
  }
}

/**
 * Fetch the canonical store settings directly from Supabase stores table.
 */
export async function getStoreSettingsFromSupabase(): Promise<StoreSettings | null> {
  const client = getServerSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('stores')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const settings: StoreSettings = {
      id: data.id || CANONICAL_STORE_ID,
      name: data.name || 'Affeto Pães',
      slug: data.slug || CANONICAL_STORE_SLUG,
      description: data.description || 'Padaria artesanal de fermentação lenta com levain de 36 horas, ingredientes nobres e respeito ao tempo do trigo.',
      address: data.address || 'Espera Feliz - MG',
      city: data.city || 'Espera Feliz',
      state: data.state || 'MG',
      pickup_address: data.pickup_address || data.address || 'Rua Principal, 100 - Centro, Espera Feliz - MG',
      logo_url: data.logo_url || '',
      phone: data.phone || '(32) 98468-0513',
      whatsapp: data.whatsapp || '5532984680513',
      pix_key: data.pix_key || 'contato@affetopaes.com.br',
      instagram: data.instagram || '@affetopaes',
      is_open: data.is_open ?? true,
      min_order_value: Number(data.min_order_value ?? 20),
      free_shipping_threshold: Number(data.free_shipping_threshold ?? 120),
      lead_time_minutes: Number(data.lead_time_minutes ?? 45),
      fresh_batch_hours: data.fresh_batch_hours || 'Fornadas frescas diárias saindo às 08h00 e às 15h00.',
      delivery_schedule_text: data.delivery_schedule_text || 'Entregas nas terças e sextas',
      opening_hours: Array.isArray(data.opening_hours) && data.opening_hours.length > 0 ? data.opening_hours : [],
    };

    return settings;
  } catch (err: any) {
    console.warn('[ServerSupabase] Store settings read error:', err?.message || err);
    return null;
  }
}

/**
 * Sync store settings (including logo, name, address, pix) to Supabase stores table.
 */
export async function syncStoreSettingsToSupabase(settings: StoreSettings): Promise<StoreSettings> {
  const client = getServerSupabaseClient();
  let finalLogo = settings.logo_url;

  // If logo is a base64 image, upload it permanently to Supabase Storage!
  if (finalLogo && finalLogo.startsWith('data:image/')) {
    const permanentUrl = await uploadAssetToSupabaseStorage(finalLogo, 'logos', 'logo_affeto');
    if (permanentUrl) {
      finalLogo = permanentUrl;
    }
  }

  const updatedSettings: StoreSettings = {
    ...settings,
    logo_url: finalLogo,
  };

  if (!client) return updatedSettings;

  try {
    const canonicalId = CANONICAL_STORE_ID;
    const payload: any = {
      id: canonicalId,
      name: updatedSettings.name,
      slug: CANONICAL_STORE_SLUG,
      address: updatedSettings.address,
      phone: updatedSettings.phone,
      whatsapp: updatedSettings.whatsapp,
      pix_key: updatedSettings.pix_key,
      logo_url: finalLogo || null,
      min_order_value: Number(updatedSettings.min_order_value || 0),
      lead_time_minutes: Number(updatedSettings.lead_time_minutes || 45),
      is_open: Boolean(updatedSettings.is_open ?? true),
      opening_hours: updatedSettings.opening_hours || [],
      updated_at: new Date().toISOString(),
    };

    if (updatedSettings.delivery_schedule_text) {
      payload.delivery_schedule_text = updatedSettings.delivery_schedule_text;
    }

    let { error } = await client.from('stores').upsert(payload, { onConflict: 'id' });
    if (error && error.message?.includes('delivery_schedule_text')) {
      delete payload.delivery_schedule_text;
      const retry = await client.from('stores').upsert(payload, { onConflict: 'id' });
      error = retry.error;
    }
    if (error) {
      console.warn('[ServerSupabase] Stores upsert warning:', error.message);
    } else {
      console.info('[ServerSupabase] Store settings & logo successfully synced to Supabase stores table');
    }
  } catch (err: any) {
    console.warn('[ServerSupabase] Store sync failed:', err?.message || err);
  }

  return updatedSettings;
}

/**
 * Sync product (including image, price, options, schedule) to Supabase products table.
 */
export async function syncProductToSupabase(product: Product): Promise<Product> {
  let finalImage = product.image_url;

  // If product image is base64, upload to Supabase Storage
  if (finalImage && finalImage.startsWith('data:image/')) {
    const permanentUrl = await uploadAssetToSupabaseStorage(
      finalImage,
      'products',
      `prod_${product.slug || 'item'}`
    );
    if (permanentUrl) {
      finalImage = permanentUrl;
    }
  }

  const updatedProduct: Product = {
    ...product,
    image_url: finalImage,
  };

  const client = getServerSupabaseClient();
  if (!client) return updatedProduct;

  try {
    const payload = {
      id: toServerUuid(updatedProduct.id),
      category_id: updatedProduct.category_id ? toServerUuid(updatedProduct.category_id) : null,
      name: updatedProduct.name,
      slug: updatedProduct.slug,
      description: updatedProduct.description || '',
      price: Number(updatedProduct.base_price || 0),
      base_price: Number(updatedProduct.base_price || 0),
      promotional_price: updatedProduct.promotional_price ? Number(updatedProduct.promotional_price) : null,
      unit: updatedProduct.unit || 'unidade',
      image_url: finalImage || null,
      is_active: Boolean(updatedProduct.is_active ?? true),
      active: Boolean(updatedProduct.is_active ?? true),
      is_featured: Boolean(updatedProduct.is_featured ?? false),
      stock_quantity: Number(updatedProduct.stock_quantity ?? 15),
      track_stock: Boolean(updatedProduct.track_stock ?? true),
      allergens: Array.isArray(updatedProduct.allergens) ? updatedProduct.allergens : [],
      tags: Array.isArray(updatedProduct.tags) ? updatedProduct.tags : [],
      options: updatedProduct.options || [],
      schedule_config: updatedProduct.schedule_config || {},
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('products').upsert(payload, { onConflict: 'slug' });
    if (error) {
      console.warn('[ServerSupabase] Product upsert warning:', error.message);
    } else {
      console.info(`[ServerSupabase] Product "${updatedProduct.name}" synced to Supabase`);
    }
  } catch (err: any) {
    console.warn('[ServerSupabase] Product sync failed:', err?.message || err);
  }

  return updatedProduct;
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

/**
 * Sync delivery locations to Supabase delivery_ceps table.
 */
export async function syncDeliveryCepsToSupabase(ceps: DeliveryCepRule[]): Promise<void> {
  const client = getServerSupabaseClient();
  if (!client) return;

  try {
    const rows = ceps.map((c) => ({
      id: toServerUuid(c.id),
      label: c.label,
      cep: c.cep || '36830-000',
      fee: Number(c.fee) || 0,
      estimated_minutes: Number(c.estimated_minutes) || 30,
      active: Boolean(c.active ?? true),
      is_active: Boolean(c.active ?? true),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client.from('delivery_ceps').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('[ServerSupabase] Delivery locations upsert warning:', error.message);
    } else {
      console.info(`[ServerSupabase] ${ceps.length} delivery locations synced to Supabase`);
    }
  } catch (err: any) {
    console.warn('[ServerSupabase] Delivery ceps sync failed:', err?.message || err);
  }
}

/**
 * Fetch delivery locations from Supabase delivery_ceps table.
 */
export async function getDeliveryCepsFromSupabase(): Promise<DeliveryCepRule[] | null> {
  const client = getServerSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('delivery_ceps')
      .select('*')
      .order('fee', { ascending: true });

    if (error || !data || data.length === 0) {
      return null;
    }

    return data.map((r: any) => ({
      id: r.id,
      label: r.label,
      cep: r.cep,
      fee: Number(r.fee),
      estimated_minutes: Number(r.estimated_minutes || 30),
      active: r.active ?? r.is_active ?? true,
    }));
  } catch (err: any) {
    console.warn('[ServerSupabase] Delivery ceps fetch failed:', err?.message || err);
    return null;
  }
}

export async function getProductsFromSupabase(): Promise<Product[] | null> {
  const client = getServerSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('products').select('*').order('name');
    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      category_id: row.category_id || '',
      name: row.name,
      slug: row.slug,
      description: row.description || '',
      base_price: Number(row.base_price ?? row.price ?? 0),
      promotional_price: row.promotional_price ? Number(row.promotional_price) : null,
      unit: row.unit || 'unidade',
      image_url: row.image_url || '',
      is_active: row.is_active ?? row.active ?? true,
      is_featured: Boolean(row.is_featured ?? false),
      stock_quantity: Number(row.stock_quantity ?? 15),
      track_stock: Boolean(row.track_stock ?? true),
      allergens: Array.isArray(row.allergens) ? row.allergens : [],
      tags: Array.isArray(row.tags) ? row.tags : [],
      options: Array.isArray(row.options) ? row.options : [],
      schedule_config: row.schedule_config || {},
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('[ServerSupabase] Products fetch error:', err?.message || err);
    return null;
  }
}

export async function getCategoriesFromSupabase(): Promise<Category[] | null> {
  const client = getServerSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('categories').select('*').order('display_order', { ascending: true });
    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description || '',
      sort_order: Number(row.display_order ?? row.sort_order ?? 0),
      active: row.is_active ?? row.active ?? true,
      image_url: row.image_url || undefined,
    }));
  } catch (err: any) {
    console.warn('[ServerSupabase] Categories fetch error:', err?.message || err);
    return null;
  }
}

export async function getCouponsFromSupabase(): Promise<any[] | null> {
  const client = getServerSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('coupons').select('*');
    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      code: row.code,
      discount_type: row.percent_off ? 'PERCENTAGE' : (row.discount_type || 'FIXED'),
      discount_value: Number(row.percent_off || row.discount_value || row.amount_off || 0),
      min_order_value: Number(row.min_order_value || 0),
      active: row.is_active ?? row.active ?? true,
      max_uses: row.usage_limit ?? null,
      usage_count: Number(row.usage_count || 0),
      valid_from: row.valid_from || new Date(0).toISOString(),
      valid_until: row.valid_until || new Date(Date.now() + 365 * 86400000).toISOString(),
    }));
  } catch (err: any) {
    console.warn('[ServerSupabase] Coupons fetch error:', err?.message || err);
    return null;
  }
}

export async function getDeliveryZonesFromSupabase(): Promise<any[] | null> {
  const client = getServerSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('delivery_zones').select('*').order('name');
    if (error || !data || data.length === 0) return null;
    return data.map((z: any) => ({
      id: z.id,
      name: z.name,
      neighborhood: z.name || 'Centro',
      fee: Number(z.fee ?? 0),
      estimated_minutes: Number(z.estimated_minutes ?? z.min_lead_time_minutes ?? 35),
      active: z.is_active ?? z.active ?? true,
    }));
  } catch (err: any) {
    console.warn('[ServerSupabase] Delivery zones fetch error:', err?.message || err);
    return null;
  }
}

export async function getOrdersFromSupabase(): Promise<any[] | null> {
  const client = getServerSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('orders')
      .select('*, order_items(*), order_status_history(*), addresses(*)')
      .order('created_at', { ascending: false });
    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      order_number: row.order_number || String(row.id).substring(0, 8),
      customer_id: row.customer_id || '',
      customer_name: row.customer_name || 'Cliente',
      customer_phone: row.customer_phone || '',
      status: row.status || 'PENDING',
      payment_status: row.payment_status || 'PENDING',
      payment_method: row.payment_method || 'PIX',
      delivery_type: row.delivery_type || row.fulfillment_type || 'DELIVERY',
      subtotal: Number(row.subtotal || 0),
      discount: Number(row.discount || 0),
      delivery_fee: Number(row.delivery_fee || 0),
      total: Number(row.total || 0),
      notes: row.notes || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
      items: (row.order_items || []).map((it: any) => ({
        id: it.id,
        order_id: row.id,
        product_id: it.product_id,
        product_name: it.product_name || 'Item do Pedido',
        unit_price: Number(it.unit_price || 0),
        quantity: Number(it.quantity || 1),
        subtotal: Number(it.unit_price || 0) * Number(it.quantity || 1),
        notes: it.notes || '',
      })),
      address: row.addresses ? {
        street: row.addresses.street || '',
        number: row.addresses.number || '',
        complement: row.addresses.complement || '',
        neighborhood: row.addresses.neighborhood || '',
        city: row.addresses.city || 'Espera Feliz',
        state: row.addresses.state || 'MG',
        zip_code: row.addresses.zip_code || '',
      } : (row.address || row.delivery_address || undefined),
      status_history: (row.order_status_history || []).map((h: any) => ({
        id: h.id,
        order_id: row.id,
        previous_status: null,
        new_status: h.status,
        changed_by: h.changed_by || 'SISTEMA',
        notes: h.notes || '',
        created_at: h.changed_at || h.created_at,
      })),
      pix_qr_code: row.pix_qr_code,
      pix_copy_paste: row.pix_copy_paste,
    }));
  } catch (err: any) {
    console.warn('[ServerSupabase] Orders fetch error:', err?.message || err);
    return null;
  }
}

export async function getProductionBatchesFromSupabase(): Promise<any[] | null> {
  const client = getServerSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('production_batches')
      .select('*')
      .order('production_date', { ascending: true });
    if (error || !data) return null;
    return data.map((b: any) => ({
      id: b.id,
      product_id: b.product_id,
      production_date: b.production_date,
      capacity: Number(b.capacity ?? 10),
      reserved_quantity: Number(b.reserved_quantity ?? 0),
      created_at: b.created_at,
      updated_at: b.updated_at,
    }));
  } catch (err: any) {
    console.warn('[ServerSupabase] Batches fetch error:', err?.message || err);
    return null;
  }
}


