import { generateWhatsAppOrderSummary, getWhatsAppOrderUrl, BAKERY_WHATSAPP_NUMBER } from '../lib/whatsappSummary';
import { Order } from '../types';

/**
 * Service: Notificações e Atendimento WhatsApp (Padaria Affeto +5532984680513)
 */
export const whatsappService = {
  sendOrderConfirmation: async (order: Order): Promise<boolean> => {
    console.info(`[WhatsAppService] Order ${order.code} registered for WhatsApp dispatch`);
    return true;
  },

  buildWhatsAppOrderLink: (order: Order, phone: string = BAKERY_WHATSAPP_NUMBER): string => {
    return getWhatsAppOrderUrl(order, phone);
  },

  buildWhatsAppSummaryText: (order: Order): string => {
    return generateWhatsAppOrderSummary(order);
  },
};
