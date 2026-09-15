/** Serviço de cashback. Pós-MVP — ver seção 4 do prompt-v2. */

export async function creditCashbackForOrder(
  _customerId: string,
  _orderId: string,
  _amount: number
): Promise<void> {
  throw new Error("cashback.creditCashbackForOrder: não implementado (pós-MVP)");
}
