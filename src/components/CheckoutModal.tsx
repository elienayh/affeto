import React, { useState } from 'react';
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
} from 'lucide-react';
import { orderService } from '../services/orderService';
import {
  CartItem,
  CustomerAddress,
  DeliveryType,
  Order,
  PaymentMethod,
  PricingBreakdown,
  StoreSettings,
} from '../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  pricing: PricingBreakdown;
  deliveryType: DeliveryType;
  selectedZoneId?: string;
  storeSettings: StoreSettings;
  onOrderCreated: (order: Order, paymentMethod: PaymentMethod) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  pricing,
  deliveryType,
  selectedZoneId,
  storeSettings,
  onOrderCreated,
}) => {
  if (!isOpen) return null;

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => {
    // Default to today or tomorrow
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('08:30 - 10:00 (Fornada Matinal)');

  // Address
  const [address, setAddress] = useState<CustomerAddress>({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (!customerName.trim() || !customerPhone.trim() || !customerEmail.trim()) {
      setErrorMessage('Por favor, preencha seus dados de contato (Nome, Telefone e E-mail).');
      return;
    }

    if (deliveryType === 'DELIVERY') {
      if (!address.street.trim() || !address.number.trim() || !address.neighborhood.trim()) {
        setErrorMessage('Por favor, preencha o endereço completo de entrega.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
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
        })),
      };

      const result = await orderService.createOrder(orderPayload);

      if (result.error || !result.order) {
        setErrorMessage(result.error || 'Erro ao processar o pedido.');
        setIsSubmitting(false);
        return;
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
                {deliveryType === 'DELIVERY' ? 'Entrega em domicílio' : 'Retirada na loja Affeto'}
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

          {/* Step 1: Customer Contact */}
          <div className="space-y-3">
            <h3 className="font-serif font-bold text-sm text-[#3A2E1F] flex items-center gap-2">
              <User className="w-4 h-4 text-[#B8623F]" />
              <span>1. Seus Dados para Identificação</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#554432] mb-1">
                  Nome Completo *
                </label>
                <input
                  id="checkout-nome"
                  type="text"
                  required
                  placeholder="Ex: Carlos Drummond"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#554432] mb-1">
                  WhatsApp / Celular *
                </label>
                <input
                  id="checkout-telefone"
                  type="tel"
                  required
                  placeholder="(11) 98888-7777"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#554432] mb-1">
                  E-mail para recibo *
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  required
                  placeholder="seuemail@exemplo.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Date and Time Window */}
          <div className="space-y-3 pt-3 border-t border-[#3A2E1F]/10">
            <h3 className="font-serif font-bold text-sm text-[#3A2E1F] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#B8623F]" />
              <span>2. Agendamento da Fornada & Entrega</span>
            </h3>

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
                  <label className="block text-xs font-semibold text-[#554432] mb-1">CEP</label>
                  <input
                    id="checkout-cep"
                    type="text"
                    placeholder="00000-000"
                    value={address.zip_code}
                    onChange={(e) => setAddress({ ...address, zip_code: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] focus:ring-2 focus:ring-[#B8623F] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#F3ECDD] border border-[#B7A05E]/30 text-xs text-[#554432] space-y-1">
              <span className="font-bold text-[#3A2E1F] block">📍 Local de Retirada:</span>
              <p>{storeSettings.name} — {storeSettings.address}</p>
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
