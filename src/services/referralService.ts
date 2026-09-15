import { Referral } from '../types';

/**
 * Service: Programa de Indicação (Pós-MVP - Seção 4)
 * Tabela no Postgres: referrals
 */
export const referralService = {
  createReferral: async (referrerId: string, refereeEmail: string): Promise<Referral | null> => {
    console.info(`[ReferralService Stub] createReferral - Pós-MVP`);
    return null;
  },

  validateReferralCode: async (code: string): Promise<boolean> => {
    console.info(`[ReferralService Stub] validateReferralCode(${code}) - Pós-MVP`);
    return false;
  },
};
