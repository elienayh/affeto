import {
  CartItem,
  CartItemOptionSelection,
  Coupon,
  DeliveryType,
  DeliveryZone,
  PricingBreakdown,
  Product,
  StoreSettings,
} from '../types';

export interface PricingEngineInput {
  items: Array<{
    product_id: string;
    quantity: number;
    selected_options?: Array<{
      option_id: string;
      value_id: string;
    }>;
  }>;
  availableProducts: Product[];
  delivery_type: DeliveryType;
  delivery_zone_id?: string;
  availableZones: DeliveryZone[];
  coupon_code?: string;
  availableCoupons: Coupon[];
}

export function calculateOrderPricing(input: PricingEngineInput): {
  breakdown: PricingBreakdown;
  validatedItems: Array<{
    product: Product;
    quantity: number;
    unit_price: number;
    total_price: number;
    options_summary: Array<{
      option_name: string;
      value_name: string;
      price_modifier: number;
    }>;
  }>;
  error?: string;
} {
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

  const validatedItems: Array<{
    product: Product;
    quantity: number;
    unit_price: number;
    total_price: number;
    options_summary: Array<{
      option_name: string;
      value_name: string;
      price_modifier: number;
    }>;
  }> = [];

  for (const item of items) {
    const product = availableProducts.find((p) => p.id === item.product_id);
    if (!product) {
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
        error: `Produto com id ${item.product_id} não foi encontrado no cardápio.`,
      };
    }

    if (!product.is_active) {
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
        error: `O produto "${product.name}" não está disponível no momento.`,
      };
    }

    // Base price or promotional price
    let unitPrice =
      product.promotional_price && product.promotional_price > 0
        ? product.promotional_price
        : product.base_price;

    const optionsSummary: Array<{
      option_name: string;
      value_name: string;
      price_modifier: number;
    }> = [];

    // Calculate option prices if any
    if (item.selected_options && item.selected_options.length > 0 && product.options) {
      for (const sel of item.selected_options) {
        const opt = product.options.find((o) => o.id === sel.option_id);
        if (opt) {
          const val = opt.values.find((v) => v.id === sel.value_id);
          if (val) {
            unitPrice += val.price_modifier;
            optionsSummary.push({
              option_name: opt.name,
              value_name: val.name,
              price_modifier: val.price_modifier,
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
  if (delivery_type === 'DELIVERY') {
    if (delivery_zone_id) {
      const zone = availableZones.find((z) => z.id === delivery_zone_id && z.active);
      deliveryFee = zone ? zone.fee : 10.0;
    } else {
      deliveryFee = 10.0; // Default standard zone
    }
  } else {
    // PICKUP has zero delivery fee
    deliveryFee = 0;
  }

  // Coupon discount calculation
  let discount = 0;
  let appliedCouponCode: string | undefined = undefined;
  let appliedCouponId: string | undefined = undefined;

  if (coupon_code) {
    const cleanCode = coupon_code.trim().toUpperCase();
    const coupon = availableCoupons.find(
      (c) => c.code.toUpperCase() === cleanCode && c.active
    );

    if (coupon) {
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = new Date(coupon.valid_until);

      if (now >= validFrom && now <= validUntil) {
        const meetsMin = !coupon.min_order_value || subtotal >= coupon.min_order_value;
        const withinLimit = !coupon.usage_limit || coupon.usage_count < coupon.usage_limit;

        if (meetsMin && withinLimit) {
          if (coupon.discount_type === 'PERCENTAGE') {
            discount = (subtotal * coupon.discount_value) / 100;
            if (coupon.max_discount && discount > coupon.max_discount) {
              discount = coupon.max_discount;
            }
          } else {
            discount = coupon.discount_value;
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
      total: Math.round(total * 100) / 100,
      items_count: totalItemsCount,
    },
    validatedItems,
  };
}

export const pricingEngine = {
  calculateOrderPricing: (params: {
    items: CartItem[];
    deliveryType: DeliveryType;
    deliveryZone?: DeliveryZone;
    coupon?: Coupon;
    storeSettings?: StoreSettings;
  }): PricingBreakdown => {
    const { items, deliveryType, deliveryZone, coupon, storeSettings } = params;

    let subtotal = 0;
    let itemsCount = 0;

    for (const item of items) {
      subtotal += item.total_item_price;
      itemsCount += item.quantity;
    }

    // Delivery fee
    let deliveryFee = 0;
    if (deliveryType === 'DELIVERY') {
      deliveryFee = deliveryZone ? deliveryZone.fee : 10.0;
      // Free shipping threshold check if defined
      if (storeSettings?.free_shipping_threshold && subtotal >= storeSettings.free_shipping_threshold) {
        deliveryFee = 0;
      }
    } else {
      deliveryFee = 0;
    }

    // Discount
    let discount = 0;
    let couponCode: string | undefined = undefined;
    let couponId: string | undefined = undefined;

    if (coupon && coupon.active) {
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = new Date(coupon.valid_until);

      if (now >= validFrom && now <= validUntil) {
        const meetsMin = !coupon.min_order_value || subtotal >= coupon.min_order_value;
        const withinLimit = !coupon.usage_limit || coupon.usage_count < coupon.usage_limit;

        if (meetsMin && withinLimit) {
          if (coupon.discount_type === 'PERCENTAGE') {
            discount = (subtotal * coupon.discount_value) / 100;
            if (coupon.max_discount && discount > coupon.max_discount) {
              discount = coupon.max_discount;
            }
          } else {
            discount = coupon.discount_value;
          }

          if (discount > subtotal) {
            discount = subtotal;
          }

          couponCode = coupon.code;
          couponId = coupon.id;
        }
      }
    }

    const total = Math.max(0, subtotal - discount + deliveryFee);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      coupon_code: couponCode,
      coupon_id: couponId,
      delivery_type: deliveryType,
      delivery_fee: Math.round(deliveryFee * 100) / 100,
      total: Math.round(total * 100) / 100,
      items_count: itemsCount,
    };
  },

  createCartItem: (
    product: Product,
    quantity: number,
    selectedOptions: CartItemOptionSelection[] = [],
    notes = ''
  ): CartItem => {
    let unitPrice =
      product.promotional_price && product.promotional_price > 0
        ? product.promotional_price
        : product.base_price;

    for (const opt of selectedOptions) {
      unitPrice += opt.price_modifier;
    }

    const totalItemPrice = unitPrice * quantity;

    // Generate a deterministic or pseudo-unique cart item id
    const optionsHash = selectedOptions.map((o) => `${o.option_id}:${o.value_id}`).join('|');
    const id = `cart-${product.id}-${optionsHash || 'standard'}-${Date.now()}`;

    return {
      id,
      product_id: product.id,
      product,
      quantity,
      selected_options: selectedOptions,
      unit_price: unitPrice,
      total_item_price: totalItemPrice,
      notes,
    };
  },

  validateCoupon: (
    code: string,
    subtotal: number,
    availableCoupons: Coupon[]
  ): { coupon?: Coupon; error?: string } => {
    const cleanCode = code.trim().toUpperCase();
    const coupon = availableCoupons.find(
      (c) => c.code.toUpperCase() === cleanCode && c.active
    );

    if (!coupon) {
      return { error: 'Cupom não encontrado ou inativo.' };
    }

    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = new Date(coupon.valid_until);

    if (now < validFrom || now > validUntil) {
      return { error: 'Este cupom está expirado.' };
    }

    if (coupon.min_order_value && subtotal < coupon.min_order_value) {
      return {
        error: `Valor mínimo para este cupom é R$ ${coupon.min_order_value.toFixed(2).replace('.', ',')}`,
      };
    }

    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return { error: 'Limite de utilizações deste cupom atingido.' };
    }

    return { coupon };
  },
};
