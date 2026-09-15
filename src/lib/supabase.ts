import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
  INITIAL_DELIVERY_ZONES,
  INITIAL_PRODUCTS,
  INITIAL_STORE_SETTINGS,
  SAMPLE_ORDERS,
} from '../data/mockData';
import { Category, Coupon, DeliveryZone, Order, Product, StoreSettings } from '../types';

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
  ORDERS: 'affeto_orders_v2',
  STORE_SETTINGS: 'affeto_store_v2',
  FAVORITES: 'affeto_favorites_v2',
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
    return getStored<StoreSettings>(STORAGE_KEYS.STORE_SETTINGS, INITIAL_STORE_SETTINGS);
  },

  saveStoreSettings: (settings: StoreSettings) => {
    setStored(STORAGE_KEYS.STORE_SETTINGS, settings);
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
