export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ATENDENTE' | 'PRODUCAO' | 'ENTREGADOR' | 'CUSTOMER';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'PICKED_UP'
  | 'CANCELLED';

export type PaymentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REFUNDED';

export type DeliveryType = 'DELIVERY' | 'PICKUP';

export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH_ON_DELIVERY';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order: number;
  active: boolean;
  image_url?: string;
}

export interface ProductOptionValue {
  id: string;
  option_id: string;
  name: string;
  price_modifier: number;
  is_available: boolean;
}

export interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  description?: string;
  required: boolean;
  min_options: number;
  max_options: number;
  values: ProductOptionValue[];
}

export interface ProductScheduleConfig {
  is_scheduled_only: boolean;
  available_days: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  batch_limit: number; // Capacidade máxima por fornada (ex: 10 unidades)
  days_label?: string; // Ex: 'Terças e Sextas'
  min_lead_days?: number; // Antecedência mínima em dias (padrão: 1 dia)
  delivery_window?: string; // Janela/horário de entrega (ex: '14:00 - 18:00')
}

export type ProductionBatchStatus = 'PLANNED' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED';

export interface ProductionBatch {
  id: string;
  product_id: string;
  production_date: string; // YYYY-MM-DD
  capacity: number;
  reserved_quantity: number;
  status: ProductionBatchStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type OrderDeliveryStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderDeliveryItem {
  id: string;
  delivery_id: string;
  order_item_id: string;
  product_id?: string;
  product_name?: string;
  quantity: number;
}

export interface OrderDelivery {
  id: string;
  order_id: string;
  delivery_date: string; // YYYY-MM-DD
  delivery_time: string; // ex: '14:00 - 18:00'
  delivery_status: OrderDeliveryStatus;
  delivery_fee: number;
  items?: OrderDeliveryItem[];
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  promotional_price?: number | null;
  unit: string; // 'unidade' | 'kg' | 'cento' | 'fatia'
  is_active: boolean;
  is_featured: boolean;
  stock_quantity: number;
  track_stock: boolean;
  allergens?: string[];
  tags?: string[];
  image_url: string;
  options?: ProductOption[];
  schedule_config?: ProductScheduleConfig;
  created_at: string;
  updated_at: string;
}

export interface CartItemOptionSelection {
  option_id: string;
  option_name: string;
  value_id: string;
  value_name: string;
  price_modifier: number;
}

export interface CartItem {
  id: string; // unique item uuid (product + specific options combination)
  product_id: string;
  product: Product;
  quantity: number;
  unit_price: number;
  selected_options: CartItemOptionSelection[];
  notes?: string;
  total_item_price: number;
  // Suporte à fornada específica selecionada
  scheduled_batch_date?: string; // YYYY-MM-DD
  scheduled_batch_label?: string; // Ex: "Sexta-feira, 18/09"
  delivery_window?: string; // Ex: "14:00 - 18:00"
}

export interface CustomerAddress {
  id?: string;
  customer_id?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  is_default?: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  min_order_value?: number;
  max_discount?: number;
  usage_limit?: number;
  usage_count: number;
  valid_from: string;
  valid_until: string;
  active: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  neighborhood?: string;
  fee: number;
  estimated_minutes?: number;
  active: boolean;
}

export interface DeliveryCepRule {
  id: string;
  label: string; // Ex: 'Espera Feliz (Centro)' ou 'Espera Feliz (Zona Rural)'
  fee: number; // Preço do frete para esta localidade
  cep?: string; // Opcional para compatibilidade (ex: '36830-000')
  estimated_minutes?: number;
  active: boolean;
}

export interface PricingBreakdown {
  subtotal: number;
  discount: number;
  coupon_code?: string;
  coupon_id?: string;
  delivery_type: DeliveryType;
  delivery_fee: number;
  delivery_location_name?: string;
  zip_code?: string;
  is_cep_allowed?: boolean;
  cep_rule_matched?: DeliveryCepRule;
  total: number;
  items_count: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  notes?: string;
  options_selected?: CartItemOptionSelection[];
}

export interface OrderStatusHistoryItem {
  id: string;
  order_id: string;
  previous_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by: string;
  notes?: string;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  provider: 'MERCADO_PAGO' | 'MANUAL';
  external_id?: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  code: string; // e.g. #AFF-2026-0042
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_id?: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  delivery_type: DeliveryType;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string; // HH:mm or '08:00 - 10:00'
  address?: CustomerAddress;
  delivery_zone_id?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  coupon_code?: string;
  notes?: string;
  payment_method?: PaymentMethod;
  payment?: PaymentRecord;
  deliveries?: OrderDelivery[];
  status_history: OrderStatusHistoryItem[];
  created_at: string;
  updated_at: string;
}

export interface StoreSettings {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address: string;
  city?: string;
  state?: string;
  pickup_address?: string;
  logo_url?: string;
  phone: string;
  whatsapp: string;
  pix_key: string;
  is_open: boolean;
  min_order_value: number;
  free_shipping_threshold?: number;
  opening_hours: {
    day: string;
    open: string;
    close: string;
    is_closed: boolean;
  }[];
  lead_time_minutes: number;
  instagram?: string;
  fresh_batch_hours?: string;
  delivery_schedule_text?: string;
}

// Future Stubs Types (Section 4 of prompt)
export interface LoyaltyAccount {
  id: string;
  customer_id: string;
  points_balance: number;
  lifetime_points: number;
  tier: 'BRONZE' | 'PRATA' | 'OURO' | 'DIAMANTE';
  updated_at: string;
}

export interface CashbackAccount {
  id: string;
  customer_id: string;
  balance: number;
  updated_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referee_id: string;
  reward_status: 'PENDING' | 'AWARDED' | 'EXPIRED';
  created_at: string;
}
