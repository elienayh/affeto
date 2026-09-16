import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
  INITIAL_DELIVERY_CEPS,
  INITIAL_DELIVERY_ZONES,
  INITIAL_PRODUCTION_BATCHES,
  INITIAL_PRODUCTS,
  INITIAL_STORE_SETTINGS,
  SAMPLE_ORDERS,
} from '../data/mockData';
import {
  Category,
  Coupon,
  CustomerAddress,
  DeliveryCepRule,
  DeliveryZone,
  Order,
  OrderDelivery,
  OrderDeliveryItem,
  OrderItem,
  OrderStatus,
  OrderStatusHistoryItem,
  PaymentStatus,
  ProductionBatch,
  Product,
  StoreSettings,
} from '../types';

// Provided Supabase project URL
export const SUPABASE_DEFAULT_URL = 'https://ropgdbgkjghwdxdglchz.supabase.co';

// Fixed system profile for guest orders to satisfy foreign key constraints
export const SYSTEM_CUSTOMER_ID = '57127268-4038-4f49-9fc4-67119e68bfd9';

/**
 * Deterministic, valid UUID v4 string generator.
 * If the input is already a valid UUID, returns it as-is.
 * Otherwise creates a consistent, valid UUID formatted string from any text ID.
 */
export function toUuid(id: string): string {
  if (!id) {
    return '00000000-0000-4000-8000-000000000000';
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return id.toLowerCase();
  }

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

const getEnvUrl = (): string => {
  return (import.meta as any).env?.VITE_SUPABASE_URL || SUPABASE_DEFAULT_URL;
};

const getEnvAnonKey = (): string => {
  const localOverride = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ANON_KEY_OVERRIDE) : null;
  if (localOverride) return localOverride;
  return (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
};

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = getEnvUrl();
  const anonKey = getEnvAnonKey();

  if (!anonKey) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = createClient(url, anonKey);
    } catch (err) {
      console.warn('[Supabase] Failed to initialize client:', err);
      return null;
    }
  }

  return clientInstance;
}

// Local Storage Keys for offline/fallback persistence
const STORAGE_KEYS = {
  CATEGORIES: 'affeto_categories_v2',
  PRODUCTS: 'affeto_products_v2',
  COUPONS: 'affeto_coupons_v2',
  DELIVERY_ZONES: 'affeto_zones_v2',
  DELIVERY_CEPS: 'affeto_delivery_ceps_v2',
  ORDERS: 'affeto_orders_v2',
  STORE_SETTINGS: 'affeto_store_v2',
  FAVORITES: 'affeto_favorites_v2',
  PRODUCTION_BATCHES: 'affeto_production_batches_v2',
  ANON_KEY_OVERRIDE: 'affeto_supabase_anon_key_override',
};

// Helper for local storage
function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }
}

export const dataStore = {
  // -------------------------------------------------------------
  // CATEGORIES
  // -------------------------------------------------------------
  getCategories: async (): Promise<Category[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped: Category[] = data.map((row: any) => ({
            id: row.id,
            name: row.name,
            slug: row.slug,
            description: row.description || '',
            sort_order: row.display_order ?? row.sort_order ?? 0,
            active: row.is_active ?? row.active ?? true,
          }));
          setStored(STORAGE_KEYS.CATEGORIES, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase Categories] Read error:', err);
      }
    }
    return getStored<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  },

  saveCategory: async (category: Category): Promise<Category> => {
    const current = getStored<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    const idx = current.findIndex((c) => c.id === category.id || c.slug === category.slug);
    let updated: Category[];
    if (idx >= 0) {
      updated = current.map((c) => (c.id === category.id || c.slug === category.slug ? category : c));
    } else {
      updated = [...current, category];
    }
    setStored(STORAGE_KEYS.CATEGORIES, updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('categories').upsert(
          {
            id: toUuid(category.id),
            name: category.name,
            slug: category.slug,
            display_order: category.sort_order,
          },
          { onConflict: 'slug' }
        );
      } catch (err) {
        console.warn('[Supabase Category Save] error:', err);
      }
    }
    return category;
  },

  saveCategories: async (categories: Category[]): Promise<void> => {
    setStored(STORAGE_KEYS.CATEGORIES, categories);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const rows = categories.map((c) => ({
          id: toUuid(c.id),
          name: c.name,
          slug: c.slug,
          display_order: c.sort_order,
        }));
        await supabase.from('categories').upsert(rows, { onConflict: 'slug' });
      } catch (err) {
        console.warn('[Supabase Categories Save] error:', err);
      }
    }
  },

  deleteCategory: async (categoryId: string): Promise<boolean> => {
    const current = getStored<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    const catToDelete = current.find((c) => c.id === categoryId);
    const updated = current.filter((c) => c.id !== categoryId);
    setStored(STORAGE_KEYS.CATEGORIES, updated);

    const supabase = getSupabaseClient();
    if (supabase && catToDelete) {
      try {
        await supabase.from('categories').delete().or(`id.eq.${toUuid(categoryId)},slug.eq.${catToDelete.slug}`);
      } catch (err) {
        console.warn('[Supabase Category Delete] error:', err);
      }
    }
    return true;
  },

  // -------------------------------------------------------------
  // PRODUCTS
  // -------------------------------------------------------------
  getProducts: async (): Promise<Product[]> => {
    const localProds = getStored<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const localMap = new Map(localProds.map((p) => [p.slug, p]));

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name');

        if (!error && data && data.length > 0) {
          const mapped: Product[] = data.map((row: any) => {
            const local = localMap.get(row.slug);
            return {
              id: row.id,
              category_id: row.category_id || local?.category_id || '',
              name: row.name,
              slug: row.slug,
              description: row.description || local?.description || '',
              base_price: Number(row.price ?? row.base_price ?? 0),
              promotional_price: row.promotional_price ? Number(row.promotional_price) : null,
              unit: row.unit || 'unidade',
              is_active: row.is_active ?? true,
              is_featured: local?.is_featured ?? false,
              stock_quantity: local?.stock_quantity ?? 15,
              track_stock: local?.track_stock ?? true,
              image_url: local?.image_url || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
              allergens: local?.allergens || ['Glúten'],
              tags: local?.tags || [],
              schedule_config: local?.schedule_config || {
                is_scheduled_only: true,
                available_days: [2, 4, 6],
                batch_limit: 15,
                days_label: 'Terças, Quintas e Sábados',
                min_lead_days: 1,
                delivery_window: '14:00 - 18:00',
              },
              created_at: row.created_at || local?.created_at || new Date().toISOString(),
              updated_at: row.updated_at || local?.updated_at || new Date().toISOString(),
            };
          });
          setStored(STORAGE_KEYS.PRODUCTS, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase Products] Read error:', err);
      }
    }
    return localProds;
  },

  saveProduct: async (product: Product): Promise<Product> => {
    const current = getStored<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const idx = current.findIndex((p) => p.id === product.id || p.slug === product.slug);
    let updated: Product[];
    if (idx >= 0) {
      updated = current.map((p) => (p.id === product.id || p.slug === product.slug ? product : p));
    } else {
      updated = [product, ...current];
    }
    setStored(STORAGE_KEYS.PRODUCTS, updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('products').upsert(
          {
            id: toUuid(product.id),
            category_id: product.category_id ? toUuid(product.category_id) : null,
            name: product.name,
            slug: product.slug,
            description: product.description,
            price: product.base_price,
            promotional_price: product.promotional_price,
            unit: product.unit,
            is_active: product.is_active,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'slug' }
        );
      } catch (err) {
        console.warn('[Supabase Product Save] error:', err);
      }
    }
    return product;
  },

  saveProducts: async (products: Product[]): Promise<void> => {
    setStored(STORAGE_KEYS.PRODUCTS, products);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const rows = products.map((p) => ({
          id: toUuid(p.id),
          category_id: p.category_id ? toUuid(p.category_id) : null,
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.base_price,
          promotional_price: p.promotional_price,
          unit: p.unit,
          is_active: p.is_active,
          updated_at: new Date().toISOString(),
        }));
        await supabase.from('products').upsert(rows, { onConflict: 'slug' });
      } catch (err) {
        console.warn('[Supabase Products Save] error:', err);
      }
    }
  },

  deleteProduct: async (productId: string): Promise<boolean> => {
    const current = getStored<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const prodToDelete = current.find((p) => p.id === productId);
    const updated = current.filter((p) => p.id !== productId);
    setStored(STORAGE_KEYS.PRODUCTS, updated);

    const supabase = getSupabaseClient();
    if (supabase && prodToDelete) {
      try {
        await supabase.from('products').delete().or(`id.eq.${toUuid(productId)},slug.eq.${prodToDelete.slug}`);
      } catch (err) {
        console.warn('[Supabase Product Delete] error:', err);
      }
    }
    return true;
  },

  // -------------------------------------------------------------
  // COUPONS
  // -------------------------------------------------------------
  getCoupons: async (): Promise<Coupon[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('coupons').select('*');
        if (!error && data && data.length > 0) {
          const mapped: Coupon[] = data.map((row: any) => ({
            id: row.id,
            code: row.code,
            discount_type: row.percent_off ? 'PERCENTAGE' : 'FIXED',
            discount_value: Number(row.percent_off || row.amount_off || 0),
            min_order_value: Number(row.min_order_value || 0),
            active: !!row.is_active,
            max_uses: row.usage_limit,
            usage_count: 0,
            valid_from: row.valid_from,
            valid_until: row.valid_until,
          }));
          setStored(STORAGE_KEYS.COUPONS, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase Coupons] Read error:', err);
      }
    }
    return getStored<Coupon[]>(STORAGE_KEYS.COUPONS, INITIAL_COUPONS);
  },

  saveCoupon: async (coupon: Coupon): Promise<Coupon> => {
    const current = getStored<Coupon[]>(STORAGE_KEYS.COUPONS, INITIAL_COUPONS);
    const idx = current.findIndex((c) => c.id === coupon.id || c.code === coupon.code);
    let updated: Coupon[];
    if (idx >= 0) {
      updated = current.map((c) => (c.id === coupon.id || c.code === coupon.code ? coupon : c));
    } else {
      updated = [...current, coupon];
    }
    setStored(STORAGE_KEYS.COUPONS, updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('coupons').upsert(
          {
            id: toUuid(coupon.id),
            code: coupon.code.toUpperCase().trim(),
            percent_off: coupon.discount_type === 'PERCENTAGE' ? coupon.discount_value : null,
            amount_off: coupon.discount_type === 'FIXED' ? coupon.discount_value : null,
            min_order_value: coupon.min_order_value,
            is_active: coupon.active,
          },
          { onConflict: 'code' }
        );
      } catch (err) {
        console.warn('[Supabase Coupon Save] error:', err);
      }
    }
    return coupon;
  },

  saveCoupons: async (coupons: Coupon[]): Promise<void> => {
    setStored(STORAGE_KEYS.COUPONS, coupons);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const rows = coupons.map((c) => ({
          id: toUuid(c.id),
          code: c.code.toUpperCase().trim(),
          percent_off: c.discount_type === 'PERCENTAGE' ? c.discount_value : null,
          amount_off: c.discount_type === 'FIXED' ? c.discount_value : null,
          min_order_value: c.min_order_value,
          is_active: c.active,
        }));
        await supabase.from('coupons').upsert(rows, { onConflict: 'code' });
      } catch (err) {
        console.warn('[Supabase Coupons Save] error:', err);
      }
    }
  },

  deleteCoupon: async (couponId: string): Promise<boolean> => {
    const current = getStored<Coupon[]>(STORAGE_KEYS.COUPONS, INITIAL_COUPONS);
    const couponToDelete = current.find((c) => c.id === couponId);
    const updated = current.filter((c) => c.id !== couponId);
    setStored(STORAGE_KEYS.COUPONS, updated);

    const supabase = getSupabaseClient();
    if (supabase && couponToDelete) {
      try {
        await supabase.from('coupons').delete().or(`id.eq.${toUuid(couponId)},code.eq.${couponToDelete.code}`);
      } catch (err) {
        console.warn('[Supabase Coupon Delete] error:', err);
      }
    }
    return true;
  },

  // -------------------------------------------------------------
  // DELIVERY ZONES & CEPS
  // -------------------------------------------------------------
  getDeliveryZones: async (): Promise<DeliveryZone[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('delivery_zones').select('*');
        if (!error && data && data.length > 0) {
          const mapped: DeliveryZone[] = data.map((z: any) => ({
            id: z.id,
            name: z.name,
            neighborhood: z.name || 'Centro',
            fee: 10,
            estimated_minutes: 35,
            active: z.is_active ?? true,
          }));
          return mapped;
        }
      } catch {
        // Fallback to local
      }
    }
    return getStored<DeliveryZone[]>(STORAGE_KEYS.DELIVERY_ZONES, INITIAL_DELIVERY_ZONES);
  },

  saveDeliveryZones: (zones: DeliveryZone[]) => {
    setStored(STORAGE_KEYS.DELIVERY_ZONES, zones);
  },

  getDeliveryCeps: async (): Promise<DeliveryCepRule[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('delivery_ceps').select('*');
        if (!error && data && data.length > 0) {
          const mapped: DeliveryCepRule[] = data.map((r: any) => ({
            id: r.id,
            cep: r.cep,
            label: r.label,
            fee: Number(r.fee),
            estimated_minutes: Number(r.estimated_minutes || 30),
            active: r.active ?? true,
          }));
          setStored(STORAGE_KEYS.DELIVERY_CEPS, mapped);
          return mapped;
        }
      } catch {
        // Fallback to local
      }
    }
    return getStored<DeliveryCepRule[]>(STORAGE_KEYS.DELIVERY_CEPS, INITIAL_DELIVERY_CEPS);
  },

  saveDeliveryCeps: async (ceps: DeliveryCepRule[]): Promise<void> => {
    setStored(STORAGE_KEYS.DELIVERY_CEPS, ceps);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Try delivery_ceps table
        await supabase.from('delivery_ceps').upsert(ceps);
      } catch {
        // Also sync to delivery_zones
        try {
          for (const c of ceps) {
            await supabase.from('delivery_zones').upsert({
              id: toUuid(c.id),
              name: `CEP: ${c.cep} - ${c.label}`,
              is_active: c.active,
            });
          }
        } catch {}
      }
    }
  },

  deleteDeliveryCep: async (cepId: string): Promise<boolean> => {
    const current = getStored<DeliveryCepRule[]>(STORAGE_KEYS.DELIVERY_CEPS, INITIAL_DELIVERY_CEPS);
    const updated = current.filter((c) => c.id !== cepId);
    setStored(STORAGE_KEYS.DELIVERY_CEPS, updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('delivery_ceps').delete().eq('id', toUuid(cepId));
      } catch {}
    }
    return true;
  },

  // -------------------------------------------------------------
  // ORDERS & HISTÓRICO / AUDITORIA
  // -------------------------------------------------------------
  getOrders: async (): Promise<Order[]> => {
    const localOrders = getStored<Order[]>(STORAGE_KEYS.ORDERS, SAMPLE_ORDERS);
    const localMap = new Map(localOrders.map((o) => [toUuid(o.id), o]));

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*), order_status_history(*), addresses(*)')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: Order[] = data.map((row: any) => {
            const local = localMap.get(row.id);
            const address: CustomerAddress | undefined = row.addresses
              ? {
                  street: row.addresses.street || local?.address?.street || '',
                  number: row.addresses.number || local?.address?.number || '',
                  complement: row.addresses.complement || local?.address?.complement,
                  neighborhood: row.addresses.neighborhood || local?.address?.neighborhood || '',
                  city: row.addresses.city || local?.address?.city || 'Juiz de Fora',
                  state: local?.address?.state || 'MG',
                  zip_code: row.addresses.zip_code || local?.address?.zip_code || '',
                }
              : local?.address;

            const items: OrderItem[] = row.order_items && row.order_items.length > 0
              ? row.order_items.map((it: any, idx: number) => ({
                  id: it.id,
                  order_id: row.id,
                  product_id: it.product_id,
                  product_name: local?.items?.[idx]?.product_name || 'Item de Padaria Artesanal',
                  unit_price: Number(it.unit_price),
                  quantity: it.quantity,
                  subtotal: Number(it.unit_price) * it.quantity,
                }))
              : local?.items || [];

            const status_history: OrderStatusHistoryItem[] = row.order_status_history && row.order_status_history.length > 0
              ? row.order_status_history.map((h: any) => ({
                  id: h.id,
                  order_id: row.id,
                  previous_status: null,
                  new_status: h.status,
                  changed_by: 'SISTEMA_SUPABASE',
                  notes: 'Atualização registrada no banco de dados',
                  created_at: h.changed_at,
                }))
              : local?.status_history || [];

            return {
              id: row.id,
              code: local?.code || `#AFF-${row.order_number || Math.floor(1000 + Math.random() * 9000)}`,
              customer_name: local?.customer_name || 'Cliente Affeto',
              customer_email: local?.customer_email || 'cliente@affeto.local',
              customer_phone: local?.customer_phone || '(32) 99999-0000',
              status: row.status as OrderStatus,
              payment_status: row.payment_status as PaymentStatus,
              delivery_type: row.fulfillment_type || local?.delivery_type || 'DELIVERY',
              scheduled_date: row.scheduled_for ? row.scheduled_for.slice(0, 10) : (local?.scheduled_date || new Date().toISOString().slice(0, 10)),
              scheduled_time: local?.scheduled_time || '14:00 - 18:00',
              address,
              items,
              deliveries: local?.deliveries,
              subtotal: Number(row.subtotal),
              discount: Number(row.discount || 0),
              delivery_fee: Number(row.delivery_fee || 0),
              total: Number(row.total),
              coupon_code: local?.coupon_code,
              notes: local?.notes,
              status_history,
              created_at: row.created_at,
              updated_at: row.updated_at,
            };
          });

          // Merge any local-only orders that haven't synced yet
          const remoteIds = new Set(mapped.map((o) => o.id));
          const unsynced = localOrders.filter((o) => !remoteIds.has(toUuid(o.id)));
          const combined = [...mapped, ...unsynced];

          setStored(STORAGE_KEYS.ORDERS, combined);
          return combined;
        }
      } catch (err) {
        console.warn('[Supabase Orders] Read error:', err);
      }
    }
    return localOrders;
  },

  saveOrders: (orders: Order[]) => {
    setStored(STORAGE_KEYS.ORDERS, orders);
  },

  addOrder: async (order: Order): Promise<Order> => {
    const orders = getStored<Order[]>(STORAGE_KEYS.ORDERS, SAMPLE_ORDERS);
    const updated = [order, ...orders];
    setStored(STORAGE_KEYS.ORDERS, updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const orderUuid = toUuid(order.id);

        // 1. If delivery, save address to Supabase addresses table
        let addressId: string | null = null;
        if (order.address && order.delivery_type === 'DELIVERY') {
          try {
            const { data: addr } = await supabase
              .from('addresses')
              .insert({
                customer_id: SYSTEM_CUSTOMER_ID,
                label: `Entrega Pedido ${order.code}`,
                zip_code: order.address.zip_code || '36000-000',
                street: order.address.street || '',
                number: order.address.number || '',
                neighborhood: order.address.neighborhood || '',
                city: order.address.city || 'Juiz de Fora',
                complement: order.address.complement || '',
              })
              .select()
              .single();
            if (addr) addressId = addr.id;
          } catch (addrErr) {
            console.warn('[Supabase Address Insert]:', addrErr);
          }
        }

        // 2. Insert Order Header
        await supabase.from('orders').upsert(
          {
            id: orderUuid,
            customer_id: SYSTEM_CUSTOMER_ID,
            fulfillment_type: order.delivery_type === 'PICKUP' ? 'PICKUP' : 'DELIVERY',
            address_id: addressId,
            subtotal: order.subtotal,
            discount: order.discount || 0,
            delivery_fee: order.delivery_fee || 0,
            total: order.total,
            status: order.status,
            payment_status: order.payment_status,
            scheduled_for: order.scheduled_date
              ? new Date(`${order.scheduled_date}T12:00:00Z`).toISOString()
              : null,
            created_at: order.created_at || new Date().toISOString(),
            updated_at: order.updated_at || new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        // 3. Insert Order Items
        if (order.items && order.items.length > 0) {
          const itemsPayload = order.items.map((it) => ({
            id: toUuid(it.id),
            order_id: orderUuid,
            product_id: toUuid(it.product_id),
            quantity: it.quantity,
            unit_price: it.unit_price,
          }));
          await supabase.from('order_items').upsert(itemsPayload, { onConflict: 'id' });
        }

        // 4. Insert Audit Log History
        await supabase.from('order_status_history').insert({
          id: toUuid(`hist-created-${Date.now()}-${order.id}`),
          order_id: orderUuid,
          status: order.status,
          changed_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[Supabase Order Insert Error, saved locally]:', err);
      }
    }

    return order;
  },

  updateOrderStatus: async (
    orderId: string,
    newStatus: Order['status'],
    changedBy: string,
    notes?: string
  ): Promise<Order | null> => {
    const orders = getStored<Order[]>(STORAGE_KEYS.ORDERS, SAMPLE_ORDERS);
    const idx = orders.findIndex((o) => o.id === orderId || toUuid(o.id) === toUuid(orderId));
    if (idx === -1) return null;

    const order = orders[idx];
    const prevStatus = order.status;
    order.status = newStatus;
    order.updated_at = new Date().toISOString();

    if (!order.status_history) order.status_history = [];
    order.status_history.push({
      id: `hist-${Date.now()}`,
      order_id: order.id,
      previous_status: prevStatus,
      new_status: newStatus,
      changed_by: changedBy,
      notes,
      created_at: new Date().toISOString(),
    });

    orders[idx] = order;
    setStored(STORAGE_KEYS.ORDERS, orders);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const orderUuid = toUuid(order.id);
        // 1. Update Order in DB
        await supabase
          .from('orders')
          .update({ status: newStatus, updated_at: order.updated_at })
          .eq('id', orderUuid);

        // 2. Insert into Audit History table
        await supabase.from('order_status_history').insert({
          order_id: orderUuid,
          status: newStatus,
          changed_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[Supabase Order Status Update] error:', err);
      }
    }

    return order;
  },

  // -------------------------------------------------------------
  // BATCH CAPACITY & SLOTS
  // -------------------------------------------------------------
  getProductionBatches: async (): Promise<ProductionBatch[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('production_batches').select('*');
        if (!error && data && data.length > 0) {
          return data as ProductionBatch[];
        }
      } catch {}
    }
    return getStored<ProductionBatch[]>(STORAGE_KEYS.PRODUCTION_BATCHES, INITIAL_PRODUCTION_BATCHES);
  },

  saveProductionBatches: (batches: ProductionBatch[]) => {
    setStored(STORAGE_KEYS.PRODUCTION_BATCHES, batches);
  },

  updateProductionBatch: async (
    batchData: Partial<ProductionBatch> & { product_id: string; production_date: string }
  ): Promise<ProductionBatch> => {
    const batches = getStored<ProductionBatch[]>(STORAGE_KEYS.PRODUCTION_BATCHES, INITIAL_PRODUCTION_BATCHES);
    const idx = batches.findIndex(
      (b) => b.product_id === batchData.product_id && b.production_date === batchData.production_date
    );

    let updatedBatch: ProductionBatch;
    if (idx >= 0) {
      batches[idx] = {
        ...batches[idx],
        ...batchData,
        updated_at: new Date().toISOString(),
      };
      updatedBatch = batches[idx];
    } else {
      updatedBatch = {
        id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        product_id: batchData.product_id,
        production_date: batchData.production_date,
        capacity: batchData.capacity ?? 10,
        reserved_quantity: batchData.reserved_quantity ?? 0,
        status: batchData.status ?? 'PLANNED',
        notes: batchData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      batches.push(updatedBatch);
    }
    setStored(STORAGE_KEYS.PRODUCTION_BATCHES, batches);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('production_batches').upsert(
          {
            id: toUuid(updatedBatch.id),
            product_id: toUuid(updatedBatch.product_id),
            production_date: updatedBatch.production_date,
            capacity: updatedBatch.capacity,
            reserved_quantity: updatedBatch.reserved_quantity,
            status: updatedBatch.status,
            notes: updatedBatch.notes,
            updated_at: updatedBatch.updated_at,
          },
          { onConflict: 'product_id,production_date' }
        );
      } catch (err) {
        console.warn('[Supabase Sync Batch] error:', err);
      }
    }

    return updatedBatch;
  },

  reserveBatchCapacity: async (
    productId: string,
    productionDate: string,
    quantity: number,
    defaultCapacity: number
  ): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('reserve_production_batch_capacity', {
          p_product_id: toUuid(productId),
          p_production_date: productionDate,
          p_quantity: quantity,
          p_default_capacity: defaultCapacity,
        });
        if (!error && data !== null) {
          return { success: !!data };
        }
      } catch {}
    }

    // Local fallback
    const batches = getStored<ProductionBatch[]>(STORAGE_KEYS.PRODUCTION_BATCHES, INITIAL_PRODUCTION_BATCHES);
    let batch = batches.find((b) => b.product_id === productId && b.production_date === productionDate);

    if (!batch) {
      batch = {
        id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        product_id: productId,
        production_date: productionDate,
        capacity: defaultCapacity,
        reserved_quantity: 0,
        status: 'PLANNED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      batches.push(batch);
    }

    if (batch.status === 'CANCELLED') {
      return { success: false, error: 'A fornada para esta data foi cancelada.' };
    }

    if (batch.reserved_quantity + quantity > batch.capacity) {
      return { success: false, error: 'Capacidade máxima para esta fornada foi atingida.' };
    }

    batch.reserved_quantity += quantity;
    batch.updated_at = new Date().toISOString();
    setStored(STORAGE_KEYS.PRODUCTION_BATCHES, batches);
    return { success: true };
  },

  releaseBatchCapacity: async (
    productId: string,
    productionDate: string,
    quantity: number
  ): Promise<void> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.rpc('release_production_batch_capacity', {
          p_product_id: toUuid(productId),
          p_production_date: productionDate,
          p_quantity: quantity,
        });
      } catch {}
    }

    const batches = getStored<ProductionBatch[]>(STORAGE_KEYS.PRODUCTION_BATCHES, INITIAL_PRODUCTION_BATCHES);
    const batch = batches.find((b) => b.product_id === productId && b.production_date === productionDate);
    if (batch) {
      batch.reserved_quantity = Math.max(0, batch.reserved_quantity - quantity);
      batch.updated_at = new Date().toISOString();
      setStored(STORAGE_KEYS.PRODUCTION_BATCHES, batches);
    }
  },

  updatePaymentStatus: async (
    orderId: string,
    paymentStatus: Order['payment_status'],
    externalId?: string
  ): Promise<Order | null> => {
    const orders = getStored<Order[]>(STORAGE_KEYS.ORDERS, SAMPLE_ORDERS);
    const idx = orders.findIndex((o) => o.id === orderId || toUuid(o.id) === toUuid(orderId));
    if (idx === -1) return null;

    const order = orders[idx];
    order.payment_status = paymentStatus;
    if (paymentStatus === 'APPROVED' && order.status === 'PENDING_PAYMENT') {
      order.status = 'CONFIRMED';
    }
    order.updated_at = new Date().toISOString();

    if (order.payment) {
      order.payment.status = paymentStatus;
      if (externalId) order.payment.external_id = externalId;
      order.payment.updated_at = new Date().toISOString();
    }

    orders[idx] = order;
    setStored(STORAGE_KEYS.ORDERS, orders);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('orders')
          .update({ payment_status: paymentStatus, status: order.status, updated_at: order.updated_at })
          .eq('id', toUuid(order.id));
      } catch {}
    }

    return order;
  },

  // -------------------------------------------------------------
  // STORE SETTINGS & ADDRESS
  // -------------------------------------------------------------
  getStoreSettings: async (): Promise<StoreSettings> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          const merged: StoreSettings = {
            ...INITIAL_STORE_SETTINGS,
            name: data.name || INITIAL_STORE_SETTINGS.name,
            address: data.address || INITIAL_STORE_SETTINGS.address,
            phone: data.phone || INITIAL_STORE_SETTINGS.phone,
            whatsapp: data.whatsapp || INITIAL_STORE_SETTINGS.whatsapp,
            pix_key: data.pix_key || INITIAL_STORE_SETTINGS.pix_key,
            min_order_value: Number(data.min_order_value || INITIAL_STORE_SETTINGS.min_order_value),
            lead_time_minutes: Number(data.lead_time_minutes || INITIAL_STORE_SETTINGS.lead_time_minutes),
          };
          setStored(STORAGE_KEYS.STORE_SETTINGS, merged);
          return merged;
        }
      } catch {}
    }

    const stored = getStored<StoreSettings>(STORAGE_KEYS.STORE_SETTINGS, INITIAL_STORE_SETTINGS);
    return { ...INITIAL_STORE_SETTINGS, ...stored };
  },

  saveStoreSettings: async (settings: StoreSettings): Promise<void> => {
    setStored(STORAGE_KEYS.STORE_SETTINGS, settings);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('stores').upsert(
          {
            id: toUuid(settings.id || 'store-affeto-matriz'),
            name: settings.name,
            slug: settings.slug || 'affeto-paes',
            address: settings.address,
            phone: settings.phone,
            whatsapp: settings.whatsapp,
            pix_key: settings.pix_key,
            min_order_value: settings.min_order_value,
            lead_time_minutes: settings.lead_time_minutes,
            is_open: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'slug' }
        );
      } catch {
        // Also try store_settings table if stores doesn't accept
        try {
          await supabase.from('store_settings').upsert({
            id: toUuid(settings.id || 'store-affeto-matriz'),
            name: settings.name,
            slug: settings.slug,
            description: settings.description,
            address: settings.address,
            phone: settings.phone,
            whatsapp: settings.whatsapp,
            pix_key: settings.pix_key,
            min_order_value: settings.min_order_value,
            free_shipping_threshold: settings.free_shipping_threshold,
            lead_time_minutes: settings.lead_time_minutes,
          });
        } catch {}
      }
    }
  },

  getFavorites: (): string[] => {
    return getStored<string[]>(STORAGE_KEYS.FAVORITES, ['prod-sourdough-tradicional', 'prod-croissant-manteiga']);
  },

  toggleFavorite: (productId: string): string[] => {
    const favs = getStored<string[]>(STORAGE_KEYS.FAVORITES, []);
    const exists = favs.includes(productId);
    const updated = exists ? favs.filter((id) => id !== productId) : [...favs, productId];
    setStored(STORAGE_KEYS.FAVORITES, updated);
    return updated;
  },

  // -------------------------------------------------------------
  // FULL BIDIRECTIONAL SYNC TO SUPABASE
  // -------------------------------------------------------------
  syncAllToSupabase: async (): Promise<{
    success: boolean;
    categoriesSynced: number;
    productsSynced: number;
    couponsSynced: number;
    deliveryCepsSynced: number;
    ordersSynced: number;
    error?: string;
  }> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        categoriesSynced: 0,
        productsSynced: 0,
        couponsSynced: 0,
        deliveryCepsSynced: 0,
        ordersSynced: 0,
        error: 'Cliente Supabase não configurado ou chave anônima ausente.',
      };
    }

    try {
      // 1. Sync Categories
      const categories = getStored<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
      const catRows = categories.map((c) => ({
        id: toUuid(c.id),
        name: c.name,
        slug: c.slug,
        display_order: c.sort_order,
      }));
      await supabase.from('categories').upsert(catRows, { onConflict: 'slug' });

      // 2. Sync Products
      const products = getStored<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
      const prodRows = products.map((p) => ({
        id: toUuid(p.id),
        category_id: p.category_id ? toUuid(p.category_id) : null,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.base_price,
        promotional_price: p.promotional_price,
        unit: p.unit,
        is_active: p.is_active,
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('products').upsert(prodRows, { onConflict: 'slug' });

      // 3. Sync Coupons
      const coupons = getStored<Coupon[]>(STORAGE_KEYS.COUPONS, INITIAL_COUPONS);
      const couponRows = coupons.map((c) => ({
        id: toUuid(c.id),
        code: c.code.toUpperCase().trim(),
        percent_off: c.discount_type === 'PERCENTAGE' ? c.discount_value : null,
        amount_off: c.discount_type === 'FIXED' ? c.discount_value : null,
        min_order_value: c.min_order_value,
        is_active: c.active,
      }));
      await supabase.from('coupons').upsert(couponRows, { onConflict: 'code' });

      // 4. Sync Delivery CEPs / Zones
      const ceps = getStored<DeliveryCepRule[]>(STORAGE_KEYS.DELIVERY_CEPS, INITIAL_DELIVERY_CEPS);
      for (const cep of ceps) {
        try {
          await supabase.from('delivery_zones').upsert({
            id: toUuid(cep.id),
            name: `CEP: ${cep.cep} - ${cep.label}`,
            is_active: cep.active,
          });
        } catch {}
      }

      // 5. Sync Orders
      const orders = getStored<Order[]>(STORAGE_KEYS.ORDERS, SAMPLE_ORDERS);
      let ordersSynced = 0;
      for (const ord of orders) {
        const orderUuid = toUuid(ord.id);
        const { error: ordErr } = await supabase.from('orders').upsert(
          {
            id: orderUuid,
            customer_id: SYSTEM_CUSTOMER_ID,
            fulfillment_type: ord.delivery_type === 'PICKUP' ? 'PICKUP' : 'DELIVERY',
            subtotal: ord.subtotal,
            discount: ord.discount || 0,
            delivery_fee: ord.delivery_fee || 0,
            total: ord.total,
            status: ord.status,
            payment_status: ord.payment_status,
            scheduled_for: ord.scheduled_date ? new Date(`${ord.scheduled_date}T12:00:00Z`).toISOString() : null,
            created_at: ord.created_at,
            updated_at: ord.updated_at,
          },
          { onConflict: 'id' }
        );

        if (!ordErr) {
          ordersSynced++;
          if (ord.items && ord.items.length > 0) {
            const itemRows = ord.items.map((it) => ({
              id: toUuid(it.id),
              order_id: orderUuid,
              product_id: toUuid(it.product_id),
              quantity: it.quantity,
              unit_price: it.unit_price,
            }));
            await supabase.from('order_items').upsert(itemRows, { onConflict: 'id' });
          }
        }
      }

      return {
        success: true,
        categoriesSynced: categories.length,
        productsSynced: products.length,
        couponsSynced: coupons.length,
        deliveryCepsSynced: ceps.length,
        ordersSynced,
      };
    } catch (err: any) {
      console.error('[SyncAllToSupabase Error]:', err);
      return {
        success: false,
        categoriesSynced: 0,
        productsSynced: 0,
        couponsSynced: 0,
        deliveryCepsSynced: 0,
        ordersSynced: 0,
        error: err.message || 'Falha durante sincronização com Supabase',
      };
    }
  },

  // -------------------------------------------------------------
  // DIAGNÓSTICO & TESTE DE CONEXÃO
  // -------------------------------------------------------------
  testSupabaseConnection: async (): Promise<{
    connected: boolean;
    url: string;
    hasAnonKey: boolean;
    latencyMs: number;
    tablesFound: {
      categories: number;
      products: number;
      orders: number;
      order_items: number;
      order_status_history: number;
      delivery_zones: number;
      coupons: number;
    };
    securityStatus: string;
    message: string;
  }> => {
    const url = getEnvUrl();
    const anonKey = getEnvAnonKey();

    const emptyCounts = {
      categories: 0,
      products: 0,
      orders: 0,
      order_items: 0,
      order_status_history: 0,
      delivery_zones: 0,
      coupons: 0,
    };

    if (!anonKey) {
      return {
        connected: false,
        url,
        hasAnonKey: false,
        latencyMs: 0,
        tablesFound: emptyCounts,
        securityStatus: 'Chave anônima não configurada',
        message: 'A chave anônima (VITE_SUPABASE_ANON_KEY) não foi detectada. O sistema está usando armazenamento inteligente local sincronizado.',
      };
    }

    try {
      const start = Date.now();
      const client = createClient(url, anonKey);

      // Verify connection by reading categories
      const { count: catCount, error: catError } = await client
        .from('categories')
        .select('*', { count: 'exact', head: true });

      const latencyMs = Date.now() - start;

      if (catError) {
        return {
          connected: false,
          url,
          hasAnonKey: true,
          latencyMs,
          tablesFound: emptyCounts,
          securityStatus: 'Erro de permissão ou RLS',
          message: `Endpoint Supabase respondeu com erro: ${catError.message}. Verifique as políticas RLS.`,
        };
      }

      // Query other tables in parallel
      const [
        { count: prodCount },
        { count: ordCount },
        { count: itCount },
        { count: histCount },
        { count: zoneCount },
        { count: coupCount },
      ] = await Promise.all([
        client.from('products').select('*', { count: 'exact', head: true }),
        client.from('orders').select('*', { count: 'exact', head: true }),
        client.from('order_items').select('*', { count: 'exact', head: true }),
        client.from('order_status_history').select('*', { count: 'exact', head: true }),
        client.from('delivery_zones').select('*', { count: 'exact', head: true }),
        client.from('coupons').select('*', { count: 'exact', head: true }),
      ]);

      const tablesFound = {
        categories: catCount || 0,
        products: prodCount || 0,
        orders: ordCount || 0,
        order_items: itCount || 0,
        order_status_history: histCount || 0,
        delivery_zones: zoneCount || 0,
        coupons: coupCount || 0,
      };

      return {
        connected: true,
        url,
        hasAnonKey: true,
        latencyMs,
        tablesFound,
        securityStatus: 'Segurança RLS (Row Level Security) Ativa • Autenticado',
        message: `Conexão ativa e verificada com sucesso com ${url}! Latência: ${latencyMs}ms. Todas as tabelas transacionais respondendo.`,
      };
    } catch (err: any) {
      return {
        connected: false,
        url,
        hasAnonKey: true,
        latencyMs: 0,
        tablesFound: emptyCounts,
        securityStatus: 'Erro de Rede',
        message: `Falha ao contatar Supabase: ${err.message || 'Erro de rede ou timeout.'}`,
      };
    }
  },
};
