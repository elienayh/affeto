import { calculateOrderPricing } from '../lib/pricingEngine';
import { dataStore } from '../lib/supabase';
import {
  CustomerAddress,
  DeliveryType,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../types';

export interface CreateOrderInput {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_type: DeliveryType;
  delivery_zone_id?: string;
  address?: CustomerAddress;
  scheduled_date: string;
  scheduled_time: string;
  coupon_code?: string;
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    selected_options?: Array<{
      option_id: string;
      value_id: string;
    }>;
    notes?: string;
  }>;
  payment_method: PaymentMethod;
}

export const orderService = {
  createOrder: async (input: CreateOrderInput): Promise<{ order?: Order; error?: string }> => {
    // 1. Fetch live products, coupons, and zones
    const products = await dataStore.getProducts();
    const coupons = await dataStore.getCoupons();
    const zones = await dataStore.getDeliveryZones();

    // 2. Validate Stock (Section 5.2 - Concurrency & Stock Check)
    for (const it of input.items) {
      const prod = products.find((p) => p.id === it.product_id);
      if (!prod) {
        return { error: `Produto não encontrado: ${it.product_id}` };
      }
      if (prod.track_stock && prod.stock_quantity < it.quantity) {
        return {
          error: `Estoque insuficiente para "${prod.name}". Disponível: ${prod.stock_quantity} unidades.`,
        };
      }
    }

    // 3. Pricing Engine recalculation (Section 5.1 - Single Source of Truth)
    const pricingResult = calculateOrderPricing({
      items: input.items,
      availableProducts: products,
      delivery_type: input.delivery_type,
      delivery_zone_id: input.delivery_zone_id,
      availableZones: zones,
      coupon_code: input.coupon_code,
      availableCoupons: coupons,
    });

    if (pricingResult.error) {
      return { error: pricingResult.error };
    }

    const { breakdown, validatedItems } = pricingResult;

    // 4. Reserve stock / decrement quantity
    for (const vi of validatedItems) {
      if (vi.product.track_stock) {
        vi.product.stock_quantity = Math.max(0, vi.product.stock_quantity - vi.quantity);
      }
    }
    dataStore.saveProducts(products);

    // If coupon was applied, increment usage count
    if (breakdown.coupon_id) {
      const c = coupons.find((cp) => cp.id === breakdown.coupon_id);
      if (c) {
        c.usage_count = (c.usage_count || 0) + 1;
        dataStore.saveCoupons(coupons);
      }
    }

    // 5. Generate Order ID and Code
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `#AFF-${new Date().getFullYear()}-${randomSeq}`;

    const orderItems: OrderItem[] = validatedItems.map((vi, idx) => ({
      id: `item-${orderId}-${idx + 1}`,
      order_id: orderId,
      product_id: vi.product.id,
      product_name: vi.product.name,
      unit_price: vi.unit_price,
      quantity: vi.quantity,
      subtotal: vi.total_price,
      notes: input.items[idx]?.notes,
      options_selected: vi.options_summary.map((os) => ({
        option_id: '',
        option_name: os.option_name,
        value_id: '',
        value_name: os.value_name,
        price_modifier: os.price_modifier,
      })),
    }));

    const nowIso = new Date().toISOString();

    const newOrder: Order = {
      id: orderId,
      code: orderCode,
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      customer_phone: input.customer_phone,
      status: 'PENDING_PAYMENT',
      payment_status: 'PENDING',
      delivery_type: input.delivery_type,
      scheduled_date: input.scheduled_date,
      scheduled_time: input.scheduled_time,
      address: input.delivery_type === 'DELIVERY' ? input.address : undefined,
      items: orderItems,
      subtotal: breakdown.subtotal,
      discount: breakdown.discount,
      delivery_fee: breakdown.delivery_fee,
      total: breakdown.total,
      coupon_code: breakdown.coupon_code,
      notes: input.notes,
      status_history: [
        {
          id: `hist-created-${Date.now()}`,
          order_id: orderId,
          previous_status: null,
          new_status: 'PENDING_PAYMENT',
          changed_by: 'CUSTOMER_CHECKOUT',
          notes: 'Pedido gerado, aguardando confirmação do pagamento via Mercado Pago',
          created_at: nowIso,
        },
      ],
      created_at: nowIso,
      updated_at: nowIso,
    };

    const saved = await dataStore.addOrder(newOrder);
    return { order: saved };
  },

  getOrderById: async (orderId: string): Promise<Order | null> => {
    const orders = await dataStore.getOrders();
    return orders.find((o) => o.id === orderId) || null;
  },

  getOrderByCode: async (code: string): Promise<Order | null> => {
    const orders = await dataStore.getOrders();
    const clean = code.trim().toUpperCase();
    return orders.find((o) => o.code.toUpperCase() === clean) || null;
  },

  getAllOrders: async (): Promise<Order[]> => {
    return dataStore.getOrders();
  },

  updateStatus: async (
    orderId: string,
    newStatus: OrderStatus,
    changedBy: string,
    notes?: string
  ): Promise<Order | null> => {
    return dataStore.updateOrderStatus(orderId, newStatus, changedBy, notes);
  },

  updatePayment: async (
    orderId: string,
    paymentStatus: PaymentStatus,
    externalId?: string
  ): Promise<Order | null> => {
    return dataStore.updatePaymentStatus(orderId, paymentStatus, externalId);
  },
};
