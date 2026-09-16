import { CashbackAccount } from '../types';

/**
 * Service: Cashback (Pós-MVP - Seção 4)
 * Tabela no Postgres: cashback_accounts, cashback_transactions
 */
export const cashbackService = {
  getAccountByCustomerId: async (customerId: string): Promise<CashbackAccount | null> => {
    console.info(`[CashbackService Stub] getAccountByCustomerId(${customerId}) - Pós-MVP`);
    return null;
  },

  creditCashback: async (customerId: string, orderId: string, amount: number): Promise<boolean> => {
    console.info(`[CashbackService Stub] creditCashback - Pós-MVP`);
    return false;
  },

  debitCashback: async (customerId: string, amount: number): Promise<boolean> => {
    console.info(`[CashbackService Stub] debitCashback - Pós-MVP`);
    return false;
  },
};
