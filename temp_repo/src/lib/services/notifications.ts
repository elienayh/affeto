/**
 * Serviço de notificações (pedido confirmado, pagamento aprovado, etc). Pós-MVP.
 * No MVP, o acompanhamento do pedido é feito só por polling/realtime na tela do pedido.
 */

export type NotificationEvent =
  | "order_confirmed"
  | "payment_approved"
  | "order_preparing"
  | "order_ready"
  | "order_out_for_delivery"
  | "order_completed";

export async function notifyCustomer(
  _customerId: string,
  _event: NotificationEvent
): Promise<void> {
  throw new Error("notifications.notifyCustomer: não implementado (pós-MVP, push futuro)");
}
