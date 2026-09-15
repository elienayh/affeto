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
} from 'lucide-react';
import { getNextAvailableBatch } from '../lib/batchScheduler';
import { matchDeliveryCep } from '../lib/pricingEngine';
import {
  cleanPhoneDigits,
  findCustomerByPhone,
  formatPhoneMask,
  getWhatsAppOrderUrl,
  saveCustomerByPhone,
  BAKERY_WHATSAPP_NUMBER,
} from '../lib/whatsappSummary';
import { orderService } from '../services/orderService';
import {
  CartItem,
  CustomerAddress,
  DeliveryCepRule,
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

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
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
  if (!isOpen) return null;

  // Detect special scheduled products in cart (e.g. Pão com Nutella que só sai Terça e Sexta)
  const scheduledItems = useMemo(() => {
    return items.filter((it) => it.product.schedule_config?.is_scheduled_only);
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
  const [scheduledTime, setScheduledTime] = useState('08:30 - 10:00 (Fornada Matinal)');

  // Address
  const [address, setAddress] = useState<CustomerAddress>({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: storeSettings?.city || 'Espera Feliz',
    state: storeSettings?.state || 'MG',
    zip_code: initialCep,
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Look up customer by phone and auto-fill details
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const formatted = formatPhoneMask(rawVal);
    setCustomerPhone(formatted);

    const digits = cleanPhoneDigits(formatted);
    if (digits.length >= 10) {
      const found = findCustomerByPhone(digits, orders);
      if (found) {
        if (found.name) setCustomerName(found.name);
        if (found.email) setCustomerEmail(found.email);
        if (found.address) {
          setAddress((prev) => ({
            ...prev,
            street: found.address?.street || prev.street,
            number: found.address?.number || prev.number,
            complement: found.address?.complement || prev.complement,
            neighborhood: found.address?.neighborhood || prev.neighborhood,
            city: found.address?.city || prev.city,
            state: found.address?.state || prev.state,
            zip_code: found.address?.zip_code || prev.zip_code,
          }));
        }
        setAutoFillMessage(`Cliente reconhecido: ${found.name}! Preenchemos seus dados automaticamente.`);
      } else {
        setAutoFillMessage(null);
      }
    } else {
      setAutoFillMessage(null);
    }
  };

  const handlePhoneBlur = () => {
    const digits = cleanPhoneDigits(customerPhone);
    if (digits.length >= 8 && !autoFillMessage) {
      const found = findCustomerByPhone(digits, orders);
      if (found) {
        if (found.name) setCustomerName(found.name);
        if (found.email) setCustomerEmail(found.email);
        if (found.address) {
          setAddress((prev) => ({
            ...prev,
            street: found.address?.street || prev.street,
            number: found.address?.number || prev.number,
            complement: found.address?.complement || prev.complement,
            neighborhood: found.address?.neighborhood || prev.neighborhood,
            city: found.address?.city || prev.city,
            state: found.address?.state || prev.state,
            zip_code: found.address?.zip_code || prev.zip_code,
          }));
        }
        setAutoFillMessage(`Cliente reconhecido: ${found.name}! Preenchemos seus dados automaticamente.`);
      }
    }
  };

  // Cep validation
  const currentCep = address.zip_code || initialCep;
  const matchedCepRule = currentCep ? matchDeliveryCep(currentCep, deliveryCepRules) : null;
  const isDeliveryCepValid = deliveryType === 'PICKUP' || !!matchedCepRule;

  const availableTimeSlots = [
    '08:00 - 09:30 (Primeira Fornada da Manhã)',
    '09:30 - 11:00 (Café & Brunch)',
    '11:30 - 13:00 (Fornada do Meio-Dia)',
    '15:00 - 16:30 (Fornada da Tarde)',
    '16:30 - 18:30 (Chá da Tarde & Happy Hour)',
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
        setErrorMessage('Por favor, preencha o endereço completo de entrega.');
        return;
      }
      if (!address.zip_code.trim()) {
        setErrorMessage('Por favor, informe o CEP para calcular a rota de entrega.');
        return;
      }
      if (!isDeliveryCepValid) {
        setErrorMessage(
          'O CEP informado não está na rota de entregas da padaria. Por serem produtos artesanais frescos, não enviamos pelo correio. Por favor, escolha a opção Retirada no Balcão.'
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Save customer details linked to phone number for future instant auto-fill
      saveCustomerByPhone({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        email: customerEmail.trim(),
        address: deliveryType === 'DELIVERY' ? address : undefined,
      });

      const orderPayload = {
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || `${cleanPhoneDigits(customerPhone)}@affeto.com.br`,
        customer_phone: customerPhone.trim(),
        delivery_type: deliveryType,
        delivery_zone_id: selectedZoneId,
        address: deliveryType === 'DELIVERY' ? address : undefined,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        coupon_code: pricing.coupon_code,
        notes: notes.trim(),
        payment_method: paymentMethod,
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
              {/* Telefone celular como fonte principal */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#3A2E1F] mb-1">
                  Número de Telefone / WhatsApp *
                </label>
                <div className="relative">
                  <input
                    id="checkout-telefone"
                    type="tel"
                    required
                    placeholder="(32) 98468-0513"
                    value={customerPhone}
                    onChange={handlePhoneChange}
                    onBlur={handlePhoneBlur}
                    className="w-full text-xs font-semibold p-3 pl-10 rounded-xl border-2 border-[#B8623F]/40 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:border-[#B8623F] focus:outline-none"
                  />
                  <Phone className="w-4 h-4 text-[#B8623F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[10px] text-[#7E6C58] mt-1 block">
                  Informe seu WhatsApp com DDD. Se já comprou antes, seus dados serão preenchidos automaticamente.
                </span>
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
              <h3 className="font-serif font-bold text-sm text-[#3A2E1F] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#B8623F]" />
                <span>3. Endereço de Entrega</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#554432] mb-1">Rua / Avenida *</label>
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
                  <label className="block text-xs font-semibold text-[#554432] mb-1">Complemento</label>
                  <input
                    id="checkout-complemento"
                    type="text"
                    placeholder="Apto, bloco..."
                    value={address.complement}
                    onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#554432] mb-1">Bairro *</label>
                  <input
                    id="checkout-bairro"
                    type="text"
                    required
                    placeholder="Ex: Jardins"
                    value={address.neighborhood}
                    onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none"
                  />
                </div>

                <div>
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
              </div>

              {/* CEP Validation Feedback inside Address */}
              {address.zip_code.replace(/\D/g, '').length >= 5 && (
                <div>
                  {matchedCepRule ? (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Região Atendida: <strong>{matchedCepRule.label || address.zip_code}</strong></span>
                      </span>
                      <span className="font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                        Taxa: R$ {matchedCepRule.fee.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">CEP fora da rota de perecíveis</span>
                        <span className="text-[11px] text-red-600">
                          Não realizamos entregas pelo correio por sermos uma padaria artesanal com produtos frescos do dia. Verifique seu CEP ou selecione Retirada no Balcão.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
              <span>4. Forma de Pagamento (Mercado Pago)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <label
                onClick={() => setPaymentMethod('PIX')}
                className={`p-3.5 rounded-2xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                  paymentMethod === 'PIX'
                    ? 'border-[#B8623F] bg-[#B8623F]/5 text-[#3A2E1F] shadow-2xs font-semibold'
                    : 'border-[#3A2E1F]/15 hover:bg-[#FAF7F0] text-[#554432]'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5">
                  <QrCode className="w-4 h-4" />
                </div>
                <span className="text-xs">PIX Imediato</span>
                <span className="text-[10px] text-emerald-700 mt-0.5">Aprovação em segundos</span>
              </label>

              <label
                onClick={() => setPaymentMethod('CREDIT_CARD')}
                className={`p-3.5 rounded-2xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                  paymentMethod === 'CREDIT_CARD'
                    ? 'border-[#B8623F] bg-[#B8623F]/5 text-[#3A2E1F] shadow-2xs font-semibold'
                    : 'border-[#3A2E1F]/15 hover:bg-[#FAF7F0] text-[#554432]'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-1.5">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-xs">Cartão de Crédito</span>
                <span className="text-[10px] text-[#7E6C58] mt-0.5">Checkout seguro</span>
              </label>
            </div>
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
