import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Copy,
  Check,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { getWhatsAppOrderUrl, BAKERY_WHATSAPP_NUMBER } from '../lib/whatsappSummary';
import { paymentService } from '../services/paymentService';
import { Order, PaymentMethod, PaymentRecord, StoreSettings } from '../types';

interface PaymentScreenProps {
  order: Order;
  paymentMethod: PaymentMethod;
  storeSettings?: StoreSettings;
  onPaymentApproved: (updatedOrder: Order) => void;
  onViewOrderTracking: (order: Order) => void;
  onBackToMenu: () => void;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  order,
  paymentMethod,
  storeSettings,
  onPaymentApproved,
  onViewOrderTracking,
  onBackToMenu,
}) => {
  const [payment, setPayment] = useState<PaymentRecord | null>(order.payment || null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order>(order);

  // Credit card form state for simulation
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardHolder, setCardHolder] = useState(order.customer_name);
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');

  // Initialize payment record if not yet generated
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!payment) {
        const pay = await paymentService.createPayment(order, paymentMethod);
        if (mounted) setPayment(pay);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [order, paymentMethod]);

  const handleCopyPix = () => {
    if (payment?.qr_code) {
      navigator.clipboard.writeText(payment.qr_code);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  const handleSimulatePaymentApproval = async () => {
    setIsSimulating(true);
    try {
      const updated = await paymentService.simulateApproval(currentOrder.id);
      if (updated) {
        setCurrentOrder(updated);
        onPaymentApproved(updated);
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const isApproved = currentOrder.payment_status === 'APPROVED' || currentOrder.status !== 'PENDING_PAYMENT';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="bg-white border border-[#3A2E1F]/15 rounded-3xl overflow-hidden shadow-lg">
        {/* Header */}
        <div className="bg-[#FAF7F0] p-6 border-b border-[#3A2E1F]/10 text-center relative">
          <span className="inline-block px-3 py-1 rounded-full bg-[#B8623F]/10 text-[#B8623F] text-xs font-bold uppercase tracking-wider mb-2">
            Pedido {currentOrder.code}
          </span>
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#3A2E1F]">
            {isApproved ? 'Pagamento Aprovado!' : 'Aguardando Pagamento'}
          </h2>
          <p className="text-xs text-[#7E6C58] mt-1">
            Total a ser pago: <strong className="text-base text-[#3A2E1F]">R$ {currentOrder.total.toFixed(2).replace('.', ',')}</strong>
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* WhatsApp Action Card */}
          <div className="bg-emerald-50 border border-emerald-300/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 text-left w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                <MessageCircle className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-emerald-950">
                  Resumo registrado para a padaria
                </h4>
                <p className="text-[11px] text-emerald-800">
                  Envie o comprovante e os detalhes diretamente para nosso WhatsApp: <strong>+55 32 98468-0513</strong>
                </p>
              </div>
            </div>
            <a
              id="btn-continuar-whatsapp"
              href={getWhatsAppOrderUrl(currentOrder, storeSettings?.whatsapp || BAKERY_WHATSAPP_NUMBER)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Continuar no WhatsApp</span>
            </a>
          </div>

          {/* Success screen once approved */}
          {isApproved ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="font-serif font-bold text-xl text-[#3A2E1F]">
                  Tudo pronto com seu pedido!
                </h3>
                <p className="text-xs text-[#554432] max-w-md mx-auto leading-relaxed">
                  O pagamento foi confirmado pelo Mercado Pago e o pedido já entrou na nossa fila de produção artesanal.
                </p>
              </div>

              <div className="p-4 bg-[#F3ECDD]/60 rounded-2xl border border-[#B7A05E]/30 text-left text-xs max-w-md mx-auto space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#7E6C58]">Agendado para:</span>
                  <span className="font-semibold text-[#3A2E1F]">
                    {currentOrder.scheduled_date} ({currentOrder.scheduled_time})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7E6C58]">Tipo de Entrega:</span>
                  <span className="font-semibold text-[#3A2E1F]">
                    {currentOrder.delivery_type === 'DELIVERY' ? 'Entrega em domicílio' : 'Retirada no balcão'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7E6C58]">Status Atual:</span>
                  <span className="font-bold text-emerald-700">Confirmado / Em Produção</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  id="btn-whatsapp-approved"
                  href={getWhatsAppOrderUrl(currentOrder, storeSettings?.whatsapp || BAKERY_WHATSAPP_NUMBER)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Continuar no WhatsApp</span>
                </a>
                <button
                  id="btn-acompanhar-pedido-ao-vivo"
                  onClick={() => onViewOrderTracking(currentOrder)}
                  className="px-6 py-3 bg-[#B8623F] hover:bg-[#994E30] text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Acompanhar Pedido ao Vivo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onBackToMenu}
                  className="px-5 py-3 bg-white border border-[#3A2E1F]/20 text-[#3A2E1F] font-medium text-sm rounded-xl hover:bg-[#FAF7F0] transition-colors"
                >
                  Voltar ao Início
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* If PIX */}
              {paymentMethod === 'PIX' && (
                <div className="space-y-5">
                  <div className="bg-[#FAF7F0] p-4 sm:p-6 rounded-2xl border border-[#B7A05E]/30 flex flex-col sm:flex-row items-center gap-6">
                    {/* QR Code display */}
                    <div className="w-48 h-48 bg-white p-3 rounded-2xl border border-[#3A2E1F]/15 flex flex-col items-center justify-center shadow-xs shrink-0">
                      {/* Generates a real visual QR code preview */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                          payment?.qr_code || 'affeto-pix'
                        )}`}
                        alt="QR Code PIX Mercado Pago"
                        className="w-36 h-36 object-contain"
                      />
                      <span className="text-[10px] text-[#7E6C58] mt-1 font-mono font-medium">
                        PIX Mercado Pago
                      </span>
                    </div>

                    <div className="space-y-3 flex-1 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-emerald-700 font-bold text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>Aguardando recebimento do PIX...</span>
                      </div>
                      <h3 className="font-serif font-bold text-lg text-[#3A2E1F]">
                        Pague com o aplicativo do seu banco
                      </h3>
                      <p className="text-xs text-[#554432] leading-relaxed">
                        Abra o app do seu banco, escolha <strong>Pagar com PIX</strong> e aponte a câmera para o QR Code ao lado, ou use o código Copia e Cola abaixo.
                      </p>

                      <div className="pt-1 flex items-center gap-2 text-[11px] text-[#7E6C58]">
                        <Clock className="w-3.5 h-3.5 text-[#B7A05E]" />
                        <span>Código válido por 30 minutos</span>
                      </div>
                    </div>
                  </div>

                  {/* PIX Copia e Cola field */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#3A2E1F]">
                      Código PIX Copia e Cola:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={payment?.qr_code || 'Carregando código PIX...'}
                        className="w-full text-xs font-mono p-3 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0] text-[#554432] truncate"
                      />
                      <button
                        id="btn-copiar-pix"
                        onClick={handleCopyPix}
                        className="px-4 py-2.5 bg-[#3A2E1F] hover:bg-[#554432] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedPix ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* If Credit Card */}
              {paymentMethod === 'CREDIT_CARD' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#3A2E1F]/15 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#3A2E1F] flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-[#B8623F]" />
                        Cartão de Crédito
                      </span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
                        Ambiente Seguro Mercado Pago
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-[#554432] mb-1">
                          Número do Cartão
                        </label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#554432] mb-1">
                          Nome no Cartão
                        </label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-[#554432] mb-1">
                            Validade
                          </label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#554432] mb-1">
                            CVV
                          </label>
                          <input
                            type="text"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sandbox / Testing Helper as required by Section 7 Phase 5 */}
              <div className="pt-4 border-t border-[#3A2E1F]/15">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Simulador de Sandbox Mercado Pago (DoD Fase 5)
                    </span>
                    <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md font-medium">
                      Ambiente de Testes
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Você pode simular a notificação instantânea do Webhook Mercado Pago para aprovar este pedido sem precisar escanear com dinheiro real.
                  </p>
                  <button
                    id="btn-simular-pagamento-webhook"
                    onClick={handleSimulatePaymentApproval}
                    disabled={isSimulating}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {isSimulating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Processando webhook...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Simular Confirmação via Webhook Mercado Pago</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
