import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Truck,
  Store,
  MapPin,
  MessageCircle,
  Edit3,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  XCircle,
  Printer,
  History,
  ArrowRight,
  Package,
  User,
  Phone,
  Mail,
  Copy,
  Check,
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '../../types';
import {
  getDeliveryDateHighlight,
  getNextOperationalAction,
  getOperationalStage,
  getPaymentInfo,
  formatPaymentMethod,
} from '../../utils/orderManagementUtils';
import { whatsappService } from '../../services/whatsappService';

interface OrderDetailsModalProps {
  order: Order | null;
  onClose: () => void;
  onEditOrder: (order: Order) => void;
  onCancelOrder: (order: Order) => void;
  onAdvanceStatus: (order: Order, nextStatus: OrderStatus, note: string) => Promise<void>;
  onUpdatePayment: (
    order: Order,
    status: PaymentStatus,
    method?: PaymentMethod,
    note?: string
  ) => Promise<void>;
  storePhone?: string;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  onClose,
  onEditOrder,
  onCancelOrder,
  onAdvanceStatus,
  onUpdatePayment,
  storePhone = '5532984680513',
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!order) return null;

  const deliveryHighlight = getDeliveryDateHighlight(order.scheduled_date, order.scheduled_time);
  const paymentInfo = getPaymentInfo(order);
  const nextAction = getNextOperationalAction(order);
  const operationalStage = getOperationalStage(order);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(order.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAdvance = async () => {
    if (!nextAction || isProcessing) return;
    setIsProcessing(true);
    try {
      await onAdvanceStatus(order, nextAction.nextStatus, nextAction.auditNote);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentStatusToggle = async (newStatus: PaymentStatus, method?: PaymentMethod) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onUpdatePayment(
        order,
        newStatus,
        method || order.payment_method,
        `Status de pagamento alterado para ${newStatus}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const whatsAppLink = whatsappService.buildWhatsAppOrderLink(order, storePhone);

  const stagesList = [
    { key: 'AGUARDANDO_PREPARO', label: 'Aguardando Preparo' },
    { key: 'EM_PREPARO', label: 'Em Preparo' },
    { key: 'PRONTO', label: 'Pronto' },
    { key: 'EM_ROTA', label: order.delivery_type === 'DELIVERY' ? 'Em Rota' : 'Balcão' },
    { key: 'ENTREGUE', label: order.delivery_type === 'DELIVERY' ? 'Entregue' : 'Retirado' },
  ];

  const currentStageIndex = stagesList.findIndex((s) => s.key === operationalStage);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white border border-[#3A2E1F]/15 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        {/* CABEÇALHO DO MODAL */}
        <div className="flex items-start justify-between border-b border-[#3A2E1F]/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B8623F]">
                Gestão do Pedido
              </span>
              <span className="text-xs text-[#7E6C58]">
                • Criado em {new Date(order.created_at).toLocaleDateString()} às{' '}
                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="font-serif font-bold text-2xl text-[#3A2E1F]">{order.code}</h2>
              <button
                onClick={handleCopyCode}
                className="p-1 rounded-md hover:bg-stone-100 text-[#7E6C58] cursor-pointer"
                title="Copiar código"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditOrder(order)}
              className="px-3 py-1.5 bg-[#FAF7F0] hover:bg-[#F3ECDD] border border-[#3A2E1F]/15 text-[#3A2E1F] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              <span>Editar Pedido</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-stone-100 text-[#7E6C58] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. SEÇÃO ENTREGA & PREVISÃO (EXTREMAMENTE DESTACADA) */}
        <div className="bg-[#FAF7F0] border-2 border-[#B8623F]/30 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#3A2E1F]/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white text-[#B8623F] shadow-2xs">
                {order.delivery_type === 'DELIVERY' ? <Truck className="w-5 h-5" /> : <Store className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#7E6C58] uppercase block">
                  Modalidade de Entrega
                </span>
                <span className="font-bold text-sm text-[#3A2E1F]">
                  {order.delivery_type === 'DELIVERY' ? 'Entrega em Domicílio' : 'Retirada no Balcão Affeto'}
                </span>
              </div>
            </div>

            {/* Destaque Visual Mandatório da Data */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#7E6C58] uppercase block">Data Prevista</span>
                <span className="font-bold text-sm text-[#3A2E1F]">{deliveryHighlight.fullText}</span>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${deliveryHighlight.badgeClass}`}>
                {deliveryHighlight.tag}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-[#7E6C58] uppercase block">Janela de Horário</span>
              <p className="font-semibold text-[#3A2E1F] flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-[#B8623F]" />
                <span>{deliveryHighlight.timeText || 'Horário comercial'}</span>
              </p>
            </div>

            {order.delivery_type === 'DELIVERY' && order.address && (
              <div>
                <span className="text-[10px] font-bold text-[#7E6C58] uppercase block">Endereço de Entrega</span>
                <p className="font-medium text-[#3A2E1F] mt-0.5">
                  {order.address.street}, {order.address.number}
                  {order.address.complement ? ` - ${order.address.complement}` : ''}
                </p>
                <p className="text-[11px] text-[#7E6C58]">
                  {order.address.neighborhood} • {order.address.city} - {order.address.zip_code}
                </p>
              </div>
            )}
          </div>

          {order.notes && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <span className="font-bold block">Observações para Entrega / Atendimento:</span>
              <p className="mt-0.5 italic">{order.notes}</p>
            </div>
          )}
        </div>

        {/* 2. LINHA DO TEMPO OPERACIONAL (EIXO OPERAÇÃO) */}
        <div className="bg-white border border-[#3A2E1F]/15 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-xs text-[#3A2E1F] uppercase flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#B8623F]" />
              <span>Linha Operacional</span>
            </h3>
            <span className="text-xs font-bold text-[#B8623F]">
              Estágio: {stagesList[currentStageIndex]?.label || operationalStage}
            </span>
          </div>

          {/* Stepper visual */}
          <div className="grid grid-cols-5 gap-1 pt-1">
            {stagesList.map((stg, idx) => {
              const isPassed = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;
              return (
                <div key={stg.key} className="text-center space-y-1">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isPassed
                        ? 'bg-emerald-500'
                        : isCurrent
                        ? 'bg-[#B8623F] ring-2 ring-[#B8623F]/30'
                        : 'bg-stone-200'
                    }`}
                  />
                  <span
                    className={`text-[9px] block leading-tight font-semibold ${
                      isCurrent
                        ? 'text-[#B8623F] font-bold'
                        : isPassed
                        ? 'text-emerald-700'
                        : 'text-stone-400'
                    }`}
                  >
                    {stg.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Botão de avanço operacional */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {nextAction && order.status !== 'CANCELLED' ? (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleAdvance}
                className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all disabled:opacity-50 ${nextAction.btnClass}`}
              >
                <span>{isProcessing ? 'Atualizando...' : nextAction.label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-xs font-semibold text-[#7E6C58]">
                {order.status === 'CANCELLED' ? 'Pedido cancelado.' : 'Pedido em estágio final.'}
              </span>
            )}

            {order.status !== 'CANCELLED' && (
              <button
                type="button"
                onClick={() => onCancelOrder(order)}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancelar Pedido</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. EIXO DE PAGAMENTO (TOTALMENTE INDEPENDENTE) */}
        <div className="bg-white border border-[#3A2E1F]/15 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-xs text-[#3A2E1F] uppercase flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Situação Financeira & Pagamento</span>
            </h3>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${paymentInfo.badgeClass}`}>
              {paymentInfo.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#FAF7F0] p-3 rounded-xl">
            <div>
              <span className="text-[10px] font-bold text-[#7E6C58] uppercase block">Valor Total</span>
              <span className="font-serif font-bold text-base text-[#B8623F]">
                R$ {order.total.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#7E6C58] uppercase block">Método de Pagamento</span>
              <span className="font-semibold text-[#3A2E1F]">
                {formatPaymentMethod(order.payment_method)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#7E6C58] uppercase block">Status do Pagamento</span>
              <span className="font-bold text-[#3A2E1F]">{order.payment_status}</span>
            </div>
          </div>

          {/* Ações de Gestão de Pagamento */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {order.payment_status !== 'APPROVED' ? (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handlePaymentStatusToggle('APPROVED')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmar Pagamento (Marcar como Pago)</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handlePaymentStatusToggle('PENDING')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Reverter para Pendente</span>
              </button>
            )}

            {order.payment_method !== 'CASH_ON_DELIVERY' && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handlePaymentStatusToggle('PENDING', 'CASH_ON_DELIVERY')}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-[#3A2E1F] rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Truck className="w-3.5 h-3.5 text-[#B8623F]" />
                <span>Definir Pagamento na Entrega</span>
              </button>
            )}

            {order.payment_status === 'APPROVED' && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handlePaymentStatusToggle('REFUNDED')}
                className="px-3 py-1.5 bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>Registrar Estorno</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. ITENS DO PEDIDO DETALHADOS */}
        <div className="bg-white border border-[#3A2E1F]/15 rounded-2xl p-4 space-y-3">
          <h3 className="font-bold text-xs text-[#3A2E1F] uppercase flex items-center gap-1.5">
            <Package className="w-4 h-4 text-[#B8623F]" />
            <span>Itens Solicitados ({order.items.length})</span>
          </h3>

          <div className="divide-y divide-[#3A2E1F]/10 border border-[#3A2E1F]/10 rounded-xl overflow-hidden text-xs">
            {order.items.map((it, idx) => (
              <div key={it.id || idx} className="p-3 bg-white flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#3A2E1F]">
                      {it.quantity}x {it.product_name}
                    </span>
                    <span className="text-[11px] text-[#7E6C58]">
                      (R$ {it.unit_price.toFixed(2)} un.)
                    </span>
                  </div>
                  {it.selected_options && it.selected_options.length > 0 && (
                    <div className="text-[11px] text-[#7E6C58] mt-0.5">
                      {it.selected_options.map((opt) => opt.value_name).join(', ')}
                    </div>
                  )}
                  {it.notes && (
                    <div className="text-[10px] text-amber-800 italic mt-0.5">
                      Obs: {it.notes}
                    </div>
                  )}
                </div>
                <div className="text-right font-semibold text-[#3A2E1F]">
                  R$ {it.subtotal.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Discriminação de Valores */}
          <div className="bg-[#FAF7F0] p-3 rounded-xl space-y-1 text-xs text-[#554432]">
            <div className="flex justify-between">
              <span>Subtotal dos Itens:</span>
              <span className="font-semibold text-[#3A2E1F]">R$ {order.subtotal.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Desconto Aplicado:</span>
                <span className="font-semibold">- R$ {order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Taxa de Entrega:</span>
              <span className="font-semibold text-[#3A2E1F]">
                {order.delivery_fee > 0 ? `R$ ${order.delivery_fee.toFixed(2)}` : 'Grátis'}
              </span>
            </div>
            <div className="flex justify-between font-bold text-sm text-[#3A2E1F] pt-1 border-t border-[#3A2E1F]/10">
              <span>Total do Pedido:</span>
              <span className="text-[#B8623F] font-serif text-base">R$ {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* 5. DADOS DO CLIENTE & CONTATO */}
        <div className="bg-white border border-[#3A2E1F]/15 rounded-2xl p-4 space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-[#3A2E1F] uppercase flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#B8623F]" />
              <span>Dados do Cliente</span>
            </h3>
            {order.customer_phone && (
              <a
                href={whatsAppLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Conversar no WhatsApp</span>
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#FAF7F0] p-3 rounded-xl">
            <div>
              <span className="text-[10px] text-[#7E6C58] uppercase font-bold block">Nome</span>
              <span className="font-semibold text-[#3A2E1F]">{order.customer_name}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#7E6C58] uppercase font-bold block">Telefone</span>
              <span className="font-semibold text-[#3A2E1F]">{order.customer_phone || 'Não informado'}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#7E6C58] uppercase font-bold block">E-mail</span>
              <span className="font-semibold text-[#3A2E1F] truncate block">{order.customer_email || 'Não informado'}</span>
            </div>
          </div>
        </div>

        {/* 6. HISTÓRICO DE AUDITORIA */}
        <div className="bg-white border border-[#3A2E1F]/15 rounded-2xl p-4 space-y-2 text-xs">
          <h3 className="font-bold text-[#3A2E1F] uppercase flex items-center gap-1.5">
            <History className="w-4 h-4 text-[#7E6C58]" />
            <span>Histórico de Auditoria</span>
          </h3>

          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-stone-100">
            {order.status_history && order.status_history.length > 0 ? (
              order.status_history.map((h, idx) => (
                <div key={h.id || idx} className="pt-1.5 first:pt-0 flex justify-between items-start gap-2 text-[11px]">
                  <div>
                    <span className="font-bold text-[#3A2E1F]">{h.notes}</span>
                    <span className="text-[10px] text-[#7E6C58] block">Por: {h.changed_by}</span>
                  </div>
                  <span className="text-[10px] text-[#7E6C58] font-mono shrink-0">
                    {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                    {new Date(h.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[#7E6C58] italic text-[11px]">Nenhum histórico registrado.</p>
            )}
          </div>
        </div>

        {/* RODAPÉ: AÇÕES FINAIS */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#3A2E1F]/10">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 border border-[#3A2E1F]/15 hover:bg-stone-50 rounded-xl text-xs font-semibold text-[#554432] flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#7E6C58]" />
            <span>Imprimir Pedido</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEditOrder(order)}
              className="px-4 py-2 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Edit3 className="w-4 h-4" />
              <span>Editar Dados do Pedido</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#3A2E1F] rounded-xl text-xs font-semibold cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
