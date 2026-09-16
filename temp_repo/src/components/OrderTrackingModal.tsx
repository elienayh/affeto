import React from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  Truck,
  Store,
  MapPin,
  MessageCircle,
  Copy,
  Check,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { whatsappService } from '../services/whatsappService';
import { Order, OrderStatus } from '../types';

interface OrderTrackingModalProps {
  order: Order | null;
  onClose: () => void;
  storePhone?: string;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  order,
  onClose,
  storePhone = '5532984680513',
}) => {
  if (!order) return null;

  const [copiedLink, setCopiedLink] = React.useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}?order=${encodeURIComponent(order.code)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const steps: Array<{
    statusKey: OrderStatus[];
    label: string;
    sub: string;
  }> = [
    {
      statusKey: ['PENDING_PAYMENT', 'CONFIRMED'],
      label: 'Pedido Confirmado',
      sub: 'Pagamento aprovado e registrado',
    },
    {
      statusKey: ['PREPARING'],
      label: 'Na Fornada / Preparo',
      sub: 'Pães no forno a lenha e levain vivo',
    },
    {
      statusKey: ['READY', 'OUT_FOR_DELIVERY'],
      label: order.delivery_type === 'DELIVERY' ? 'Saiu para Entrega' : 'Pronto no Balcão',
      sub: order.delivery_type === 'DELIVERY' ? 'A caminho do seu endereço' : 'Aguardando sua retirada',
    },
    {
      statusKey: ['DELIVERED', 'PICKED_UP'],
      label: order.delivery_type === 'DELIVERY' ? 'Entregue' : 'Retirado',
      sub: 'Bom apetite com carinho Affeto!',
    },
  ];

  const getStepState = (stepIdx: number) => {
    const statusOrder: Record<OrderStatus, number> = {
      PENDING_PAYMENT: 0,
      CONFIRMED: 0,
      PREPARING: 1,
      READY: 2,
      OUT_FOR_DELIVERY: 2,
      DELIVERED: 3,
      PICKED_UP: 3,
      CANCELLED: -1,
    };

    const currentOrderLevel = statusOrder[order.status] ?? 0;

    if (order.status === 'CANCELLED') return 'cancelled';
    if (currentOrderLevel > stepIdx) return 'completed';
    if (currentOrderLevel === stepIdx) return 'active';
    return 'pending';
  };

  const whatsAppLink = whatsappService.buildWhatsAppOrderLink(order, storePhone);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white border border-[#3A2E1F]/15 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 bg-[#FAF7F0] border-b border-[#3A2E1F]/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B8623F]">
              Rastreamento em Tempo Real
            </span>
            <h2 className="font-serif font-bold text-xl text-[#3A2E1F] flex items-center gap-2">
              <span>Pedido {order.code}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-[#7E6C58]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1">
          {/* Status Tracker Stepper */}
          <div className="space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#7E6C58]">
              Etapas da Produção & Entrega
            </h3>

            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#3A2E1F]/15">
              {steps.map((step, idx) => {
                const state = getStepState(idx);
                return (
                  <div key={idx} className="flex items-start gap-3.5 relative z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 text-xs font-bold transition-all ${
                        state === 'completed'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : state === 'active'
                          ? 'bg-[#B8623F] border-[#B8623F] text-white ring-4 ring-[#B8623F]/20 animate-pulse'
                          : 'bg-white border-[#3A2E1F]/20 text-[#7E6C58]'
                      }`}
                    >
                      {state === 'completed' ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h4
                        className={`text-xs sm:text-sm font-bold leading-tight ${
                          state === 'active'
                            ? 'text-[#B8623F]'
                            : state === 'completed'
                            ? 'text-[#3A2E1F]'
                            : 'text-[#7E6C58]'
                        }`}
                      >
                        {step.label}
                      </h4>
                      <p className="text-[11px] text-[#7E6C58] mt-0.5">{step.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Schedule & Address info */}
          <div className="p-4 bg-[#FAF7F0] rounded-2xl border border-[#3A2E1F]/10 space-y-2.5 text-xs text-[#554432]">
            <div className="flex items-center gap-2 font-semibold text-[#3A2E1F]">
              <Calendar className="w-4 h-4 text-[#B8623F]" />
              <span>Agendamento: {order.scheduled_date} ({order.scheduled_time})</span>
            </div>

            <div className="flex items-start gap-2">
              {order.delivery_type === 'DELIVERY' ? (
                <Truck className="w-4 h-4 text-[#B7A05E] shrink-0 mt-0.5" />
              ) : (
                <Store className="w-4 h-4 text-[#B7A05E] shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-[#3A2E1F] block">
                  {order.delivery_type === 'DELIVERY' ? 'Endereço de Entrega:' : 'Retirada no Balcão:'}
                </span>
                {order.address ? (
                  <span>
                    {order.address.street}, {order.address.number}
                    {order.address.complement && ` - ${order.address.complement}`} •{' '}
                    {order.address.neighborhood} - {order.address.city}/{order.address.state}
                  </span>
                ) : (
                  <span>Loja Affeto - Balcão Principal</span>
                )}
              </div>
            </div>
          </div>

          {/* Items Summary */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#7E6C58]">
              Itens do Pedido ({order.items.length})
            </h3>
            <div className="border border-[#3A2E1F]/10 rounded-2xl divide-y divide-[#3A2E1F]/10 overflow-hidden">
              {order.items.map((it) => (
                <div key={it.id} className="p-3 text-xs flex justify-between items-center bg-white">
                  <div>
                    <span className="font-semibold text-[#3A2E1F]">
                      {it.quantity}x {it.product_name}
                    </span>
                    {it.options_selected && it.options_selected.length > 0 && (
                      <span className="block text-[11px] text-[#7E6C58]">
                        {it.options_selected.map((o) => o.value_name).join(', ')}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-[#3A2E1F]">
                    R$ {it.subtotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-baseline pt-1 px-1 text-xs">
              <span className="text-[#7E6C58]">Total Geral Pago</span>
              <span className="font-serif font-bold text-base text-[#B8623F]">
                R$ {order.total.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Continuar no WhatsApp</span>
            </a>

            <button
              onClick={handleCopyLink}
              className="py-2.5 px-4 bg-[#FAF7F0] hover:bg-[#F3ECDD] border border-[#3A2E1F]/20 text-[#3A2E1F] font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Link Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#7E6C58]" />
                  <span>Copiar Link do Pedido</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
