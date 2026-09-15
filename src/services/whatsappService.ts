import { Order } from '../types';

/**
 * Service: Notificações e Atendimento WhatsApp (Pós-MVP - Seção 4)
 */
export const whatsappService = {
  sendOrderConfirmation: async (order: Order): Promise<boolean> => {
    console.info(`[WhatsAppService Stub] sendOrderConfirmation for order ${order.code} - Pós-MVP`);
    return true;
  },

  buildWhatsAppOrderLink: (order: Order, phone: string): string => {
    const text = encodeURIComponent(
      `Olá, Affeto Pães! Gostaria de consultar o status do meu pedido ${order.code}.`
    );
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${text}`;
  },
};
