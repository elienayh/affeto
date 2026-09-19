import express from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const app = express();

// Support JSON payloads up to 20MB for uploaded images/logos
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// -----------------------------------------------------------------
// SUPABASE CLIENT (SINGLE SOURCE OF TRUTH - NO MOCK DATA)
// -----------------------------------------------------------------
const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ropgdbgkjghwdxdglchz.supabase.co';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!supabaseKey) return null;
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
    } catch (err) {
      console.warn('[API Supabase] Client init error:', err);
      return null;
    }
  }
  return supabaseClient;
}

function toUuid(id: string): string {
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

// -----------------------------------------------------------------
// DATA FETCHERS FROM SUPABASE (PRODUCTION SOURCE OF TRUTH)
// -----------------------------------------------------------------
async function fetchProductsFromSupabase() {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error || !data) return [];
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
    }));
  } catch (err) {
    console.warn('[API fetchProducts] Error:', err);
    return [];
  }
}

async function fetchCategoriesFromSupabase() {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });
    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description || '',
      sort_order: Number(row.display_order ?? row.sort_order ?? 0),
      active: row.is_active ?? row.active ?? true,
      image_url: row.image_url || undefined,
    }));
  } catch (err) {
    console.warn('[API fetchCategories] Error:', err);
    return [];
  }
}

async function fetchDeliveryZonesFromSupabase() {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('delivery_zones').select('*').order('name');
    if (error || !data) return [];
    return data.map((z: any) => ({
      id: z.id,
      name: z.name,
      neighborhood: z.name || 'Centro',
      fee: Number(z.fee ?? 0),
      estimated_minutes: Number(z.estimated_minutes ?? z.min_lead_time_minutes ?? 35),
      active: z.is_active ?? z.active ?? true,
    }));
  } catch (err) {
    console.warn('[API fetchDeliveryZones] Error:', err);
    return [];
  }
}

async function fetchDeliveryCepsFromSupabase() {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('delivery_ceps').select('*').order('fee', { ascending: true });
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      label: r.label,
      cep: r.cep,
      fee: Number(r.fee ?? 0),
      estimated_minutes: Number(r.estimated_minutes ?? 30),
      active: r.active ?? r.is_active ?? true,
    }));
  } catch (err) {
    console.warn('[API fetchDeliveryCeps] Error:', err);
    return [];
  }
}

async function fetchCouponsFromSupabase() {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('coupons').select('*');
    if (error || !data) return [];
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
      valid_until: row.valid_until || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }));
  } catch (err) {
    console.warn('[API fetchCoupons] Error:', err);
    return [];
  }
}

async function fetchOrdersFromSupabase() {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), order_status_history(*), addresses(*)')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
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
      address: row.addresses
        ? {
            street: row.addresses.street || '',
            number: row.addresses.number || '',
            complement: row.addresses.complement || '',
            neighborhood: row.addresses.neighborhood || '',
            city: row.addresses.city || 'Espera Feliz',
            state: row.addresses.state || 'MG',
            zip_code: row.addresses.zip_code || '',
          }
        : row.address || row.delivery_address || undefined,
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
  } catch (err) {
    console.warn('[API fetchOrders] Error:', err);
    return [];
  }
}

async function fetchProductionBatchesFromSupabase() {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('production_batches')
      .select('*')
      .order('production_date', { ascending: true });
    if (error || !data) return [];
    return data.map((b: any) => ({
      id: b.id,
      product_id: b.product_id,
      production_date: b.production_date,
      capacity: Number(b.capacity ?? 10),
      reserved_quantity: Number(b.reserved_quantity ?? 0),
      created_at: b.created_at,
      updated_at: b.updated_at,
    }));
  } catch (err) {
    console.warn('[API fetchProductionBatches] Error:', err);
    return [];
  }
}

async function fetchStoreSettingsFromSupabase() {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id || 'a2e33509-1264-431a-a2e3-00003509831a',
      name: data.name || 'Affeto Pães',
      slug: data.slug || 'affeto-paes-artesanais',
      description: data.description || '',
      address: data.address || 'Rua Capitão José Carlos - 133',
      city: data.city || 'Espera Feliz',
      state: data.state || 'MG',
      pickup_address: data.pickup_address || data.address || 'Rua Capitão José Carlos - 133',
      logo_url: data.logo_url || '',
      phone: data.phone || '(32) 98468-0513',
      whatsapp: data.whatsapp || '5532984680513',
      pix_key: data.pix_key || 'toledodias87@gmail.com',
      instagram: data.instagram || '@affetopaes',
      is_open: data.is_open ?? true,
      min_order_value: Number(data.min_order_value ?? 15),
      free_shipping_threshold: Number(data.free_shipping_threshold ?? 120),
      lead_time_minutes: Number(data.lead_time_minutes ?? 45),
      fresh_batch_hours: data.fresh_batch_hours || 'Fornadas frescas diárias saindo às 08h00 e às 15h00.',
      delivery_schedule_text: data.delivery_schedule_text || 'Entregas nas terças e sextas',
      opening_hours: Array.isArray(data.opening_hours) ? data.opening_hours : [],
    };
  } catch (err) {
    console.warn('[API fetchStoreSettings] Error:', err);
    return null;
  }
}

// -----------------------------------------------------------------
// PRICING CALCULATION ENGINE (PURE LOGIC - ZERO MOCK DATA)
// -----------------------------------------------------------------
function matchDeliveryCep(rawCepOrLocation: string, cepRules: any[] = []): any | null {
  if (!rawCepOrLocation) return null;
  const trimmed = rawCepOrLocation.trim();

  // 1. Direct match by id, label or exact CEP
  const direct = cepRules.find(
    (r) =>
      r.active &&
      (r.id === trimmed ||
        r.label.toLowerCase() === trimmed.toLowerCase() ||
        (r.cep && r.cep === trimmed))
  );
  if (direct) return direct;

  // 1.1 Partial match by name
  const partial = cepRules.find(
    (r) =>
      r.active &&
      (r.label.toLowerCase().includes(trimmed.toLowerCase()) ||
        trimmed.toLowerCase().includes(r.label.toLowerCase()))
  );
  if (partial) return partial;

  // 2. CEP digits match
  const digits = trimmed.replace(/\D/g, '');
  if (digits) {
    const exact = cepRules.find((r) => r.active && r.cep && r.cep.replace(/\D/g, '') === digits);
    if (exact) return exact;

    if (digits.length >= 5) {
      const prefix = digits.substring(0, 5);
      const prefixMatch = cepRules.find(
        (r) => r.active && r.cep && r.cep.replace(/\D/g, '').startsWith(prefix)
      );
      if (prefixMatch) return prefixMatch;
    }
  }

  return null;
}

function calculateOrderPricingPure(input: {
  items: Array<{
    product_id: string;
    quantity: number;
    selected_options?: Array<{ option_id: string; value_id: string }>;
  }>;
  availableProducts: any[];
  delivery_type: string;
  delivery_zone_id?: string;
  delivery_location_id?: string;
  availableZones: any[];
  zip_code?: string;
  availableCepRules?: any[];
  coupon_code?: string;
  availableCoupons: any[];
}) {
  const {
    items,
    availableProducts,
    delivery_type,
    delivery_zone_id,
    availableZones,
    coupon_code,
    availableCoupons,
  } = input;

  if (!items || items.length === 0) {
    return {
      breakdown: {
        subtotal: 0,
        discount: 0,
        delivery_type,
        delivery_fee: 0,
        total: 0,
        items_count: 0,
      },
      validatedItems: [],
      error: 'O carrinho está vazio.',
    };
  }

  let subtotal = 0;
  let totalItemsCount = 0;
  const validatedItems: any[] = [];

  for (const item of items) {
    const product = availableProducts.find((p) => p.id === item.product_id || p.slug === item.product_id);
    if (!product) {
      return {
        breakdown: { subtotal: 0, discount: 0, delivery_type, delivery_fee: 0, total: 0, items_count: 0 },
        validatedItems: [],
        error: `Produto com id ${item.product_id} não foi encontrado no cardápio.`,
      };
    }

    if (product.is_active === false) {
      return {
        breakdown: { subtotal: 0, discount: 0, delivery_type, delivery_fee: 0, total: 0, items_count: 0 },
        validatedItems: [],
        error: `O produto "${product.name}" não está disponível no momento.`,
      };
    }

    let unitPrice =
      product.promotional_price && product.promotional_price > 0
        ? product.promotional_price
        : product.base_price;

    const optionsSummary: any[] = [];
    if (item.selected_options && item.selected_options.length > 0 && product.options) {
      for (const sel of item.selected_options) {
        const opt = product.options.find((o: any) => o.id === sel.option_id);
        if (opt) {
          const val = opt.values?.find((v: any) => v.id === sel.value_id);
          if (val) {
            unitPrice += Number(val.price_modifier || 0);
            optionsSummary.push({
              option_name: opt.name,
              value_name: val.name,
              price_modifier: Number(val.price_modifier || 0),
            });
          }
        }
      }
    }

    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;
    totalItemsCount += item.quantity;

    validatedItems.push({
      product,
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: itemTotal,
      options_summary: optionsSummary,
    });
  }

  // Delivery fee calculation
  let deliveryFee = 0;
  let isCepAllowed: boolean | undefined = undefined;
  let matchedCepRule: any | undefined = undefined;

  if (delivery_type === 'DELIVERY') {
    const locKey = input.delivery_location_id || input.zip_code;
    if (locKey) {
      const match = matchDeliveryCep(locKey, input.availableCepRules || []);
      if (match) {
        deliveryFee = Number(match.fee);
        isCepAllowed = true;
        matchedCepRule = match;
      } else {
        isCepAllowed = false;
        deliveryFee = 0;
      }
    } else if (delivery_zone_id) {
      const zone = availableZones.find((z) => z.id === delivery_zone_id && z.active);
      deliveryFee = zone ? Number(zone.fee) : 5.0;
      isCepAllowed = true;
    } else if (input.availableCepRules && input.availableCepRules.length > 0) {
      deliveryFee = 0;
      isCepAllowed = false;
    } else {
      deliveryFee = 5.0;
      isCepAllowed = true;
    }
  } else {
    deliveryFee = 0;
  }

  // Coupon discount calculation
  let discount = 0;
  let appliedCouponCode: string | undefined = undefined;
  let appliedCouponId: string | undefined = undefined;

  if (coupon_code) {
    const cleanCode = coupon_code.trim().toUpperCase();
    const coupon = availableCoupons.find(
      (c) => c.code && c.code.toUpperCase() === cleanCode && c.active
    );

    if (coupon) {
      const now = new Date();
      const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : new Date(0);
      const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : new Date(Date.now() + 86400000);

      if (now >= validFrom && now <= validUntil) {
        const meetsMin = !coupon.min_order_value || subtotal >= coupon.min_order_value;
        const withinLimit = !coupon.usage_limit || !coupon.usage_count || coupon.usage_count < coupon.usage_limit;

        if (meetsMin && withinLimit) {
          if (coupon.discount_type === 'PERCENTAGE') {
            discount = (subtotal * Number(coupon.discount_value)) / 100;
            if (coupon.max_discount && discount > coupon.max_discount) {
              discount = coupon.max_discount;
            }
          } else {
            discount = Number(coupon.discount_value);
          }

          if (discount > subtotal) {
            discount = subtotal;
          }

          appliedCouponCode = coupon.code;
          appliedCouponId = coupon.id;
        }
      }
    }
  }

  const total = Math.max(0, subtotal - discount + deliveryFee);

  return {
    breakdown: {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      coupon_code: appliedCouponCode,
      coupon_id: appliedCouponId,
      delivery_type,
      delivery_fee: Math.round(deliveryFee * 100) / 100,
      zip_code: input.zip_code,
      is_cep_allowed: isCepAllowed,
      cep_rule_matched: matchedCepRule,
      total: Math.round(total * 100) / 100,
      items_count: totalItemsCount,
    },
    validatedItems,
  };
}

// -----------------------------------------------------------------
// API ENDPOINTS
// -----------------------------------------------------------------

// 1. Health check
app.get('/api/health', (_req, res) => {
  return res.json({
    status: 'ok',
    app: 'Affeto Pães',
    supabase_target: supabaseUrl,
    supabase_configured: Boolean(supabaseKey),
    source_of_truth: 'SUPABASE_DIRECT',
    timestamp: new Date().toISOString(),
  });
});

// 2. Config endpoint: supplies runtime client credentials from server environment
app.get('/api/config', (_req, res) => {
  return res.json({
    supabaseUrl,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
    bakeryWhatsapp: process.env.VITE_BAKERY_WHATSAPP_NUMBER || '5532984680513',
  });
});

// 3. Products
app.get('/api/products', async (_req, res) => {
  try {
    const products = await fetchProductsFromSupabase();
    return res.json(products);
  } catch (err: any) {
    console.error('[API Products Error]:', err);
    return res.status(500).json({ error: 'Erro ao carregar produtos do Supabase' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' });

    const payload = {
      id: toUuid(req.body.id || ''),
      name: req.body.name,
      slug: req.body.slug,
      description: req.body.description || '',
      category_id: req.body.category_id ? toUuid(req.body.category_id) : null,
      price: Number(req.body.base_price || req.body.price || 0),
      base_price: Number(req.body.base_price || req.body.price || 0),
      promotional_price: req.body.promotional_price ? Number(req.body.promotional_price) : null,
      unit: req.body.unit || 'unidade',
      image_url: req.body.image_url || null,
      is_active: Boolean(req.body.is_active ?? true),
      active: Boolean(req.body.is_active ?? true),
      is_featured: Boolean(req.body.is_featured ?? false),
      stock_quantity: Number(req.body.stock_quantity ?? 15),
      track_stock: Boolean(req.body.track_stock ?? true),
      allergens: Array.isArray(req.body.allergens) ? req.body.allergens : [],
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      options: req.body.options || [],
      schedule_config: req.body.schedule_config || {},
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('products').upsert(payload, { onConflict: 'slug' }).select();
    if (error) throw error;
    return res.json(data?.[0] || payload);
  } catch (err: any) {
    console.error('[API Product Save Error]:', err);
    return res.status(500).json({ error: 'Erro ao salvar produto no Supabase' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' });

    const uuid = toUuid(req.params.id);
    const payload = {
      ...req.body,
      id: uuid,
      price: Number(req.body.base_price || req.body.price || 0),
      base_price: Number(req.body.base_price || req.body.price || 0),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('products').upsert(payload, { onConflict: 'id' }).select();
    if (error) throw error;
    return res.json(data?.[0] || payload);
  } catch (err: any) {
    console.error('[API Product Update Error]:', err);
    return res.status(500).json({ error: 'Erro ao atualizar produto no Supabase' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' });

    const uuid = toUuid(req.params.id);
    await supabase.from('products').delete().or(`id.eq.${uuid},slug.eq.${req.params.id}`);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[API Product Delete Error]:', err);
    return res.status(500).json({ error: 'Erro ao excluir produto do Supabase' });
  }
});

// 4. Categories
app.get('/api/categories', async (_req, res) => {
  try {
    const categories = await fetchCategoriesFromSupabase();
    return res.json(categories);
  } catch (err: any) {
    console.error('[API Categories Error]:', err);
    return res.status(500).json({ error: 'Erro ao carregar categorias do Supabase' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' });

    const payload = {
      id: toUuid(req.body.id || ''),
      name: req.body.name,
      slug: req.body.slug,
      description: req.body.description || '',
      display_order: Number(req.body.sort_order ?? 0),
      sort_order: Number(req.body.sort_order ?? 0),
      active: Boolean(req.body.active ?? true),
      is_active: Boolean(req.body.active ?? true),
      image_url: req.body.image_url || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('categories').upsert(payload, { onConflict: 'slug' }).select();
    if (error) throw error;
    return res.json(data?.[0] || payload);
  } catch (err: any) {
    console.error('[API Category Save Error]:', err);
    return res.status(500).json({ error: 'Erro ao salvar categoria no Supabase' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' });

    const uuid = toUuid(req.params.id);
    await supabase.from('categories').delete().or(`id.eq.${uuid},slug.eq.${req.params.id}`);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[API Category Delete Error]:', err);
    return res.status(500).json({ error: 'Erro ao excluir categoria do Supabase' });
  }
});

// 5. Delivery Zones
app.get('/api/delivery-zones', async (_req, res) => {
  try {
    const zones = await fetchDeliveryZonesFromSupabase();
    return res.json(zones);
  } catch (err: any) {
    console.error('[API Delivery Zones Error]:', err);
    return res.status(500).json({ error: 'Erro ao carregar zonas de entrega' });
  }
});

app.put('/api/delivery-zones', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.json(req.body);

    const zones = Array.isArray(req.body) ? req.body : [req.body];
    const rows = zones.map((z: any) => ({
      id: toUuid(z.id || ''),
      name: z.name || z.neighborhood || 'Zona',
      fee: Number(z.fee ?? 0),
      estimated_minutes: Number(z.estimated_minutes ?? 35),
      is_active: Boolean(z.active ?? true),
      active: Boolean(z.active ?? true),
      updated_at: new Date().toISOString(),
    }));

    await supabase.from('delivery_zones').upsert(rows, { onConflict: 'id' });
    return res.json(zones);
  } catch (err: any) {
    console.error('[API Delivery Zones Update Error]:', err);
    return res.status(500).json({ error: 'Erro ao atualizar zonas de entrega' });
  }
});

// 6. Delivery Ceps / Locations
app.get('/api/delivery-ceps', async (_req, res) => {
  try {
    const ceps = await fetchDeliveryCepsFromSupabase();
    return res.json(ceps);
  } catch (err: any) {
    console.error('[API Delivery CEPs Error]:', err);
    return res.status(500).json({ error: 'Erro ao carregar regras de CEP' });
  }
});

app.post('/api/delivery-ceps', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' });

    const c = req.body;
    const payload = {
      id: toUuid(c.id || ''),
      label: c.label,
      cep: c.cep || '36830-000',
      fee: Number(c.fee) || 0,
      estimated_minutes: Number(c.estimated_minutes) || 30,
      active: Boolean(c.active ?? true),
      is_active: Boolean(c.active ?? true),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('delivery_ceps').upsert(payload, { onConflict: 'id' }).select();
    if (error) throw error;
    return res.json(data?.[0] || payload);
  } catch (err: any) {
    console.error('[API Delivery CEP Save Error]:', err);
    return res.status(500).json({ error: 'Erro ao salvar regra de CEP' });
  }
});

app.delete('/api/delivery-ceps/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' });

    const uuid = toUuid(req.params.id);
    await supabase.from('delivery_ceps').delete().eq('id', uuid);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[API Delivery CEP Delete Error]:', err);
    return res.status(500).json({ error: 'Erro ao excluir regra de CEP' });
  }
});

// 7. Coupons
app.get('/api/coupons', async (_req, res) => {
  try {
    const coupons = await fetchCouponsFromSupabase();
    return res.json(coupons);
  } catch (err: any) {
    console.error('[API Coupons Error]:', err);
    return res.status(500).json({ error: 'Erro ao carregar cupons' });
  }
});

app.post('/api/coupons', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' });

    const c = req.body;
    const payload = {
      id: toUuid(c.id || ''),
      code: c.code ? c.code.trim().toUpperCase() : '',
      discount_type: c.discount_type || 'PERCENTAGE',
      discount_value: Number(c.discount_value || c.percent_off || 0),
      percent_off: c.discount_type === 'PERCENTAGE' ? Number(c.discount_value) : null,
      amount_off: c.discount_type !== 'PERCENTAGE' ? Number(c.discount_value) : null,
      min_order_value: Number(c.min_order_value || 0),
      valid_from: c.valid_from || new Date().toISOString(),
      valid_until: c.valid_until || new Date(Date.now() + 365 * 86400000).toISOString(),
      usage_limit: c.max_uses ?? c.usage_limit ?? null,
      is_active: Boolean(c.active ?? true),
      active: Boolean(c.active ?? true),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('coupons').upsert(payload, { onConflict: 'code' }).select();
    if (error) throw error;
    return res.json(data?.[0] || payload);
  } catch (err: any) {
    console.error('[API Coupon Save Error]:', err);
    return res.status(500).json({ error: 'Erro ao salvar cupom' });
  }
});

app.delete('/api/coupons/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' });

    const uuid = toUuid(req.params.id);
    await supabase.from('coupons').delete().or(`id.eq.${uuid},code.eq.${req.params.id}`);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[API Coupon Delete Error]:', err);
    return res.status(500).json({ error: 'Erro ao excluir cupom' });
  }
});

// 8. Orders
app.get('/api/orders', async (_req, res) => {
  try {
    const orders = await fetchOrdersFromSupabase();
    return res.json(orders);
  } catch (err: any) {
    console.error('[API Orders Error]:', err);
    return res.status(500).json({ error: 'Erro ao carregar pedidos do Supabase' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' });

    const order = req.body;
    const orderId = toUuid(order.id || '');

    const orderRow = {
      id: orderId,
      order_number: order.order_number || orderId.substring(0, 8),
      customer_id: order.customer_id ? toUuid(order.customer_id) : '57127268-4038-4f49-9fc4-67119e68bfd9',
      customer_name: order.customer_name || 'Cliente',
      customer_phone: order.customer_phone || '',
      status: order.status || 'PENDING',
      payment_status: order.payment_status || 'PENDING',
      payment_method: order.payment_method || 'PIX',
      delivery_type: order.delivery_type || 'DELIVERY',
      subtotal: Number(order.subtotal || 0),
      discount: Number(order.discount || 0),
      delivery_fee: Number(order.delivery_fee || 0),
      total: Number(order.total || 0),
      notes: order.notes || '',
      created_at: order.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: orderErr } = await supabase.from('orders').upsert(orderRow, { onConflict: 'id' });
    if (orderErr) throw orderErr;

    // Order items
    if (Array.isArray(order.items) && order.items.length > 0) {
      const itemsRows = order.items.map((it: any) => ({
        id: toUuid(it.id || ''),
        order_id: orderId,
        product_id: toUuid(it.product_id),
        quantity: Number(it.quantity || 1),
        unit_price: Number(it.unit_price || 0),
        subtotal: Number(it.unit_price || 0) * Number(it.quantity || 1),
        notes: it.notes || '',
      }));
      await supabase.from('order_items').upsert(itemsRows, { onConflict: 'id' });
    }

    return res.status(201).json(order);
  } catch (err: any) {
    console.error('[API Order Create Error]:', err);
    return res.status(500).json({ error: 'Erro ao registrar pedido no Supabase' });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' });

    const orderId = toUuid(req.params.id);
    const { status, changed_by, notes } = req.body;

    const { error: updateErr } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateErr) throw updateErr;

    // Log in order_status_history
    await supabase.from('order_status_history').insert({
      id: toUuid(`hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`),
      order_id: orderId,
      status,
      changed_by: changed_by || 'ADMIN',
      notes: notes || `Status alterado para ${status}`,
      changed_at: new Date().toISOString(),
    });

    return res.json({ success: true, status });
  } catch (err: any) {
    console.error('[API Order Status Error]:', err);
    return res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
  }
});

app.patch('/api/orders/:id/payment', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' });

    const orderId = toUuid(req.params.id);
    const { payment_status, payment_method, notes } = req.body;

    const updatePayload: any = {
      payment_status,
      updated_at: new Date().toISOString(),
    };
    if (payment_method) {
      updatePayload.payment_method = payment_method;
    }

    const { error: updateErr } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    if (updateErr) throw updateErr;

    return res.json({ success: true, payment_status, payment_method });
  } catch (err: any) {
    console.error('[API Order Payment Error]:', err);
    return res.status(500).json({ error: 'Erro ao atualizar pagamento do pedido' });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' });

    const orderId = toUuid(req.params.id);
    const { audit_note, ...orderData } = req.body;

    const { error: updateErr } = await supabase
      .from('orders')
      .update({ ...orderData, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateErr) throw updateErr;
    return res.json({ success: true, ...orderData });
  } catch (err: any) {
    console.error('[API Order Full Update Error]:', err);
    return res.status(500).json({ error: 'Erro ao atualizar pedido' });
  }
});

// 9. Production Batches
app.get('/api/production-batches', async (_req, res) => {
  try {
    const batches = await fetchProductionBatchesFromSupabase();
    return res.json(batches);
  } catch (err: any) {
    console.error('[API Production Batches Error]:', err);
    return res.status(500).json({ error: 'Erro ao carregar fornadas' });
  }
});

app.post('/api/production-batches', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' });

    const b = req.body;
    const payload = {
      id: toUuid(b.id || `batch-${b.product_id}-${b.production_date}`),
      product_id: toUuid(b.product_id),
      production_date: b.production_date,
      capacity: Number(b.capacity ?? 10),
      reserved_quantity: Number(b.reserved_quantity ?? 0),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('production_batches').upsert(payload).select();
    if (error) throw error;
    return res.json(data?.[0] || payload);
  } catch (err: any) {
    console.error('[API Production Batch Save Error]:', err);
    return res.status(500).json({ error: 'Erro ao salvar fornada' });
  }
});

app.post('/api/production-batches/reserve', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.json({ success: true });

    const { product_id, production_date, quantity, default_capacity } = req.body;
    const uuid = toUuid(product_id);

    const { data } = await supabase
      .from('production_batches')
      .select('*')
      .eq('product_id', uuid)
      .eq('production_date', production_date)
      .maybeSingle();

    const currentReserved = Number(data?.reserved_quantity || 0);
    const capacity = Number(data?.capacity || default_capacity || 10);
    const newReserved = currentReserved + Number(quantity || 1);

    if (newReserved > capacity) {
      return res.status(400).json({
        success: false,
        error: `Capacidade máxima atingida para esta data. Disponível: ${Math.max(0, capacity - currentReserved)}`,
      });
    }

    const payload = {
      id: data?.id || toUuid(`batch-${product_id}-${production_date}`),
      product_id: uuid,
      production_date,
      capacity,
      reserved_quantity: newReserved,
      updated_at: new Date().toISOString(),
    };

    await supabase.from('production_batches').upsert(payload);
    return res.json({ success: true, batch: payload });
  } catch (err: any) {
    console.error('[API Batch Reserve Error]:', err);
    return res.status(500).json({ error: 'Erro ao reservar fornada' });
  }
});

app.post('/api/production-batches/release', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.json({ success: true });

    const { product_id, production_date, quantity } = req.body;
    const uuid = toUuid(product_id);

    const { data } = await supabase
      .from('production_batches')
      .select('*')
      .eq('product_id', uuid)
      .eq('production_date', production_date)
      .maybeSingle();

    if (data) {
      const newReserved = Math.max(0, Number(data.reserved_quantity || 0) - Number(quantity || 1));
      await supabase
        .from('production_batches')
        .update({ reserved_quantity: newReserved, updated_at: new Date().toISOString() })
        .eq('id', data.id);
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error('[API Batch Release Error]:', err);
    return res.status(500).json({ error: 'Erro ao liberar lote' });
  }
});

// 10. Store Settings
const handleSettingsGet = async (_req: express.Request, res: express.Response) => {
  try {
    const settings = await fetchStoreSettingsFromSupabase();
    if (settings) return res.json(settings);
    return res.json({
      name: 'Affeto Pães',
      slug: 'affeto-paes-artesanais',
      is_open: true,
      min_order_value: 15,
      free_shipping_threshold: 120,
    });
  } catch (err: any) {
    console.error('[API Settings Get Error]:', err);
    return res.status(500).json({ error: 'Erro ao carregar configurações' });
  }
};

const handleSettingsUpdate = async (req: express.Request, res: express.Response) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.json(req.body);

    const payload = {
      id: 'a2e33509-1264-431a-a2e3-00003509831a',
      name: req.body.name,
      slug: 'affeto-paes-artesanais',
      address: req.body.address,
      phone: req.body.phone,
      whatsapp: req.body.whatsapp,
      pix_key: req.body.pix_key,
      logo_url: req.body.logo_url || null,
      min_order_value: Number(req.body.min_order_value || 0),
      free_shipping_threshold: Number(req.body.free_shipping_threshold || 120),
      lead_time_minutes: Number(req.body.lead_time_minutes || 45),
      is_open: Boolean(req.body.is_open ?? true),
      opening_hours: req.body.opening_hours || [],
      delivery_schedule_text: req.body.delivery_schedule_text,
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase.from('stores').upsert(payload, { onConflict: 'id' });
    if (error && error.message?.includes('delivery_schedule_text')) {
      delete payload.delivery_schedule_text;
      await supabase.from('stores').upsert(payload, { onConflict: 'id' });
    }

    return res.json(payload);
  } catch (err: any) {
    console.error('[API Settings Update Error]:', err);
    return res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
};

app.get('/api/store-settings', handleSettingsGet);
app.get('/api/settings', handleSettingsGet);
app.put('/api/store-settings', handleSettingsUpdate);
app.post('/api/store-settings', handleSettingsUpdate);
app.put('/api/settings', handleSettingsUpdate);
app.post('/api/settings', handleSettingsUpdate);

// 11. Server-side Pricing Engine (Uses live Supabase data exclusively)
app.post('/api/pricing/calculate', async (req, res) => {
  try {
    const {
      items,
      delivery_type,
      delivery_zone_id,
      delivery_location_id,
      zip_code,
      coupon_code,
    } = req.body;

    // Fetch live data directly from Supabase in parallel
    const [availableProducts, availableZones, availableCoupons, availableCepRules] = await Promise.all([
      fetchProductsFromSupabase(),
      fetchDeliveryZonesFromSupabase(),
      fetchCouponsFromSupabase(),
      fetchDeliveryCepsFromSupabase(),
    ]);

    const result = calculateOrderPricingPure({
      items: items || [],
      availableProducts,
      delivery_type: delivery_type || 'DELIVERY',
      delivery_zone_id,
      delivery_location_id,
      availableZones,
      zip_code,
      availableCepRules,
      coupon_code,
      availableCoupons,
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    return res.json(result);
  } catch (err: any) {
    console.error('[API Pricing Error]:', err);
    return res.status(500).json({ error: 'Erro ao recalcular preços no servidor' });
  }
});

// 12. Mercado Pago & Payments
app.get('/api/payments/config', (_req, res) => {
  return res.json({
    mercadopago_configured: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
    environment: 'production',
    supported_methods: ['PIX', 'CREDIT_CARD'],
  });
});

app.post('/api/webhooks/mercadopago', async (req, res) => {
  try {
    const payload = req.body;
    const paymentId = payload?.data?.id || req.query['data.id'] || req.query.id;

    return res.status(200).json({
      received: true,
      payment_id: paymentId,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Webhook Error]:', err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
});

export default app;
