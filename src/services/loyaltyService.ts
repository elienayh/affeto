import { LoyaltyAccount } from '../types';

/**
 * Service: Programa de Fidelidade (Pós-MVP - Seção 4)
 * Tabela no Postgres: loyalty_accounts, loyalty_transactions
 */
export const loyaltyService = {
  getAccountByCustomerId: async (customerId: string): Promise<LoyaltyAccount | null> => {
    console.info(`[LoyaltyService Stub] getAccountByCustomerId(${customerId}) - Pós-MVP`);
    return null;
  },

  earnPointsFromOrder: async (customerId: string, orderId: string, orderTotal: number): Promise<number> => {
    console.info(`[LoyaltyService Stub] earnPointsFromOrder - Pós-MVP`);
    return 0;
  },

  redeemPoints: async (customerId: string, points: number): Promise<boolean> => {
    console.info(`[LoyaltyService Stub] redeemPoints - Pós-MVP`);
    return false;
  },
};
