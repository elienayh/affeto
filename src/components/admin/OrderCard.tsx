import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Truck,
  Store,
  MapPin,
  Eye,
  Edit3,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  MessageCircle,
  MoreVertical,
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

interface OrderCardProps {
  order: Order;
  onViewDetails: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onCancelOrder: (order: Order) => void;
  onAdvanceStatus: (order: Order, nextStatus: OrderStatus, note: string) => Promise<void>;
  onUpdatePayment: (order: Order, status: PaymentStatus, method?: PaymentMethod) => Promise<void>;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onViewDetails,
  onEditOrder,
  onCancelOrder,
  onAdvanceStatus,
  onUpdatePayment,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const deliveryHighlight = getDeliveryDateHighlight(order.scheduled_date, order.scheduled_time);
  const paymentInfo = getPaymentInfo(order);
  const nextAction = getNextOperationalAction(order);
  const operationalStage = getOperationalStage(order);

  const handleActionClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nextAction || isUpdating) return;
    setIsUpdating(true);
    try {
      await onAdvanceStatus(order, nextAction.nextStatus, nextAction.auditNote);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentQuickToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setIsUpdating(true);
    try {
      if (order.payment_status === 'APPROVED') {
        await onUpdatePayment(order, 'PENDING');
      } else {
        await onUpdatePayment(order, 'APPROVED');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      onClick={() => onViewDetails(order)}
      className="group relative bg-white border border-[#3A2E1F]/15 hover:border-[#B8623F]/50 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 text-xs"
    >
      {/* 1. CABEÇALHO DO CARD: CÓDIGO, CLIENTE E MENU */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono font-bold text-[#3A2E1F] text-sm tracking-tight">
              {order.code}
            </span>
            <span className="text-[10px] text-[#7E6C58]">
              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="font-semibold text-[#3A2E1F] text-xs truncate mt-0.5" title={order.customer_name}>
            {order.customer_name}
          </p>
          {order.customer_phone && (
            <p className="text-[11px] text-[#7E6C58] truncate">{order.customer_phone}</p>
          )}
        </div>

        {/* Menu de ações rápidas */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded-lg hover:bg-stone-100 text-[#7E6C58] cursor-pointer"
            title="Mais opções"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div
                className="absolute right-0 top-6 z-50 w-44 bg-white border border-[#3A2E1F]/15 rounded-xl shadow-xl py-1 text-xs text-[#3A2E1F] divide-y divide-stone-100 animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onViewDetails(order);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#FAF7F0] flex items-center gap-2"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#7E6C58]" />
                    <span>Ver Detalhes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onEditOrder(order);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#FAF7F0] flex items-center gap-2"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Editar Pedido</span>
                  </button>
                </div>

                {/* Ações de Pagamento */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={handlePaymentQuickToggle}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#FAF7F0] flex items-center gap-2"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{order.payment_status === 'APPROVED' ? 'Marcar como Pendente' : 'Marcar como Pago'}</span>
                  </button>
                  {order.payment_method !== 'CASH_ON_DELIVERY' && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onUpdatePayment(order, 'PENDING', 'CASH_ON_DELIVERY');
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-[#FAF7F0] flex items-center gap-2"
                    >
                      <Truck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Definir Pagto na Entrega</span>
                    </button>
                  )}
                </div>

                {/* Cancelamento */}
                {order.status !== 'CANCELLED' && (
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onCancelOrder(order);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-700 flex items-center gap-2"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancelar Pedido</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. DESTAQUE OBRIGATÓRIO E EXTREMAMENTE VISÍVEL DA DATA DE ENTREGA */}
      <div className="bg-[#FAF7F0] border border-[#3A2E1F]/10 rounded-xl p-2.5 space-y-1">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[10px] font-bold text-[#7E6C58] uppercase flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#B8623F]" />
            <span>Previsão de Entrega:</span>
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${deliveryHighlight.badgeClass}`}>
            {deliveryHighlight.tag}
          </span>
        </div>
        <div className="flex items-baseline justify-between font-semibold text-[#3A2E1F]">
          <span className="text-xs font-bold">{deliveryHighlight.fullText}</span>
          <span className="text-[11px] text-[#7E6C58] font-mono">{deliveryHighlight.timeText || 'Horário comercial'}</span>
        </div>
      </div>

      {/* 3. EIXO DE PAGAMENTO (DESVINCULADO E INDEPENDENTE) & TIPO DE ENTREGA */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
        {/* Badge do Pagamento */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(true);
          }}
          className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 ${paymentInfo.badgeClass} cursor-pointer hover:opacity-90`}
          title="Clique para opções de pagamento"
        >
          {paymentInfo.isPaid ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
          ) : paymentInfo.isCod ? (
            <DollarSign className="w-3 h-3 text-amber-700" />
          ) : (
            <AlertCircle className="w-3 h-3 text-amber-700" />
          )}
          <span className="font-bold">{paymentInfo.label}</span>
          <span className="opacity-80">R$ {order.total.toFixed(2)}</span>
        </div>

        {/* Badge do Tipo de Entrega / Local */}
        <div className="flex items-center gap-1 text-[#554432] bg-stone-100 px-2 py-1 rounded-lg font-medium">
          {order.delivery_type === 'DELIVERY' ? (
            <>
              <Truck className="w-3 h-3 text-purple-600" />
              <span className="truncate max-w-[110px]" title={order.address?.neighborhood || 'Entrega'}>
                {order.address?.neighborhood || 'Entrega'}
              </span>
            </>
          ) : (
            <>
              <Store className="w-3 h-3 text-amber-700" />
              <span>Retirada</span>
            </>
          )}
        </div>
      </div>

      {/* 4. ITENS DO PEDIDO (RESUMO) */}
      <div className="bg-white/60 border-t border-[#3A2E1F]/10 pt-2 space-y-1">
        <div className="flex justify-between text-[11px] text-[#7E6C58]">
          <span>{order.items.reduce((acc, i) => acc + i.quantity, 0)} itens</span>
          <span className="text-[10px] text-[#B8623F] font-semibold">{order.items.length} variações</span>
        </div>
        <div className="text-[11px] text-[#3A2E1F] line-clamp-2 leading-relaxed">
          {order.items.map((i, idx) => (
            <span key={i.id || idx}>
              <strong className="font-semibold">{i.quantity}x</strong> {i.product_name}
              {idx < order.items.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      </div>

      {/* 5. OBSERVAÇÕES VISÍVEIS QUANDO EXISTIREM */}
      {order.notes && (
        <div className="p-2 bg-amber-50/70 border border-amber-200/60 rounded-lg text-[10px] text-amber-900 leading-tight">
          <span className="font-bold block">Obs:</span>
          <p className="line-clamp-2 italic">{order.notes}</p>
        </div>
      )}

      {/* 6. BOTÃO DE AVANÇO OPERACIONAL ÚNICO E DETERMINADO */}
      <div className="pt-1">
        {nextAction && order.status !== 'CANCELLED' ? (
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleActionClick}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98] transition-all disabled:opacity-50 ${nextAction.btnClass}`}
          >
            <span>{isUpdating ? 'Atualizando...' : nextAction.label}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : operationalStage === 'ENTREGUE' ? (
          <div className="w-full py-1.5 bg-stone-100 text-stone-600 rounded-xl text-center font-bold text-[11px] flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pedido Concluído</span>
          </div>
        ) : operationalStage === 'CANCELADO' ? (
          <div className="w-full py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-center font-bold text-[11px]">
            Pedido Cancelado
          </div>
        ) : null}
      </div>
    </div>
  );
};
