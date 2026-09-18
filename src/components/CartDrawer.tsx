import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  ArrowRight,
  Truck,
  Store,
  CheckCircle2,
  AlertCircle,
  MapPin,
  HelpCircle,
  Calendar,
  Flame,
  ChevronDown,
} from 'lucide-react';
import { matchDeliveryCep } from '../lib/pricingEngine';
import { CartItem, Coupon, DeliveryCepRule, DeliveryType, DeliveryZone, PricingBreakdown } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  pricing: PricingBreakdown;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  deliveryType: DeliveryType;
  onChangeDeliveryType: (type: DeliveryType) => void;
  deliveryZones: DeliveryZone[];
  selectedZoneId: string;
  onChangeZoneId: (zoneId: string) => void;
  deliveryCepRules: DeliveryCepRule[];
  inputCep: string;
  onChangeCep: (cep: string) => void;
  couponCodeInput: string;
  onChangeCouponCode: (code: string) => void;
  onApplyCoupon: (code: string) => void;
  couponMessage?: { text: string; isError: boolean } | null;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  pricing,
  onUpdateQuantity,
  onRemoveItem,
  deliveryType,
  onChangeDeliveryType,
  deliveryZones,
  selectedZoneId,
  onChangeZoneId,
  deliveryCepRules,
  inputCep,
  onChangeCep,
  couponCodeInput,
  onChangeCouponCode,
  onApplyCoupon,
  couponMessage,
  onProceedToCheckout,
}) => {
  const [showCepListModal, setShowCepListModal] = useState(false);

  // Distinct delivery dates in cart for batch products
  const distinctDeliveryDates = useMemo(() => {
    const dates = new Set<string>();
    (items || []).forEach((it) => {
      if (it.scheduled_batch_label) {
        dates.add(it.scheduled_batch_label);
      }
    });
    return Array.from(dates);
  }, [items]);

  // Previne a rolagem da página de fundo (background) quando o carrinho estiver aberto
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const hasCepRules = deliveryCepRules.length > 0;
  const matchedCep = inputCep ? matchDeliveryCep(inputCep, deliveryCepRules) : null;
  const isCepValid = !!matchedCep;
  // Block if delivery is selected and no valid CEP has been provided to calculate the freight
  const isDeliveryBlockedByCep =
    deliveryType === 'DELIVERY' &&
    hasCepRules &&
    (!inputCep.trim() || !isCepValid);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end">
      <div
        id="carrinho-drawer"
        className="w-full max-w-md bg-[#FFFFFF] border-l border-[#3A2E1F]/15 flex flex-col h-full shadow-2xl animate-slideLeft"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#3A2E1F]/10 flex items-center justify-between bg-[#F9F6F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#B8623F]/10 text-[#B8623F] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-[#3A2E1F]">Sua Cesta de Pães</h2>
              <span className="text-xs text-[#7E6C58]">
                {pricing.items_count} {pricing.items_count === 1 ? 'item' : 'itens'} adicionados
              </span>
            </div>
          </div>
          <button
            id="btn-fechar-carrinho"
            onClick={onClose}
            className="p-2 text-[#7E6C58] hover:text-[#3A2E1F] hover:bg-black/5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[#FAF7F0] border border-[#3A2E1F]/10 flex items-center justify-center text-[#B7A05E] mb-4">
              <ShoppingBag className="w-10 h-10 opacity-70" />
            </div>
            <h3 className="font-serif font-bold text-xl text-[#3A2E1F]">Sua cesta está vazia</h3>
            <p className="text-xs text-[#7E6C58] mt-1.5 max-w-xs leading-relaxed">
              O aroma da fornada de hoje espera por você! Explore nossos pães e folhados artesanais.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Explorar Cardápio
            </button>
          </div>
        ) : (
          <>
            {/* Scrollable Container (Items, Notice, Delivery & Coupon) */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {/* Items list */}
              <div className="p-4 sm:p-5 space-y-4 divide-y divide-[#3A2E1F]/10">
                {items.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex gap-3.5 items-start">
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-16 h-16 rounded-xl object-cover border border-[#3A2E1F]/10 shrink-0 bg-[#FAF7F0]"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-bold text-xs sm:text-sm text-[#3A2E1F] leading-snug line-clamp-1">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="text-xs text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="Remover item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Selected Options */}
                      {item.selected_options.length > 0 && (
                        <div className="text-[11px] text-[#7E6C58] mt-0.5 space-y-0.5">
                          {item.selected_options.map((opt, idx) => (
                            <span key={idx} className="block">
                              • {opt.value_name}
                              {opt.price_modifier > 0 && ` (+R$ ${opt.price_modifier.toFixed(2)})`}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.notes && (
                        <p className="text-[11px] italic text-[#7E6C58] mt-0.5">
                          Obs: "{item.notes}"
                        </p>
                      )}

                      {/* Batch delivery badge */}
                      {item.scheduled_batch_label && (
                        <div className="mt-1.5 p-1.5 rounded-lg bg-[#FAF5EB] border border-[#B7A05E]/30 text-[11px] text-[#554432] flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#B8623F] shrink-0" />
                            <span>Entrega: <strong>{item.scheduled_batch_label}</strong></span>
                          </div>
                          {item.delivery_window && (
                            <span className="text-[10px] text-[#7E6C58]">({item.delivery_window})</span>
                          )}
                        </div>
                      )}

                      {/* Price and quantity controls */}
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="font-serif font-bold text-sm text-[#3A2E1F]">
                          R$ {item.total_item_price.toFixed(2).replace('.', ',')}
                        </span>

                        <div className="flex items-center border border-[#3A2E1F]/15 rounded-lg bg-[#FAF7F0] p-0.5">
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="p-1 rounded text-[#3A2E1F] hover:bg-black/5 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-[#3A2E1F] min-w-6 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="p-1 rounded text-[#3A2E1F] hover:bg-black/5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Multi-batch order notice */}
              {distinctDeliveryDates.length > 1 && (
                <div className="mx-4 my-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Atenção: Pedido com {distinctDeliveryDates.length} entregas distintas:</span>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Seus itens possuem fornadas em dias diferentes ({distinctDeliveryDates.join(' e ')}). 
                      A taxa de entrega é única para todo o pedido.
                    </p>
                  </div>
                </div>
              )}

              {/* Delivery Option Toggle */}
              <div className="p-4 bg-[#FAF7F0] border-t border-[#3A2E1F]/10 space-y-3">
              <div className="grid grid-cols-2 gap-2 p-1 bg-white border border-[#3A2E1F]/15 rounded-xl">
                <button
                  onClick={() => onChangeDeliveryType('DELIVERY')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    deliveryType === 'DELIVERY'
                      ? 'bg-[#B8623F] text-white shadow-2xs'
                      : 'text-[#7E6C58] hover:text-[#3A2E1F]'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Entrega em Casa</span>
                </button>
                <button
                  onClick={() => onChangeDeliveryType('PICKUP')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    deliveryType === 'PICKUP'
                      ? 'bg-[#3A2E1F] text-[#F3ECDD] shadow-2xs'
                      : 'text-[#7E6C58] hover:text-[#3A2E1F]'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Retirada no Balcão</span>
                </button>
              </div>

              {/* Delivery Destination selection if delivery */}
              {deliveryType === 'DELIVERY' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-[#3A2E1F] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#B8623F]" />
                      <span>Selecione seu Destino / Bairro</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCepListModal(true)}
                      className="text-[10px] text-[#B8623F] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>Ver Locais Atendidos</span>
                    </button>
                  </div>

                  {/* Destination dropdown */}
                  <div className="relative">
                    <select
                      id="select-destino-carrinho"
                      value={matchedCep?.id || ''}
                      onChange={(e) => {
                        const ruleId = e.target.value;
                        const rule = deliveryCepRules.find((r) => r.id === ruleId);
                        if (rule) {
                          onChangeCep(rule.label || rule.id);
                        } else {
                          onChangeCep('');
                        }
                      }}
                      className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:outline-none focus:ring-2 focus:ring-[#B8623F] cursor-pointer appearance-none shadow-2xs pr-8"
                    >
                      <option value="">Selecione sua localidade / bairro...</option>
                      {deliveryCepRules
                        .filter((r) => r.active)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label} — R$ {r.fee.toFixed(2).replace('.', ',')}
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#7E6C58] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Quick selection buttons for fast access */}
                  {deliveryCepRules.filter((r) => r.active).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {deliveryCepRules
                        .filter((r) => r.active)
                        .map((rule) => {
                          const isSelected = matchedCep?.id === rule.id;
                          return (
                            <button
                              key={rule.id}
                              type="button"
                              onClick={() => onChangeCep(rule.label || rule.id)}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#B8623F] text-white border-[#B8623F] shadow-2xs font-semibold'
                                  : 'bg-[#FAF7F0] hover:bg-white text-[#554432] border-[#3A2E1F]/15'
                              }`}
                            >
                              {rule.label} (R$ {rule.fee.toFixed(2).replace('.', ',')})
                            </button>
                          );
                        })}
                    </div>
                  )}

                  {/* Feedback on Selected Location */}
                  {matchedCep ? (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-medium">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-bold">{matchedCep.label}</span>
                        </span>
                        <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-semibold">
                          Taxa: R$ {matchedCep.fee.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-700/90 leading-tight">
                        Entregas sempre no período da tarde (entre 12h e 18h) no dia da fornada fresca.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Selecione sua localidade acima para calcular o frete</span>
                      </div>
                      <p className="text-[10px] text-amber-700 leading-tight">
                        Entregamos em rotas e bairros específicos. Caso more fora da rota, você pode optar por <strong>Retirada no Balcão</strong>!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Coupon Code Section */}
              <div className="space-y-1.5 pt-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7E6C58]" />
                    <input
                      id="input-cupom-carrinho"
                      type="text"
                      placeholder="Cupom (ex: AFFETO10)"
                      value={couponCodeInput}
                      onChange={(e) => onChangeCouponCode(e.target.value.toUpperCase())}
                      className="w-full pl-8 pr-2 py-2 text-xs rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[#B8623F]"
                    />
                  </div>
                  <button
                    id="btn-aplicar-cupom"
                    onClick={() => onApplyCoupon(couponCodeInput)}
                    className="px-3.5 py-2 bg-[#3A2E1F] text-[#F3ECDD] rounded-xl text-xs font-semibold hover:bg-[#554432] transition-colors cursor-pointer"
                  >
                    Aplicar
                  </button>
                </div>

                {couponMessage && (
                  <p
                    className={`text-[11px] flex items-center gap-1 ${
                      couponMessage.isError ? 'text-red-600' : 'text-emerald-700 font-medium'
                    }`}
                  >
                    {couponMessage.isError ? (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{couponMessage.text}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

            {/* Financial Summary & Checkout Button */}
            <div className="p-4 sm:p-5 bg-white border-t border-[#3A2E1F]/15 space-y-3 shrink-0">
              <div className="space-y-1.5 text-xs text-[#554432]">
                <div className="flex justify-between">
                  <span>Subtotal dos produtos</span>
                  <span className="font-medium text-[#3A2E1F]">
                    R$ {pricing.subtotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {pricing.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Desconto ({pricing.coupon_code})</span>
                    <span>- R$ {pricing.discount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>
                    Taxa de entrega ({deliveryType === 'DELIVERY' ? 'Entrega' : 'Retirada'})
                  </span>
                  <span className="font-medium text-[#3A2E1F]">
                    {pricing.delivery_fee === 0
                      ? 'Grátis'
                      : `R$ ${pricing.delivery_fee.toFixed(2).replace('.', ',')}`}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#3A2E1F]/10 flex justify-between items-baseline">
                  <span className="font-serif font-bold text-base text-[#3A2E1F]">Total Final</span>
                  <span className="font-serif font-bold text-xl text-[#B8623F]">
                    R$ {pricing.total.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              <button
                id="btn-avancar-checkout"
                disabled={isDeliveryBlockedByCep}
                onClick={onProceedToCheckout}
                className={`w-full py-3.5 font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  isDeliveryBlockedByCep
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#B8623F] hover:bg-[#994E30] text-white hover:shadow-lg cursor-pointer'
                }`}
              >
                <span>
                  {deliveryType === 'DELIVERY' && hasCepRules && (!inputCep.trim() || !matchedCep)
                    ? 'Selecione o local de entrega para continuar'
                    : isDeliveryBlockedByCep
                    ? 'Selecione Retirada ou Local Válido'
                    : 'Avançar para Agendamento'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal de Consulta de Locais Atendidos */}
      {showCepListModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#3A2E1F]">
                  Locais Atendidos para Entrega
                </h3>
                <p className="text-xs text-[#7E6C58]">
                  Entregas diretas da padaria para produtos frescos e perecíveis.
                </p>
              </div>
              <button
                onClick={() => setShowCepListModal(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {deliveryCepRules.map((rule) => (
                <div
                  key={rule.id}
                  onClick={() => {
                    onChangeCep(rule.label || rule.id);
                    setShowCepListModal(false);
                  }}
                  className="p-3 rounded-xl border border-gray-100 hover:border-[#B8623F] hover:bg-[#FAF7F0] transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#B8623F] shrink-0" />
                    <div>
                      <span className="block text-xs font-bold text-[#3A2E1F]">
                        {rule.label || rule.cep}
                      </span>
                      <span className="text-[10px] text-[#7E6C58]">
                        Tempo estimado: {rule.estimated_minutes || 30} min
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-[#B8623F]">
                      R$ {rule.fee.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="block text-[10px] text-emerald-700 font-semibold">
                      Entrega 12h às 18h
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t text-center">
              <p className="text-[11px] text-gray-500 mb-3">
                Mora fora desta rota? Escolha a <strong>Retirada no Balcão</strong> na nossa loja física!
              </p>
              <button
                onClick={() => setShowCepListModal(false)}
                className="w-full py-2 bg-[#3A2E1F] text-white text-xs font-semibold rounded-xl cursor-pointer hover:bg-[#554432]"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
