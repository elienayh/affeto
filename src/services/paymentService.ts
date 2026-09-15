import { dataStore } from '../lib/supabase';
import { Order, PaymentMethod, PaymentRecord, PaymentStatus } from '../types';

export const paymentService = {
  createPayment: async (
    order: Order,
    method: PaymentMethod
  ): Promise<PaymentRecord> => {
    const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    let qrCode = '';
    let qrCodeBase64 = '';

    if (method === 'PIX') {
      // Formatted simulated PIX EMV Copia e Cola with dynamic order code and amount
      const cleanAmount = order.total.toFixed(2);
      qrCode = `00020126580014br.gov.bcb.pix0136contato@affetopaes.com.br520400005303986540${cleanAmount.length}${cleanAmount}5802BR5911AFFETO PAES6009SAO PAULO62070503${order.code.replace(/[^a-zA-Z0-9]/g, '')}6304ABCD`;
    }

    const payment: PaymentRecord = {
      id: paymentId,
      order_id: order.id,
      provider: 'MERCADO_PAGO',
      external_id: `mp_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      method,
      amount: order.total,
      status: 'PENDING',
      qr_code: qrCode,
      ticket_url: `https://www.mercadopago.com.br/payments/${paymentId}/ticket`,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Attach to order in dataStore
    const orders = await dataStore.getOrders();
    const orderIdx = orders.findIndex((o) => o.id === order.id);
    if (orderIdx >= 0) {
      orders[orderIdx].payment = payment;
      dataStore.saveOrders(orders);
    }

    return payment;
  },

  processWebhook: async (payload: {
    action: string;
    data: { id: string };
    type?: string;
  }): Promise<{ success: boolean; message: string }> => {
    // Idempotency and status transition (Section 5.4)
    console.info('[Mercado Pago Webhook Received]:', payload);
    const paymentId = payload.data?.id;

    if (!paymentId) {
      return { success: false, message: 'Invalid payload: missing data.id' };
    }

    // Find order with this payment
    const orders = await dataStore.getOrders();
    const order = orders.find((o) => o.payment?.external_id === paymentId || o.payment?.id === paymentId);

    if (!order) {
      return { success: false, message: 'Order not found for payment' };
    }

    if (order.payment_status === 'APPROVED') {
      return { success: true, message: 'Payment already approved (idempotent)' };
    }

    await dataStore.updatePaymentStatus(order.id, 'APPROVED', paymentId);
    await dataStore.updateOrderStatus(
      order.id,
      'CONFIRMED',
      'MERCADO_PAGO_WEBHOOK',
      `Pagamento aprovado via Webhook Mercado Pago [ID: ${paymentId}]`
    );

    return { success: true, message: 'Payment approved successfully' };
  },

  simulateApproval: async (orderId: string): Promise<Order | null> => {
    const order = await dataStore.updatePaymentStatus(orderId, 'APPROVED');
    if (order) {
      await dataStore.updateOrderStatus(
        orderId,
        'CONFIRMED',
        'MERCADO_PAGO_SANDBOX',
        'Pagamento PIX / Cartão aprovado com sucesso no ambiente de testes Mercado Pago'
      );
    }
    return order;
  },
};
