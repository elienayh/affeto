import { createClient } from "@/lib/supabase/server";

/**
 * Pricing engine — seção 5.1 do prompt-v2.
 *
 * Única fonte de verdade para subtotal → desconto → taxa de entrega → total.
 * Chamado pelo checkout (Fase 3) e, na conferência, pelo webhook do Mercado Pago (Fase 5).
 * NUNCA aceitar subtotal/desconto/taxa/total vindos do cliente: este módulo recalcula
 * tudo a partir do carrinho, cupom e zona de entrega persistidos no banco.
 */

export interface PricingInput {
  cartId: string;
  couponCode?: string;
  deliveryZoneId?: string; // ausente = retirada na loja, sem taxa
}

export interface PricingResult {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
}

export async function calculateOrderPricing(
  input: PricingInput
): Promise<PricingResult> {
  const supabase = await createClient();

  const { data: cartItems, error: cartError } = await supabase
    .from("cart_items")
    .select("quantity, unit_price, product_id")
    .eq("cart_id", input.cartId);

  if (cartError) throw cartError;

  const subtotal = (cartItems ?? []).reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  // TODO Fase 3: aplicar promoções (tabela `promotions`/`promotion_products`).
  let discount = 0;
  if (input.couponCode) {
    discount = await resolveCouponDiscount(input.couponCode, subtotal);
  }

  const deliveryFee = input.deliveryZoneId
    ? await resolveDeliveryFee(input.deliveryZoneId, subtotal)
    : 0;

  const total = Math.max(subtotal - discount + deliveryFee, 0);

  return { subtotal, discount, deliveryFee, total };
}

async function resolveCouponDiscount(
  _couponCode: string,
  _subtotal: number
): Promise<number> {
  // TODO Fase 3: validar `coupons`/`coupon_usage` (validade, pedido mínimo,
  // limite por cliente) inteiramente no servidor.
  return 0;
}

async function resolveDeliveryFee(
  _deliveryZoneId: string,
  _subtotal: number
): Promise<number> {
  // TODO Fase 3: consultar `delivery_zones`/`delivery_fees` e regra de frete grátis.
  return 0;
}
