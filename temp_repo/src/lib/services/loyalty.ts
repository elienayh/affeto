/**
 * Serviço de fidelidade (Cartão Affeto). Pós-MVP — ver seção 4 do prompt-v2.
 * A tabela `loyalty_accounts`/`loyalty_transactions` já existe no schema (migração 0001).
 * Este service existe para que o pricing engine e o checkout já tenham um ponto único
 * de integração quando a feature for ligada, sem precisar tocar em código de checkout depois.
 */

export interface LoyaltyAccrualResult {
  pointsAdded: number;
  totalPoints: number;
}

export async function accruePointsForOrder(
  _customerId: string,
  _orderId: string
): Promise<LoyaltyAccrualResult> {
  throw new Error("loyalty.accruePointsForOrder: não implementado (pós-MVP)");
}
