import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  CreditCard,
  QrCode,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  Search,
  Layers,
  Flame,
  Lock,
  Banknote,
  Truck,
} from 'lucide-react';
import { getNextAvailableBatch } from '../lib/batchScheduler';
import { matchDeliveryCep } from '../lib/pricingEngine';
import {
  cleanPhoneDigits,
  findCustomerByPhone,
  formatPhoneMask,
  getWhatsAppOrderUrl,
  saveCustomerByPhone,
  CustomerData,
  BAKERY_WHATSAPP_NUMBER,
} from '../lib/whatsappSummary';
import { orderService } from '../services/orderService';
import {
  CartItem,
  CustomerAddress,
  DeliveryCepRule,
  DeliveryPaymentDetails,
  DeliveryPaymentSubtype,
  DeliveryType,
  Order,
  PaymentMethod,
  PricingBreakdown,
  ProductionBatch,
  StoreSettings,
} from '../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  pricing: PricingBreakdown;
  deliveryType: DeliveryType;
  selectedZoneId?: string;
  deliveryCepRules?: DeliveryCepRule[];
  initialCep?: string;
  orders?: Order[];
  productionBatches?: ProductionBatch[];
  storeSettings?: StoreSettings;
  onOrderCreated: (order: Order, paymentMethod: PaymentMethod) => void;
}

const lookupCustomerByPhone = async (
  phoneInput: string,
  ordersList: Order[] = []
): Promise<CustomerData | null> => {
  const digits = cleanPhoneDigits(phoneInput);
  if (digits.length < 8) return null;

  // 1. Search in local cache & orders first (instant response)
  const localMatch = findCustomerByPhone(phoneInput, ordersList);
  if (localMatch && localMatch.name) {
    return localMatch;
  }

  // 2. Query backend server database (/api/customers/lookup)
  try {
    const response = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(digits)}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.found && data.customer) {
        saveCustomerByPhone(data.customer);
        return data.customer;
      }
    }
  } catch (err) {
    console.warn('[Customer Lookup] Server fetch error:', err);
  }

  return null;
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items = [],
  pricing,
  deliveryType,
  selectedZoneId,
  deliveryCepRules = [],
  initialCep = '',
  orders = [],
  productionBatches = [],
  storeSettings,
  onOrderCreated,
}) => {
  // Detect special scheduled products in cart (e.g. Pão com Nutella que só sai Terça e Sexta)
  const scheduledItems = useMemo(() => {
    return (items || []).filter((it) => it?.product?.schedule_config?.is_scheduled_only);
  }, [items]);

  // Find earliest available batch date for scheduled items
  const recommendedDate = useMemo(() => {
    if (scheduledItems.length === 0) {
      const d = new Date();
      return d.toISOString().split('T')[0];
    }
    const batchDates = scheduledItems.map((it) => {
      const batch = getNextAvailableBatch(it.product, orders, new Date(), it.quantity, productionBatches);
      return batch ? batch.dateString : new Date().toISOString().split('T')[0];
    });
    // Return the latest required date to satisfy all items in the basket
    batchDates.sort();
    return batchDates[batchDates.length - 1];
  }, [scheduledItems, orders, productionBatches]);

  // Form states - Phone is primary customer source
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [autoFillMessage, setAutoFillMessage] = useState<string | null>(null);

  const [scheduledDate, setScheduledDate] = useState(() => recommendedDate);
  const [scheduledTime, setScheduledTime] = useState('12:00 - 18:00 (Período da Tarde)');

  // Address
  const [address, setAddress] = useState<CustomerAddress>({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: storeSettings?.city || 'Espera Feliz',
    state: storeSettings?.state || 'MG',
    zip_code: initialCep || '',
  });

  // Lock body scroll when checkout modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Keep CEP synchronized with the freight calculation from cart, and keep city/state fixed to the store
  useEffect(() => {
    if (initialCep) {
      setAddress((prev) => ({
        ...prev,
        zip_code: initialCep,
        city: storeSettings?.city || 'Espera Feliz',
        state: storeSettings?.state || 'MG',
      }));
    }
  }, [initialCep, storeSettings]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [deliveryPaymentSubtype, setDeliveryPaymentSubtype] = useState<DeliveryPaymentSubtype>('DEBIT_CARD');
  const [needsChange, setNeedsChange] = useState<boolean>(false);
  const [changeForInput, setChangeForInput] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cálculo e validação do troco
  const parsedChangeFor = useMemo(() => {
    if (!changeForInput.trim()) return 0;
    const clean = changeForInput.replace(/[^\d,.]/g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }, [changeForInput]);

  const changeDue = useMemo(() => {
    if (!needsChange || parsedChangeFor <= pricing.total) return 0;
    return parsedChangeFor - pricing.total;
  }, [needsChange, parsedChangeFor, pricing.total]);

  // Sync scheduled date when recommended date changes
  useEffect(() => {
    if (recommendedDate) {
      setScheduledDate(recommendedDate);
    }
  }, [recommendedDate]);

  // Agrupamento inteligente das entregas com base nas fornadas dos itens
  const deliveryGroups = useMemo(() => {
    const groupsMap = new Map<
      string,
      {
        dateString: string;
        label: string;
        window: string;
        items: CartItem[];
      }
    >();

    items.forEach((it) => {
      const targetDate = it.scheduled_batch_date || scheduledDate;
      const targetLabel = it.scheduled_batch_label || `Data: ${targetDate}`;
      const targetWindow = it.delivery_window || scheduledTime;

      if (!groupsMap.has(targetDate)) {
        groupsMap.set(targetDate, {
          dateString: targetDate,
          label: targetLabel,
          window: targetWindow,
          items: [],
        });
      }
      groupsMap.get(targetDate)!.items.push(it);
    });

    return Array.from(groupsMap.values()).sort((a, b) =>
      a.dateString.localeCompare(b.dateString)
    );
  }, [items, scheduledDate, scheduledTime]);

  // Look up customer by phone and auto-fill details — async to hit the backend database
  const applyCustomerData = (found: { name: string; phone: string; email: string; address?: any }) => {
    if (found.name) setCustomerName(found.name);
    if (found.email) setCustomerEmail(found.email);
    if (found.address) {
      setAddress((prev) => ({
        ...prev,
        street: found.address?.street || prev.street,
        number: found.address?.number || prev.number,
        complement: found.address?.complement || prev.complement,
        neighborhood: found.address?.neighborhood || prev.neighborhood,
        // Keep city and state locked to the bakery's local delivery city
        city: storeSettings?.city || 'Espera Feliz',
        state: storeSettings?.state || 'MG',
        // Keep CEP locked to the initialCep used for freight calculations
        zip_code: initialCep || prev.zip_code || found.address?.zip_code || '',
      }));
    }
    setAutoFillMessage(`✓ Cliente reconhecido: ${found.name}! Dados preenchidos automaticamente.`);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneMask(e.target.value);
    setCustomerPhone(formatted);
    setAutoFillMessage(null);

    const digits = cleanPhoneDigits(formatted);
    if (digits.length >= 10) {
      // First: instant local lookup (no latency)
      const localFound = findCustomerByPhone(digits, orders);
      if (localFound && localFound.name) {
        applyCustomerData(localFound);
      } else {
        // Async lookup from backend database
        setIsLookingUp(true);
        lookupCustomerByPhone(digits, orders)
          .then((found) => {
            if (found && found.name) applyCustomerData(found);
          })
          .finally(() => setIsLookingUp(false));
      }
    }
  };

  const handlePhoneBlur = () => {
    const digits = cleanPhoneDigits(customerPhone);
    if (digits.length >= 8 && !autoFillMessage) {
      setIsLookingUp(true);
      lookupCustomerByPhone(digits, orders)
        .then((found) => {
          if (found && found.name) applyCustomerData(found);
        })
        .finally(() => setIsLookingUp(false));
    }
  };

  // Cep validation — only enforce when the store has CEP rules configured
  const hasCepRules = (deliveryCepRules || []).length > 0;
  const currentCep = address.zip_code || initialCep;
  const matchedCepRule = currentCep ? matchDeliveryCep(currentCep, deliveryCepRules) : null;
  const isDeliveryCepValid = deliveryType === 'PICKUP' || !hasCepRules || !!matchedCepRule;

  const availableTimeSlots = [
    '12:00 - 18:00 (Período da Tarde - Rota Geral)',
    '12:00 - 15:00 (Início da Tarde)',
    '15:00 - 18:00 (Fim da Tarde)',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic validations
    if (!customerPhone.trim()) {
      setErrorMessage('O telefone celular/WhatsApp é obrigatório para identificação do pedido.');
      return;
    }

    if (cleanPhoneDigits(customerPhone).length < 10) {
      setErrorMessage('Por favor, informe um número de telefone válido com DDD (ex: 32 98468-0513).');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Por favor, informe o seu nome completo.');
      return;
    }

    if (deliveryType === 'DELIVERY') {
      if (!address.street.trim() || !address.number.trim() || !address.neighborhood.trim()) {
        setErrorMessage('Por favor, preencha o endereço completo de entrega (rua, número e bairro).');
        return;
      }
      const effectiveLocation = initialCep || address.neighborhood;
      if (!effectiveLocation.trim()) {
        setErrorMessage('Por favor, selecione seu local de entrega na cesta.');
        return;
      }
      // Only enforce destination match if the store has delivery rules configured
      if (hasCepRules && !isDeliveryCepValid) {
        setErrorMessage(
          'O destino selecionado não está na rota de entregas da padaria. Por favor, escolha a opção Retirada no Balcão.'
        );
        return;
      }
    }

    // Validação de troco se a forma de pagamento for Dinheiro na Entrega
    if (paymentMethod === 'PAY_ON_DELIVERY' && deliveryPaymentSubtype === 'CASH' && needsChange) {
      if (!parsedChangeFor || parsedChangeFor < pricing.total) {
        setErrorMessage(
          `Por favor, informe um valor de troco válido e superior ao total do pedido (R$ ${pricing.total.toFixed(2).replace('.', ',')}).`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const finalAddress: CustomerAddress | undefined =
        deliveryType === 'DELIVERY'
          ? {
              ...address,
              city: storeSettings?.city || 'Espera Feliz',
              state: storeSettings?.state || 'MG',
              neighborhood: address.neighborhood.trim() || matchedCepRule?.label || '',
              zip_code: matchedCepRule?.cep || initialCep || address.zip_code || '36830-000',
            }
          : undefined;

      // Save customer details linked to phone number for future instant auto-fill
      saveCustomerByPhone({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        email: customerEmail.trim(),
        address: finalAddress,
      });

      const deliveryPaymentDetails: DeliveryPaymentDetails | undefined =
        paymentMethod === 'PAY_ON_DELIVERY'
          ? {
              subtype: deliveryPaymentSubtype,
              needs_change: deliveryPaymentSubtype === 'CASH' ? needsChange : false,
              change_for: deliveryPaymentSubtype === 'CASH' && needsChange ? parsedChangeFor : null,
            }
          : undefined;

      const orderPayload = {
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || `${cleanPhoneDigits(customerPhone)}@affeto.com.br`,
        customer_phone: customerPhone.trim(),
        delivery_type: deliveryType,
        delivery_zone_id: selectedZoneId,
        address: finalAddress,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        coupon_code: pricing.coupon_code,
        notes: notes.trim(),
        payment_method: paymentMethod,
        delivery_payment_details: deliveryPaymentDetails,
        items: items.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
          selected_options: it.selected_options.map((so) => ({
            option_id: so.option_id,
            value_id: so.value_id,
          })),
          notes: it.notes,
          scheduled_batch_date: it.scheduled_batch_date || scheduledDate,
          delivery_window: it.delivery_window || scheduledTime,
        })),
      };

      const result = await orderService.createOrder(orderPayload);

      if (result.error || !result.order) {
        setErrorMessage(result.error || 'Erro ao processar o pedido.');
        setIsSubmitting(false);
        return;
      }

      // Automatically open WhatsApp with the order summary for +5532984680513
      const targetPhone = storeSettings?.whatsapp || BAKERY_WHATSAPP_NUMBER;
      const waUrl = getWhatsAppOrderUrl(result.order, targetPhone);
      try {
        window.open(waUrl, '_blank');
      } catch (err) {
        console.log('Pop-up bloqueado, botão disponível na tela de confirmação', err);
      }

      onOrderCreated(result.order, paymentMethod);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado ao gerar pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#FFFFFF] border border-[#3A2E1F]/15 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative my-auto animate-fadeIn max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#F9F6F0] border-b border-[#3A2E1F]/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#B8623F]/10 text-[#B8623F] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-[#3A2E1F]">Agendamento & Finalização</h2>
              <p className="text-xs text-[#7E6C58]">
                {deliveryType === 'DELIVERY' ? 'Entrega em domicílio' : 'Retirada no balcão (Espera Feliz-MG)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-[#7E6C58]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Step 1: Customer Contact - Phone as primary identifier */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-sm text-[#3A2E1F] flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#B8623F]" />
                <span>1. Identificação pelo Telefone</span>
              </h3>
              <span className="text-[10px] text-[#B8623F] font-bold bg-[#B8623F]/10 px-2 py-0.5 rounded-full">
                Obrigatório
              </span>
            </div>

            {/* Notification when previous customer is recognized */}
            {autoFillMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{autoFillMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Telefone celular como identificador principal */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#3A2E1F] mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#B8623F]" />
                  Telefone / WhatsApp <span className="text-[#B8623F]">*</span>
                  <span className="ml-auto text-[10px] font-normal text-[#7E6C58]">Identificador do pedido</span>
                </label>
                <div className="relative">
                  <input
                    id="checkout-telefone"
                    type="tel"
                    required
                    autoFocus
                    placeholder="(32) 98468-0513"
                    value={customerPhone}
                    onChange={handlePhoneChange}
                    onBlur={handlePhoneBlur}
                    className={`w-full text-sm font-semibold p-3 pl-10 pr-10 rounded-xl border-2 bg-white text-[#3A2E1F] focus:outline-none transition-colors ${
                      autoFillMessage
                        ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-400'
                        : 'border-[#B8623F]/50 focus:ring-2 focus:ring-[#B8623F] focus:border-[#B8623F]'
                    }`}
                  />
                  <Phone className="w-4 h-4 text-[#B8623F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  {isLookingUp && (
                    <Loader2 className="w-4 h-4 text-[#B8623F] absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin" />
                  )}
                  {autoFillMessage && !isLookingUp && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <p className="text-[10px] text-[#7E6C58] mt-1">
                  Informe seu WhatsApp com DDD. Clientes anteriores têm nome e endereço preenchidos automaticamente.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#554432] mb-1">
                  Nome Completo *
                </label>
                <input
                  id="checkout-nome"
                  type="text"
                  required
                  placeholder="Seu nome"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#554432] mb-1">
                  E-mail para recibo
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  placeholder="seuemail@exemplo.com (opcional)"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Date and Time Window */}
          <div className="space-y-3 pt-3 border-t border-[#3A2E1F]/10">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-sm text-[#3A2E1F] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#B8623F]" />
                <span>2. Agendamento da Fornada & Entrega</span>
              </h3>
              {scheduledItems.length > 0 && (
                <span className="text-[11px] font-bold text-[#B8623F] bg-[#FAF5EB] border border-[#B7A05E]/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Item de Fornada Restrita
                </span>
              )}
            </div>

            {/* Agrupamento de Entregas por Fornada */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#3A2E1F] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#B8623F]" />
                  <span>Resumo do Agrupamento de Entregas</span>
                </span>
                <span className="text-[11px] font-semibold text-[#B8623F]">
                  {deliveryGroups.length} {deliveryGroups.length === 1 ? 'entrega única' : 'entregas programadas'}
                </span>
              </div>

              {deliveryGroups.length > 1 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Atenção: Pedido com {deliveryGroups.length} entregas separadas!</span>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Seus produtos têm dias de fornada diferentes e serão entregues em dias distintos para garantir o frescor. A taxa de entrega permanece única.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {deliveryGroups.map((group, idx) => (
                  <div
                    key={group.dateString}
                    className="p-3 bg-[#FAF7F0] border border-[#B7A05E]/30 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-[#B8623F]">
                        <Flame className="w-3.5 h-3.5 shrink-0" />
                        <span>ENTREGA {idx + 1} — {group.label}</span>
                      </div>
                      <span className="text-[11px] text-[#554432] bg-white px-2 py-0.5 rounded border border-[#3A2E1F]/10">
                        {group.window}
                      </span>
                    </div>

                    <div className="space-y-1 pl-2 border-l-2 border-[#B8623F]/30">
                      {group.items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between text-xs text-[#3A2E1F]"
                        >
                          <span>
                            <strong>{it.product.name}</strong> × {it.quantity}
                          </span>
                          <span className="text-[#7E6C58]">
                            R$ {it.total_item_price.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {deliveryGroups.length <= 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#554432] mb-1">
                    Data Desejada *
                  </label>
                  <input
                    id="checkout-data"
                    type="date"
                    required
                    value={scheduledDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#554432] mb-1">
                    Janela de Horário / Fornada *
                  </label>
                  <select
                    id="checkout-horario"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none"
                  >
                    {availableTimeSlots.map((slot, i) => (
                      <option key={i} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Address (If delivery) */}
          {deliveryType === 'DELIVERY' ? (
            <div className="space-y-3 pt-3 border-t border-[#3A2E1F]/10">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-sm text-[#3A2E1F] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#B8623F]" />
                  <span>3. Endereço de Entrega</span>
                </h3>
                <span className="text-[11px] text-[#7E6C58] flex items-center gap-1 font-medium">
                  <Lock className="w-3 h-3 text-[#7E6C58]" />
                  Entrega exclusiva em {storeSettings?.city || 'Espera Feliz'} - {storeSettings?.state || 'MG'}
                </span>
              </div>

              {/* Destino Definido para o Frete na Cesta */}
              <div className="p-3 rounded-2xl bg-[#FBF9F5] border border-[#B7A05E]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#B8623F]/10 text-[#B8623F] flex items-center justify-center shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <span className="text-xs font-bold text-[#3A2E1F] block">
                        Destino Selecionado para Entrega:
                      </span>
                      <span className="text-[11px] text-[#7E6C58]">
                        O frete deste pedido foi calculado com base neste local.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-semibold text-[#B8623F] hover:text-[#994E30] hover:underline cursor-pointer px-2.5 py-1 rounded-lg hover:bg-[#B8623F]/5 transition-colors shrink-0"
                    title="Voltar à cesta para alterar o local e recalcular o frete"
                  >
                    Alterar na cesta
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#3A2E1F]/10">
                  <span className="font-bold text-xs bg-white px-2.5 py-1 rounded-lg border border-[#3A2E1F]/15 text-[#3A2E1F] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#B8623F]" />
                    {matchedCepRule?.label || initialCep || 'Local Selecionado'}
                  </span>
                  <span className="text-xs text-emerald-800 ml-auto font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    {pricing.delivery_fee === 0 ? 'Frete Grátis' : `Frete: R$ ${pricing.delivery_fee.toFixed(2).replace('.', ',')}`}
                  </span>
                </div>
              </div>

              {/* Formulário de Endereço (Rua, Número, Bairro e Complemento editáveis; Cidade e CEP fixos) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#554432] mb-1">Rua / Logradouro *</label>
                  <input
                    id="checkout-rua"
                    type="text"
                    required
                    placeholder="Ex: Rua Oscar Freire"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#554432] mb-1">Número *</label>
                  <input
                    id="checkout-numero"
                    type="text"
                    required
                    placeholder="Ex: 920"
                    value={address.number}
                    onChange={(e) => setAddress({ ...address, number: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#554432] mb-1">Bairro *</label>
                  <input
                    id="checkout-bairro"
                    type="text"
                    required
                    placeholder="Ex: Jardins / Centro"
                    value={address.neighborhood}
                    onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#554432] mb-1">Complemento</label>
                  <input
                    id="checkout-complemento"
                    type="text"
                    placeholder="Apto, bloco, casa..."
                    value={address.complement}
                    onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#554432] mb-1 flex items-center justify-between">
                    <span>Cidade / UF (Fixo)</span>
                  </label>
                  <div className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/15 bg-gray-100/90 text-[#554432] font-medium flex items-center justify-between select-none cursor-not-allowed">
                    <span>{storeSettings?.city || 'Espera Feliz'} - {storeSettings?.state || 'MG'}</span>
                    <Lock className="w-3.5 h-3.5 text-[#7E6C58]" />
                  </div>
                </div>

                {/* Caso o CEP não tenha vindo do carrinho (fallback) */}
                {!initialCep && (
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-[#554432] mb-1">CEP *</label>
                    <input
                      id="checkout-cep"
                      type="text"
                      required
                      placeholder="00000-000"
                      maxLength={9}
                      value={address.zip_code}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 5) {
                          val = `${val.slice(0, 5)}-${val.slice(5, 8)}`;
                        }
                        setAddress({ ...address, zip_code: val });
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#F3ECDD] border border-[#B7A05E]/30 text-xs text-[#554432] space-y-1">
              <span className="font-bold text-[#3A2E1F] block">📍 Local de Retirada:</span>
              <p>
                {storeSettings?.name || 'Affeto Pães Artesanais'} —{' '}
                {storeSettings?.address || 'Rua das Farinhas, 128 - Jardins, São Paulo - SP'}
              </p>
              <p className="text-[11px] text-[#7E6C58]">Seus pães estarão embalados com seu nome na bancada no horário selecionado.</p>
            </div>
          )}

          {/* Step 4: Payment Method Selection */}
          <div className="space-y-3 pt-3 border-t border-[#3A2E1F]/10">
            <h3 className="font-serif font-bold text-sm text-[#3A2E1F] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#B8623F]" />
              <span>4. Forma de Pagamento</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label
                id="opt-pay-pix"
                onClick={() => setPaymentMethod('PIX')}
                className={`p-3 rounded-2xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                  paymentMethod === 'PIX'
                    ? 'border-[#B8623F] bg-[#B8623F]/5 text-[#3A2E1F] shadow-2xs font-semibold ring-1 ring-[#B8623F]'
                    : 'border-[#3A2E1F]/15 hover:bg-[#FAF7F0] text-[#554432]'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5">
                  <QrCode className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">PIX Imediato</span>
                <span className="text-[10px] text-emerald-700 mt-0.5">Aprovação em segundos</span>
              </label>

              <label
                id="opt-pay-credit"
                onClick={() => setPaymentMethod('CREDIT_CARD')}
                className={`p-3 rounded-2xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                  paymentMethod === 'CREDIT_CARD'
                    ? 'border-[#B8623F] bg-[#B8623F]/5 text-[#3A2E1F] shadow-2xs font-semibold ring-1 ring-[#B8623F]'
                    : 'border-[#3A2E1F]/15 hover:bg-[#FAF7F0] text-[#554432]'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-1.5">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">Cartão (Online)</span>
                <span className="text-[10px] text-[#7E6C58] mt-0.5">Mercado Pago</span>
              </label>

              <label
                id="opt-pay-on-delivery"
                onClick={() => setPaymentMethod('PAY_ON_DELIVERY')}
                className={`p-3 rounded-2xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                  paymentMethod === 'PAY_ON_DELIVERY'
                    ? 'border-[#B8623F] bg-[#B8623F]/5 text-[#3A2E1F] shadow-2xs font-semibold ring-1 ring-[#B8623F]'
                    : 'border-[#3A2E1F]/15 hover:bg-[#FAF7F0] text-[#554432]'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-1.5">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">Pagar na Entrega</span>
                <span className="text-[10px] text-amber-800 mt-0.5">Débito, Crédito ou Dinheiro</span>
              </label>
            </div>

            {/* Sub-opções detalhadas para Pagar na Entrega */}
            {paymentMethod === 'PAY_ON_DELIVERY' && (
              <div className="p-4 rounded-2xl bg-[#FBF9F5] border border-[#B7A05E]/40 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3A2E1F] flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#B8623F]" />
                    Como você prefere pagar no ato da entrega?
                  </span>
                  <span className="text-[10px] text-[#B8623F] font-bold bg-[#B8623F]/10 px-2 py-0.5 rounded-full">
                    {deliveryType === 'PICKUP' ? 'No Balcão' : 'Na Entrega'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    id="pay-delivery-debit"
                    onClick={() => setDeliveryPaymentSubtype('DEBIT_CARD')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      deliveryPaymentSubtype === 'DEBIT_CARD'
                        ? 'border-[#B8623F] bg-white text-[#B8623F] font-bold shadow-xs ring-1 ring-[#B8623F]'
                        : 'border-[#3A2E1F]/15 bg-[#FAF7F0] text-[#554432] hover:bg-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mb-1" />
                    <span className="text-xs">Cartão Débito</span>
                    <span className="text-[10px] text-[#7E6C58]">Levar máquina</span>
                  </button>

                  <button
                    type="button"
                    id="pay-delivery-credit"
                    onClick={() => setDeliveryPaymentSubtype('CREDIT_CARD')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      deliveryPaymentSubtype === 'CREDIT_CARD'
                        ? 'border-[#B8623F] bg-white text-[#B8623F] font-bold shadow-xs ring-1 ring-[#B8623F]'
                        : 'border-[#3A2E1F]/15 bg-[#FAF7F0] text-[#554432] hover:bg-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mb-1" />
                    <span className="text-xs">Cartão Crédito</span>
                    <span className="text-[10px] text-[#7E6C58]">Levar máquina</span>
                  </button>

                  <button
                    type="button"
                    id="pay-delivery-cash"
                    onClick={() => setDeliveryPaymentSubtype('CASH')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      deliveryPaymentSubtype === 'CASH'
                        ? 'border-[#B8623F] bg-white text-[#B8623F] font-bold shadow-xs ring-1 ring-[#B8623F]'
                        : 'border-[#3A2E1F]/15 bg-[#FAF7F0] text-[#554432] hover:bg-white'
                    }`}
                  >
                    <Banknote className="w-4 h-4 mb-1" />
                    <span className="text-xs">Dinheiro</span>
                    <span className="text-[10px] text-[#7E6C58]">Em espécie</span>
                  </button>
                </div>

                {/* Seção de Troco para Dinheiro */}
                {deliveryPaymentSubtype === 'CASH' && (
                  <div className="pt-2 border-t border-[#3A2E1F]/10 space-y-2.5 animate-fadeIn">
                    <label className="block text-xs font-bold text-[#3A2E1F]">
                      Precisa de troco?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        id="btn-troco-nao"
                        onClick={() => {
                          setNeedsChange(false);
                          setChangeForInput('');
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs text-center transition-all cursor-pointer ${
                          !needsChange
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                            : 'border-[#3A2E1F]/15 bg-white text-[#554432] hover:bg-[#FAF7F0]'
                        }`}
                      >
                        Não preciso de troco
                      </button>
                      <button
                        type="button"
                        id="btn-troco-sim"
                        onClick={() => setNeedsChange(true)}
                        className={`py-2 px-3 rounded-xl border text-xs text-center transition-all cursor-pointer ${
                          needsChange
                            ? 'border-[#B8623F] bg-[#B8623F]/10 text-[#B8623F] font-bold'
                            : 'border-[#3A2E1F]/15 bg-white text-[#554432] hover:bg-[#FAF7F0]'
                        }`}
                      >
                        Sim, preciso de troco
                      </button>
                    </div>

                    {needsChange && (
                      <div className="p-3 bg-white rounded-xl border border-[#3A2E1F]/15 space-y-2 animate-fadeIn">
                        <label className="block text-xs font-semibold text-[#554432]">
                          Troco para quanto? (R$)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7E6C58]">
                            R$
                          </span>
                          <input
                            id="input-troco-para"
                            type="text"
                            placeholder="Ex: 50,00 ou 100,00"
                            value={changeForInput}
                            onChange={(e) => setChangeForInput(e.target.value)}
                            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none font-bold"
                          />
                        </div>

                        {parsedChangeFor > 0 && parsedChangeFor >= pricing.total && (
                          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between">
                            <span>Troco a devolver:</span>
                            <span className="font-bold text-xs">
                              R$ {changeDue.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        )}

                        {parsedChangeFor > 0 && parsedChangeFor < pricing.total && (
                          <p className="text-[11px] text-red-600 font-medium">
                            O valor informado deve ser maior que o total do pedido (R$ {pricing.total.toFixed(2).replace('.', ',')}).
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes for order */}
          <div className="space-y-1 pt-2">
            <label className="block text-xs font-semibold text-[#554432]">
              Instruções adicionais de entrega ou retirada (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Tocar interfone 52, deixar na portaria..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none"
            />
          </div>

          {/* Submit Footer */}
          <div className="pt-4 border-t border-[#3A2E1F]/15 flex items-center justify-between">
            <div>
              <span className="block text-[11px] text-[#7E6C58]">Total a pagar:</span>
              <span className="font-serif font-bold text-xl text-[#B8623F]">
                R$ {pricing.total.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <button
              id="btn-confirmar-gerar-pedido"
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3.5 bg-[#B8623F] hover:bg-[#994E30] disabled:bg-gray-400 text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando Pedido...</span>
                </>
              ) : (
                <span>Confirmar & Gerar Pagamento</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
