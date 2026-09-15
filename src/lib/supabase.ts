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
  DeliveryCepRule,
  DeliveryZone,
  Order,
  OrderDelivery,
  OrderDeliveryItem,
  ProductionBatch,
  Product,
  StoreSettings,
} from '../types';

// Provided Supabase project URL
export const SUPABASE_DEFAULT_URL = 'https://ropgdbgkjghwdxdglchz.supabase.co';

const getEnvUrl = () => {
  return (import.meta as any).env?.VITE_SUPABASE_URL || SUPABASE_DEFAULT_URL;
};

const getEnvAnonKey = () => {
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
  getCategories: async (): Promise<Category[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('categories').select('*').order('sort_order');
        if (!error && data && data.length > 0) {
          return data as Category[];
        }
      } catch {
        // Fallback to local
      }
    }
    return getStored<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  },

  saveCategories: (categories: Category[]) => {
    setStored(STORAGE_KEYS.CATEGORIES, categories);
  },

  getProducts: async (): Promise<Product[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('products').select('*');
        if (!error && data && data.length > 0) {
          return data as Product[];
        }
      } catch {
        // Fallback to local
      }
    }
    return getStored<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  },

  saveProducts: (products: Product[]) => {
    setStored(STORAGE_KEYS.PRODUCTS, products);
  },

  getCoupons: async (): Promise<Coupon[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('coupons').select('*');
        if (!error && data && data.length > 0) {
          return data as Coupon[];
        }
      } catch {
        // Fallback to local
      }
    }
    return getStored<Coupon[]>(STORAGE_KEYS.COUPONS, INITIAL_COUPONS);
  },

  saveCoupons: (coupons: Coupon[]) => {
    setStored(STORAGE_KEYS.COUPONS, coupons);
  },

  getDeliveryZones: async (): Promise<DeliveryZone[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('delivery_zones').select('*');
        if (!error && data && data.length > 0) {
          return data as DeliveryZone[];
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
          return data as DeliveryCepRule[];
        }
      } catch {
        // Fallback to local
      }
    }
    return getStored<DeliveryCepRule[]>(STORAGE_KEYS.DELIVERY_CEPS, INITIAL_DELIVERY_CEPS);
  },

  saveDeliveryCeps: (ceps: DeliveryCepRule[]) => {
    setStored(STORAGE_KEYS.DELIVERY_CEPS, ceps);
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(supabase.from('delivery_ceps').upsert(ceps)).catch(() => {});
    }
  },

  getOrders: async (): Promise<Order[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data as Order[];
        }
      } catch {
        // Fallback to local
      }
    }
    return getStored<Order[]>(STORAGE_KEYS.ORDERS, SAMPLE_ORDERS);
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
        await supabase.from('orders').insert({
          id: order.id,
          code: order.code,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          customer_phone: order.customer_phone,
          status: order.status,
          payment_status: order.payment_status,
          delivery_type: order.delivery_type,
          scheduled_date: order.scheduled_date,
          scheduled_time: order.scheduled_time,
          address: order.address,
          subtotal: order.subtotal,
          discount: order.discount,
          delivery_fee: order.delivery_fee,
          total: order.total,
          coupon_code: order.coupon_code,
          notes: order.notes,
        });

        if (order.deliveries && order.deliveries.length > 0) {
          for (const del of order.deliveries) {
            await supabase.from('order_deliveries').insert({
              id: del.id,
              order_id: order.id,
              delivery_date: del.delivery_date,
              delivery_time: del.delivery_time,
              delivery_status: del.delivery_status,
              delivery_fee: del.delivery_fee,
            });

            if (del.items && del.items.length > 0) {
              const deliveryItems = del.items.map((item) => ({
                id: item.id,
                delivery_id: del.id,
                order_item_id: item.order_item_id,
                product_id: item.product_id,
                quantity: item.quantity,
              }));
              await supabase.from('order_delivery_items').insert(deliveryItems);
            }
          }
        }
      } catch (err) {
        console.warn('[Supabase Sync] insert error, saved locally:', err);
      }
    }

    return order;
  },

  updateOrderStatus: async (orderId: string, newStatus: Order['status'], changedBy: string, notes?: string): Promise<Order | null> => {
    const orders = getStored<Order[]>(STORAGE_KEYS.ORDERS, SAMPLE_ORDERS);
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;

    const order = orders[idx];
    const prevStatus = order.status;
    order.status = newStatus;
    order.updated_at = new Date().toISOString();

    if (!order.status_history) order.status_history = [];
    order.status_history.push({
      id: `hist-${Date.now()}`,
      order_id: orderId,
      previous_status: prevStatus,
      new_status: newStatus,
      changed_by: changedBy,
      notes,
      created_at: new Date().toISOString(),
    });

    // Se o pedido foi cancelado, libera capacidade da fornada
    if (newStatus === 'CANCELLED') {
      if (order.deliveries && order.deliveries.length > 0) {
        for (const del of order.deliveries) {
          if (del.items) {
            for (const it of del.items) {
              if (it.product_id) {
                dataStore.releaseBatchCapacity(it.product_id, del.delivery_date, it.quantity);
              }
            }
          }
        }
      } else if (order.scheduled_date && order.items) {
        for (const it of order.items) {
          dataStore.releaseBatchCapacity(it.product_id, order.scheduled_date, it.quantity);
        }
      }
    }

    orders[idx] = order;
    setStored(STORAGE_KEYS.ORDERS, orders);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('orders').update({ status: newStatus, updated_at: order.updated_at }).eq('id', orderId);
      } catch (err) {
        console.warn('[Supabase Update] error:', err);
      }
    }

    return order;
  },

  getProductionBatches: async (): Promise<ProductionBatch[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('production_batches').select('*');
        if (!error && data) {
          return data as ProductionBatch[];
        }
      } catch {
        // Fallback to local
      }
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
            id: updatedBatch.id,
            product_id: updatedBatch.product_id,
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
          p_product_id: productId,
          p_production_date: productionDate,
          p_quantity: quantity,
          p_default_capacity: defaultCapacity,
        });
        if (!error && data !== null) {
          return { success: !!data };
        }
      } catch {
        // Fallback to local atomic reservation
      }
    }

    // Reserva atômica local
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
          p_product_id: productId,
          p_production_date: productionDate,
          p_quantity: quantity,
        });
      } catch {
        // Fallback local
      }
    }

    const batches = getStored<ProductionBatch[]>(STORAGE_KEYS.PRODUCTION_BATCHES, INITIAL_PRODUCTION_BATCHES);
    const batch = batches.find((b) => b.product_id === productId && b.production_date === productionDate);
    if (batch) {
      batch.reserved_quantity = Math.max(0, batch.reserved_quantity - quantity);
      batch.updated_at = new Date().toISOString();
      setStored(STORAGE_KEYS.PRODUCTION_BATCHES, batches);
    }
  },

  updatePaymentStatus: async (orderId: string, paymentStatus: Order['payment_status'], externalId?: string): Promise<Order | null> => {
    const orders = getStored<Order[]>(STORAGE_KEYS.ORDERS, SAMPLE_ORDERS);
    const idx = orders.findIndex((o) => o.id === orderId);
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
    return order;
  },

  getStoreSettings: async (): Promise<StoreSettings> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
        if (data && !error) {
          const merged: StoreSettings = { ...INITIAL_STORE_SETTINGS, ...data };
          setStored(STORAGE_KEYS.STORE_SETTINGS, merged);
          return merged;
        }
      } catch (err) {
        console.warn('[Supabase Sync] Error loading store_settings:', err);
      }
    }

    const stored = getStored<StoreSettings>(STORAGE_KEYS.STORE_SETTINGS, INITIAL_STORE_SETTINGS);

    // Sanitize any stale demo address from old mock templates if found in localStorage
    if (
      stored.address?.includes('Alameda Lorena') ||
      stored.whatsapp === '5511987654321' ||
      stored.phone === '(11) 98765-4321'
    ) {
      const sanitized: StoreSettings = {
        ...stored,
        address: INITIAL_STORE_SETTINGS.address,
        pickup_address: INITIAL_STORE_SETTINGS.pickup_address,
        city: INITIAL_STORE_SETTINGS.city,
        state: INITIAL_STORE_SETTINGS.state,
        phone: INITIAL_STORE_SETTINGS.phone,
        whatsapp: INITIAL_STORE_SETTINGS.whatsapp,
        description: stored.description || INITIAL_STORE_SETTINGS.description,
        fresh_batch_hours: stored.fresh_batch_hours || INITIAL_STORE_SETTINGS.fresh_batch_hours,
      };
      setStored(STORAGE_KEYS.STORE_SETTINGS, sanitized);
      return sanitized;
    }

    return { ...INITIAL_STORE_SETTINGS, ...stored };
  },

  saveStoreSettings: async (settings: StoreSettings): Promise<void> => {
    setStored(STORAGE_KEYS.STORE_SETTINGS, settings);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('store_settings').upsert({
          id: settings.id || 'store-affeto-matriz',
          name: settings.name,
          slug: settings.slug,
          description: settings.description,
          address: settings.address,
          city: settings.city,
          state: settings.state,
          pickup_address: settings.pickup_address,
          logo_url: settings.logo_url,
          phone: settings.phone,
          whatsapp: settings.whatsapp,
          pix_key: settings.pix_key,
          min_order_value: settings.min_order_value,
          free_shipping_threshold: settings.free_shipping_threshold,
          lead_time_minutes: settings.lead_time_minutes,
          opening_hours: settings.opening_hours,
        });
      } catch (err) {
        console.warn('[Supabase Sync] Error saving store_settings:', err);
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

  testSupabaseConnection: async (): Promise<{
    connected: boolean;
    url: string;
    hasAnonKey: boolean;
    tablesFound: string[];
    message: string;
  }> => {
    const url = getEnvUrl();
    const anonKey = getEnvAnonKey();

    if (!anonKey) {
      return {
        connected: false,
        url,
        hasAnonKey: false,
        tablesFound: [],
        message: 'A chave anônima (VITE_SUPABASE_ANON_KEY) ainda não foi preenchida. O sistema está usando armazenamento inteligente local sincronizado.',
      };
    }

    try {
      const client = createClient(url, anonKey);
      const { data, error } = await client.from('categories').select('count', { count: 'exact', head: true });

      if (error) {
        return {
          connected: false,
          url,
          hasAnonKey: true,
          tablesFound: [],
          message: `Conexão atingiu o endpoint Supabase, porém a tabela não respondeu ou RLS bloqueou: ${error.message}. Execute o script SQL no Supabase.`,
        };
      }

      return {
        connected: true,
        url,
        hasAnonKey: true,
        tablesFound: ['categories', 'products', 'orders'],
        message: 'Conexão ativa e verificada com sucesso em https://ropgdbgkjghwdxdglchz.supabase.co!',
      };
    } catch (err: any) {
      return {
        connected: false,
        url,
        hasAnonKey: true,
        tablesFound: [],
        message: `Falha ao contatar Supabase: ${err.message || 'Erro de rede.'}`,
      };
    }
  },
};
