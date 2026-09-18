import React, { useState, useEffect, useCallback } from 'react';
import {
  Copy,
  Check,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  MessageCircle,
  QrCode,
  Lock,
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
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [isLoadingPayment, setIsLoadingPayment] = useState(!order.payment);
  const [checkFeedback, setCheckFeedback] = useState<string | null>(null);

  const isApproved = currentOrder.payment_status === 'APPROVED';

  // Inicializa o registro de cobrança real no Mercado Pago
  useEffect(() => {
    let mounted = true;
    const initPayment = async () => {
      if (!payment) {
        setIsLoadingPayment(true);
        try {
          const pay = await paymentService.createPayment(order, paymentMethod);
          if (mounted && pay) {
            setPayment(pay);
          }
        } finally {
          if (mounted) setIsLoadingPayment(false);
        }
      }
    };

    initPayment();
    return () => {
      mounted = false;
    };
  }, [order, paymentMethod]);

  // Função de verificação de status no servidor/Mercado Pago
  const verifyPaymentStatus = useCallback(async (isManual = false) => {
    if (isApproved) return;
    if (isManual) {
      setIsCheckingStatus(true);
      setCheckFeedback(null);
    }

    try {
      const result = await paymentService.checkPaymentStatus(currentOrder.id);
      if (result.is_approved && result.order) {
        setCurrentOrder(result.order);
        onPaymentApproved(result.order);
      } else if (isManual) {
        setCheckFeedback('Pagamento ainda não identificado pelo banco. Aguarde alguns instantes após transferir.');
        setTimeout(() => setCheckFeedback(null), 5000);
      }
    } catch (err) {
      if (isManual) {
        setCheckFeedback('Falha ao verificar status. Tente novamente em alguns segundos.');
      }
    } finally {
      if (isManual) {
        setIsCheckingStatus(false);
      }
    }
  }, [currentOrder.id, isApproved, onPaymentApproved]);

  // Polling automático a cada 4 segundos enquanto o pagamento estiver pendente
  useEffect(() => {
    if (isApproved) return;

    const interval = setInterval(() => {
      verifyPaymentStatus(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [isApproved, verifyPaymentStatus]);

  const handleCopyPix = () => {
    if (payment?.qr_code) {
      navigator.clipboard.writeText(payment.qr_code);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

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
            Total a pagar: <strong className="text-base text-[#3A2E1F]">R$ {currentOrder.total.toFixed(2).replace('.', ',')}</strong>
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Card WhatsApp de Contato Direto */}
          <div className="bg-emerald-50 border border-emerald-300/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 text-left w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                <MessageCircle className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-emerald-950">
                  Canal Direto no WhatsApp
                </h4>
                <p className="text-[11px] text-emerald-800">
                  Envie seu comprovante ou tire dúvidas com nossa equipe: <strong>+55 32 98468-0513</strong>
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
              <span>Abrir no WhatsApp</span>
            </a>
          </div>

          {/* Tela de Sucesso após Pagamento Confirmado */}
          {isApproved ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="font-serif font-bold text-xl text-[#3A2E1F]">
                  Pagamento Confirmado com Sucesso!
                </h3>
                <p className="text-xs text-[#554432] max-w-md mx-auto leading-relaxed">
                  O Mercado Pago processou e aprovou seu pagamento. Seu pedido artesanal já está reservado e entrou na esteira de produção.
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
                {payment?.external_id && (
                  <div className="flex justify-between pt-1 border-t border-[#3A2E1F]/10 text-[11px]">
                    <span className="text-[#7E6C58]">Identificador Mercado Pago:</span>
                    <span className="font-mono text-[#3A2E1F] font-semibold">{payment.external_id}</span>
                  </div>
                )}
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
                  <span>Enviar Comprovante</span>
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
              {isLoadingPayment ? (
                <div className="py-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#B8623F] animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-[#3A2E1F]">
                    Gerando cobrança oficial no Mercado Pago...
                  </p>
                  <p className="text-xs text-[#7E6C58]">
                    Conectando com o gateway seguro para gerar seu QR Code ou link de pagamento.
                  </p>
                </div>
              ) : (
                <>
                  {/* Seletor / Exibição PIX */}
                  {paymentMethod === 'PIX' && (
                    <div className="space-y-5">
                      <div className="bg-[#FAF7F0] p-4 sm:p-6 rounded-2xl border border-[#B7A05E]/30 flex flex-col sm:flex-row items-center gap-6">
                        {/* Exibição QR Code Real */}
                        <div className="w-48 h-48 bg-white p-3 rounded-2xl border border-[#3A2E1F]/15 flex flex-col items-center justify-center shadow-xs shrink-0">
                          {payment?.qr_code_base64 ? (
                            <img
                              src={`data:image/png;base64,${payment.qr_code_base64}`}
                              alt="QR Code PIX Mercado Pago"
                              className="w-36 h-36 object-contain"
                            />
                          ) : (
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                payment?.qr_code || 'affeto-pix'
                              )}`}
                              alt="QR Code PIX Mercado Pago"
                              className="w-36 h-36 object-contain"
                            />
                          )}
                          <span className="text-[10px] text-[#7E6C58] mt-1 font-mono font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            PIX Mercado Pago
                          </span>
                        </div>

                        <div className="space-y-3 flex-1 text-center sm:text-left">
                          <div className="flex items-center justify-center sm:justify-start gap-2 text-emerald-700 font-bold text-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>Aguardando recebimento do PIX...</span>
                          </div>
                          <h3 className="font-serif font-bold text-lg text-[#3A2E1F]">
                            Pague com o aplicativo do seu banco
                          </h3>
                          <p className="text-xs text-[#554432] leading-relaxed">
                            Abra o app do seu banco, escolha <strong>Pagar com PIX</strong> e aponte a câmera para o QR Code ao lado, ou copie o código Copia e Cola abaixo.
                          </p>

                          <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 text-[11px] text-[#7E6C58]">
                            <Clock className="w-3.5 h-3.5 text-[#B7A05E]" />
                            <span>Aprovação instantânea 24h</span>
                          </div>
                        </div>
                      </div>

                      {/* Campo PIX Copia e Cola */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-[#3A2E1F]">
                          Código PIX Copia e Cola:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={payment?.qr_code || 'Carregando código PIX...'}
                            className="w-full text-xs font-mono p-3 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0] text-[#554432] truncate select-all"
                          />
                          <button
                            id="btn-copiar-pix"
                            onClick={handleCopyPix}
                            className="px-4 py-2.5 bg-[#3A2E1F] hover:bg-[#554432] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
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

                  {/* Cartão de Crédito / Checkout Pro Mercado Pago */}
                  {paymentMethod === 'CREDIT_CARD' && (
                    <div className="space-y-5">
                      <div className="p-6 rounded-2xl bg-[#FAF7F0] border border-[#3A2E1F]/15 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-[#3A2E1F] flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-[#B8623F]" />
                            Pagamento Seguro com Cartão
                          </span>
                          <span className="text-[11px] text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3 text-emerald-700" />
                            Mercado Pago Oficial
                          </span>
                        </div>

                        <p className="text-xs text-[#554432] leading-relaxed">
                          Para sua máxima segurança, o pagamento por cartão é processado diretamente pelo <strong>Mercado Pago</strong> com criptografia de ponta a ponta e proteção antifraude. Aceita parcelamento em até 12x.
                        </p>

                        <div className="bg-white p-4 rounded-xl border border-[#3A2E1F]/10 space-y-3">
                          <div className="flex items-center justify-between text-xs text-[#7E6C58]">
                            <span>Valor total da compra:</span>
                            <span className="font-bold text-sm text-[#3A2E1F]">
                              R$ {currentOrder.total.toFixed(2).replace('.', ',')}
                            </span>
                          </div>

                          {payment?.ticket_url ? (
                            <a
                              id="btn-pagar-mercadopago-checkout"
                              href={payment.ticket_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-3.5 bg-[#009EE3] hover:bg-[#0086c3] text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <CreditCard className="w-4 h-4" />
                              <span>Pagar com Cartão no Mercado Pago</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          ) : (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                              Gerando link de pagamento com o Mercado Pago...
                            </div>
                          )}

                          <p className="text-[11px] text-[#7E6C58] text-center">
                            Ao abrir a janela do Mercado Pago, você poderá escolher a bandeira do seu cartão e a quantidade de parcelas.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status em Tempo Real & Verificação Manual */}
                  <div className="pt-4 border-t border-[#3A2E1F]/15 space-y-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FAF7F0] border border-[#3A2E1F]/10">
                      <div className="flex items-center gap-2 text-xs text-[#554432]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>Sincronização em tempo real ativa com o Mercado Pago</span>
                      </div>

                      <button
                        id="btn-verificar-pagamento-manual"
                        onClick={() => verifyPaymentStatus(true)}
                        disabled={isCheckingStatus}
                        className="w-full sm:w-auto px-4 py-2 bg-white border border-[#3A2E1F]/20 hover:bg-[#F3ECDD] text-[#3A2E1F] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                        <span>{isCheckingStatus ? 'Consultando banco...' : 'Verificar Pagamento Agora'}</span>
                      </button>
                    </div>

                    {checkFeedback && (
                      <p className="text-xs text-amber-800 text-center animate-fadeIn">
                        {checkFeedback}
                      </p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
