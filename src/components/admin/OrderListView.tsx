import React from 'react';
import {
  Calendar,
  Clock,
  Truck,
  Store,
  Eye,
  Edit3,
  MoreVertical,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '../../types';
import {
  getDeliveryDateHighlight,
  getNextOperationalAction,
  getOperationalStage,
  getPaymentInfo,
  formatPaymentMethod,
} from '../../utils/orderManagementUtils';

interface OrderListViewProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onCancelOrder: (order: Order) => void;
  onAdvanceStatus: (order: Order, nextStatus: OrderStatus, note: string) => Promise<void>;
  onUpdatePayment: (order: Order, status: PaymentStatus, method?: PaymentMethod) => Promise<void>;
}

export const OrderListView: React.FC<OrderListViewProps> = ({
  orders,
  onViewDetails,
  onEditOrder,
  onCancelOrder,
  onAdvanceStatus,
  onUpdatePayment,
}) => {
  if (orders.length === 0) {
    return (
      <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-12 text-center text-[#7E6C58] space-y-2">
        <p className="font-serif font-bold text-lg text-[#3A2E1F]">Nenhum pedido encontrado</p>
        <p className="text-xs">Tente ajustar os termos de busca ou remover alguns filtros.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#3A2E1F]/15 rounded-2xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF7F0] border-b border-[#3A2E1F]/10 text-[#7E6C58] uppercase text-[10px] font-bold">
            <tr>
              <th className="p-3.5">Pedido & Cliente</th>
              <th className="p-3.5">Data de Entrega</th>
              <th className="p-3.5">Tipo & Local</th>
              <th className="p-3.5">Itens</th>
              <th className="p-3.5">Total & Pagamento</th>
              <th className="p-3.5">Estágio Operacional</th>
              <th className="p-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3A2E1F]/10">
            {orders.map((order) => {
              const deliveryHighlight = getDeliveryDateHighlight(order.scheduled_date, order.scheduled_time);
              const paymentInfo = getPaymentInfo(order);
              const nextAction = getNextOperationalAction(order);
              const operationalStage = getOperationalStage(order);

              return (
                <tr key={order.id} className="hover:bg-[#FAF7F0]/60 transition-colors">
                  {/* Pedido & Cliente */}
                  <td className="p-3.5">
                    <span className="font-mono font-bold text-[#3A2E1F] block text-sm">
                      {order.code}
                    </span>
                    <span className="font-semibold text-[#3A2E1F] block mt-0.5">
                      {order.customer_name}
                    </span>
                    {order.customer_phone && (
                      <span className="text-[11px] text-[#7E6C58] block">
                        {order.customer_phone}
                      </span>
                    )}
                  </td>

                  {/* Previsão de Entrega (Destaque Proporcional) */}
                  <td className="p-3.5">
                    <div className="space-y-1">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${deliveryHighlight.badgeClass}`}>
                        {deliveryHighlight.tag}
                      </span>
                      <span className="font-bold text-[#3A2E1F] block">
                        {deliveryHighlight.fullText}
                      </span>
                      <span className="text-[11px] text-[#7E6C58] block font-mono">
                        {deliveryHighlight.timeText || 'Horário comercial'}
                      </span>
                    </div>
                  </td>

                  {/* Tipo & Local */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5 font-medium text-[#3A2E1F]">
                      {order.delivery_type === 'DELIVERY' ? (
                        <>
                          <Truck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>Entrega</span>
                        </>
                      ) : (
                        <>
                          <Store className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Retirada</span>
                        </>
                      )}
                    </div>
                    {order.delivery_type === 'DELIVERY' && order.address?.neighborhood && (
                      <span className="text-[11px] text-[#7E6C58] block mt-0.5">
                        {order.address.neighborhood}
                      </span>
                    )}
                  </td>

                  {/* Itens */}
                  <td className="p-3.5 max-w-[200px]">
                    <span className="font-semibold text-[#3A2E1F] block">
                      {order.items.length} variações ({order.items.reduce((acc, i) => acc + i.quantity, 0)} un.)
                    </span>
                    <span className="text-[11px] text-[#7E6C58] line-clamp-1">
                      {order.items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')}
                    </span>
                  </td>

                  {/* Total & Pagamento (Eixo 1) */}
                  <td className="p-3.5">
                    <span className="font-serif font-bold text-sm text-[#B8623F] block">
                      R$ {order.total.toFixed(2)}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold mt-1 ${paymentInfo.badgeClass}`}>
                      {paymentInfo.label}
                    </span>
                  </td>

                  {/* Estágio Operacional (Eixo 2) */}
                  <td className="p-3.5">
                    <div className="space-y-1.5">
                      <span className="font-bold text-xs text-[#3A2E1F] block">
                        {operationalStage === 'AGUARDANDO_PREPARO'
                          ? 'Aguardando Preparo'
                          : operationalStage === 'EM_PREPARO'
                          ? 'Em Preparo'
                          : operationalStage === 'PRONTO'
                          ? 'Pronto'
                          : operationalStage === 'EM_ROTA'
                          ? 'Em Rota'
                          : operationalStage === 'ENTREGUE'
                          ? 'Entregue'
                          : 'Cancelado'}
                      </span>

                      {nextAction && order.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => onAdvanceStatus(order, nextAction.nextStatus, nextAction.auditNote)}
                          className={`px-3 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-2xs cursor-pointer ${nextAction.btnClass}`}
                        >
                          <span>{nextAction.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Ações */}
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewDetails(order)}
                        className="p-1.5 text-[#554432] hover:bg-stone-100 rounded-lg cursor-pointer"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditOrder(order)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Editar Pedido"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {order.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => onCancelOrder(order)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Cancelar Pedido"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
