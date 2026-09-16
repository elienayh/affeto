import { CustomerAddress, Order } from '../types';

export const BAKERY_WHATSAPP_NUMBER = '5532984680513';
export const BAKERY_WHATSAPP_DISPLAY = '+55 (32) 98468-0513';

const CUSTOMERS_CACHE_KEY = 'affeto_customers_by_phone_v1';

export interface CustomerData {
  name: string;
  phone: string;
  email: string;
  address?: CustomerAddress;
  lastOrderDate?: string;
}

/**
 * Extract only digits from phone string
 */
export const cleanPhoneDigits = (phone: string): string => {
  return (phone || '').replace(/\D/g, '');
};

/**
 * Format phone string to (XX) XXXXX-XXXX or (XX) XXXX-XXXX
 */
export const formatPhoneMask = (value: string): string => {
  const digits = cleanPhoneDigits(value).slice(0, 11);
  if (digits.length <= 2) {
    return digits.length ? `(${digits}` : '';
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

/**
 * Search if this phone was used before, checking both in-memory orders and local cache
 */
export const findCustomerByPhone = (
  phoneInput: string,
  orders: Order[] = []
): CustomerData | null => {
  const digits = cleanPhoneDigits(phoneInput);
  if (digits.length < 8) return null;

  // 1. Search in cached customers in localStorage
  try {
    const raw = localStorage.getItem(CUSTOMERS_CACHE_KEY);
    if (raw) {
      const cache: Record<string, CustomerData> = JSON.parse(raw);
      if (cache[digits]) {
        return cache[digits];
      }
      // Also match last 8 or 9 digits if country/DDD was omitted
      for (const [key, data] of Object.entries(cache)) {
        if (key.endsWith(digits) || digits.endsWith(key)) {
          return data;
        }
      }
    }
  } catch {
    // ignore
  }

  // 2. Search in existing orders list
  for (const o of orders) {
    const orderDigits = cleanPhoneDigits(o.customer_phone);
    if (orderDigits === digits || (digits.length >= 8 && orderDigits.endsWith(digits))) {
      return {
        name: o.customer_name,
        phone: o.customer_phone,
        email: o.customer_email,
        address: o.address,
        lastOrderDate: o.created_at,
      };
    }
  }

  return null;
};

/**
 * Save customer details associated with their phone number for fast auto-fill in future purchases
 */
export const saveCustomerByPhone = (customer: CustomerData): void => {
  const digits = cleanPhoneDigits(customer.phone);
  if (digits.length < 8) return;

  try {
    const raw = localStorage.getItem(CUSTOMERS_CACHE_KEY);
    const cache: Record<string, CustomerData> = raw ? JSON.parse(raw) : {};
    cache[digits] = {
      ...customer,
      lastOrderDate: new Date().toISOString(),
    };
    localStorage.setItem(CUSTOMERS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
};

/**
 * Async lookup for customer by phone: searches local cache, in-memory orders, and backend database
 */
export const lookupCustomerByPhone = async (
  phoneInput: string,
  orders: Order[] = []
): Promise<CustomerData | null> => {
  const digits = cleanPhoneDigits(phoneInput);
  if (digits.length < 8) return null;

  // 1. Search in local cache & orders first (instant response)
  const localMatch = findCustomerByPhone(phoneInput, orders);
  if (localMatch && localMatch.name) {
    return localMatch;
  }

  // 2. Query backend server database (/api/customers/lookup)
  try {
    const response = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(digits)}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.found && data.customer) {
        saveCustomerByPhone(data.customer);
        return data.customer;
      }
    }
  } catch (err) {
    console.warn('[Customer Lookup] Server fetch error:', err);
  }

  return null;
};

/**
 * Generate a complete, beautifully structured WhatsApp order summary for the bakery
 */
export const generateWhatsAppOrderSummary = (order: Order): string => {
  const code = order.code || order.id.slice(-6).toUpperCase();
  const method = order.payment_method || order.payment?.method || 'PIX';
  const paymentText =
    method === 'PIX'
      ? 'PIX (Mercado Pago)'
      : method === 'CREDIT_CARD'
      ? 'Cartão de Crédito'
      : 'A Combinar';

  const deliveryText =
    order.delivery_type === 'DELIVERY'
      ? `🛵 *Entrega em Domicílio*\n📍 *Endereço:* ${order.address?.street || ''}, ${
          order.address?.number || ''
        } ${order.address?.complement ? `(${order.address.complement})` : ''}\n🏘️ *Bairro:* ${
          order.address?.neighborhood || ''
        } - ${order.address?.city || 'Espera Feliz'}/${order.address?.state || 'MG'}\n📮 *CEP:* ${
          order.address?.zip_code || ''
        }`
      : `🏪 *Retirada no Balcão*\n📍 *Local:* Espera Feliz-MG (Affeto Pães)`;

  const itemsList = (order.items || [])
    .map((it) => {
      const optionsStr =
        it.options_selected && it.options_selected.length > 0
          ? ` (${it.options_selected.map((o) => o.value_name || o.value_id).join(', ')})`
          : '';
      return `• *${it.quantity}x* ${it.product_name}${optionsStr} - R$ ${it.subtotal
        .toFixed(2)
        .replace('.', ',')}`;
    })
    .join('\n');

  const notesText = order.notes ? `\n\n📝 *Observações do Cliente:*\n"${order.notes}"` : '';

  return (
    `🍞 *NOVO PEDIDO - AFFETO PÃES ARTESANAIS*\n` +
    `────────────────────────\n` +
    `📋 *Código:* #${code}\n` +
    `👤 *Cliente:* ${order.customer_name}\n` +
    `📱 *Telefone:* ${order.customer_phone}\n` +
    `✉️ *E-mail:* ${order.customer_email || 'Não informado'}\n\n` +
    `${deliveryText}\n\n` +
    `📅 *Data Agendada:* ${order.scheduled_date}\n` +
    `⏰ *Horário:* ${order.scheduled_time}\n\n` +
    `🛒 *ITENS DO PEDIDO:*\n` +
    `${itemsList}\n\n` +
    `────────────────────────\n` +
    `💰 *TOTAL DO PEDIDO: R$ ${order.total.toFixed(2).replace('.', ',')}*\n` +
    `💳 *Forma de Pagamento:* ${paymentText}\n` +
    `📊 *Status:* ${order.status}` +
    `${notesText}\n` +
    `────────────────────────\n` +
    `_Enviado pelo site Affeto Pães Artesanais_`
  );
};

/**
 * Generate full WhatsApp click-to-chat URL targeting +5532984680513
 */
export const getWhatsAppOrderUrl = (
  order: Order,
  targetPhone: string = BAKERY_WHATSAPP_NUMBER
): string => {
  const text = generateWhatsAppOrderSummary(order);
  const cleanTarget = cleanPhoneDigits(targetPhone) || BAKERY_WHATSAPP_NUMBER;
  return `https://wa.me/${cleanTarget}?text=${encodeURIComponent(text)}`;
};
