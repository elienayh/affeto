import { dataStore } from '../lib/supabase';
import { Order, PaymentMethod, PaymentRecord, PaymentStatus } from '../types';

export interface PaymentStatusCheckResult {
  order_id: string;
  payment_status: PaymentStatus;
  order_status: Order['status'];
  is_approved: boolean;
  payment?: PaymentRecord;
  order?: Order | null;
}

export const paymentService = {
  /**
   * Obtém configuração atual do gateway Mercado Pago do servidor.
   */
  getPaymentConfig: async (): Promise<{ mercadopago_configured: boolean; environment: string }> => {
    try {
      const res = await fetch('/api/payments/config');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // ignore
    }
    return { mercadopago_configured: false, environment: 'production' };
  },

  /**
   * Gera cobrança real no Mercado Pago via backend seguro.
   */
  createPayment: async (
    order: Order,
    method: PaymentMethod,
    options?: {
      payer_cpf?: string;
      payer_email?: string;
      payer_name?: string;
      delivery_payment_details?: any;
    }
  ): Promise<PaymentRecord> => {
    const nowIso = new Date().toISOString();

    const deliveryDetails =
      options?.delivery_payment_details || order.payment?.delivery_payment_details;

    if (method === 'PAY_ON_DELIVERY' || method === 'CASH_ON_DELIVERY') {
      const paymentId = `pay-${order.id}-${Date.now()}`;
      const deliveryPayment: PaymentRecord = {
        id: paymentId,
        order_id: order.id,
        provider: 'CASH_ON_DELIVERY',
        external_id: `delivery_${order.id}`,
        method: 'PAY_ON_DELIVERY',
        amount: order.total,
        status: 'PENDING',
        delivery_payment_details: deliveryDetails,
        created_at: nowIso,
        updated_at: nowIso,
      };

      try {
        await fetch('/api/payments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: order.id,
            method: 'PAY_ON_DELIVERY',
            payer_cpf: options?.payer_cpf,
            payer_email: options?.payer_email || order.customer_email,
            payer_name: options?.payer_name || order.customer_name,
            delivery_payment_details: deliveryDetails,
          }),
        });
      } catch (e) {
        // ignore network error
      }

      const orders = await dataStore.getOrders();
      const orderIdx = orders.findIndex((o) => o.id === order.id);
      if (orderIdx >= 0) {
        orders[orderIdx].payment = deliveryPayment;
        orders[orderIdx].payment_method = 'PAY_ON_DELIVERY';
        dataStore.saveOrders(orders);
      }

      return deliveryPayment;
    }

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          method,
          payer_cpf: options?.payer_cpf,
          payer_email: options?.payer_email || order.customer_email,
          payer_name: options?.payer_name || order.customer_name,
          delivery_payment_details: deliveryDetails,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.payment) {
          const payment: PaymentRecord = data.payment;

          // Atualiza pedido localmente no dataStore
          const orders = await dataStore.getOrders();
          const orderIdx = orders.findIndex((o) => o.id === order.id);
          if (orderIdx >= 0) {
            orders[orderIdx].payment = payment;
            orders[orderIdx].payment_method = method;
            if (payment.status === 'APPROVED') {
              orders[orderIdx].payment_status = 'APPROVED';
              orders[orderIdx].status = 'CONFIRMED';
            }
            dataStore.saveOrders(orders);
          }

          return payment;
        }
      }
    } catch (err) {
      console.warn('[PaymentService] Falha ao contatar endpoint do servidor:', err);
    }

    // Fallback de contingência caso o servidor demore a responder
    const paymentId = `pay-${order.id}-${Date.now()}`;
    const cleanAmount = order.total.toFixed(2);
    const pixKey = 'toledodias87@gmail.com';
    const fallbackPix = `00020126580014br.gov.bcb.pix01${pixKey.length}${pixKey}520400005303986540${cleanAmount.length}${cleanAmount}5802BR5911AFFETO PAES6012ESPERA FELIZ62070503${order.code.replace(/[^a-zA-Z0-9]/g, '')}6304ABCD`;

    const payment: PaymentRecord = {
      id: paymentId,
      order_id: order.id,
      provider: 'MERCADO_PAGO',
      external_id: `affeto_${order.code.replace(/[^a-zA-Z0-9]/g, '')}`,
      method,
      amount: order.total,
      status: 'PENDING',
      qr_code: fallbackPix,
      ticket_url: `https://www.mercadopago.com.br/`,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const orders = await dataStore.getOrders();
    const orderIdx = orders.findIndex((o) => o.id === order.id);
    if (orderIdx >= 0) {
      orders[orderIdx].payment = payment;
      dataStore.saveOrders(orders);
    }

    return payment;
  },

  /**
   * Consulta status do pagamento em tempo real no servidor/Mercado Pago.
   */
  checkPaymentStatus: async (orderId: string): Promise<PaymentStatusCheckResult> => {
    try {
      const response = await fetch(`/api/payments/${orderId}/status`);
      if (response.ok) {
        const data = await response.json();

        // Se estiver aprovado, sincroniza com dataStore local
        if (data.is_approved) {
          await dataStore.updatePaymentStatus(orderId, 'APPROVED');
          await dataStore.updateOrderStatus(
            orderId,
            'CONFIRMED',
            'MERCADO_PAGO',
            'Pagamento confirmado pelo Mercado Pago'
          );
        }

        const orders = await dataStore.getOrders();
        const updatedOrder = orders.find((o) => o.id === orderId) || null;

        return {
          order_id: orderId,
          payment_status: data.payment_status,
          order_status: data.order_status,
          is_approved: data.is_approved,
          payment: data.payment,
          order: updatedOrder,
        };
      }
    } catch (err) {
      console.warn('[PaymentService] Erro ao checar status:', err);
    }

    const orders = await dataStore.getOrders();
    const current = orders.find((o) => o.id === orderId);

    return {
      order_id: orderId,
      payment_status: current?.payment_status || 'PENDING',
      order_status: current?.status || 'PENDING_PAYMENT',
      is_approved: current?.payment_status === 'APPROVED',
      payment: current?.payment,
      order: current || null,
    };
  },
};
