import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { Order, PaymentMethod, PaymentRecord } from '../types';

let mpClient: MercadoPagoConfig | null = null;

export function getMercadoPagoToken(): string {
  return process.env.MERCADOPAGO_ACCESS_TOKEN || '';
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(getMercadoPagoToken() && getMercadoPagoToken().trim().length > 10);
}

export function getMercadoPagoClient(): MercadoPagoConfig | null {
  const token = getMercadoPagoToken();
  if (!token) return null;
  if (!mpClient) {
    try {
      mpClient = new MercadoPagoConfig({ accessToken: token.trim() });
    } catch (err) {
      console.error('[MercadoPago] Falha ao inicializar cliente:', err);
      return null;
    }
  }
  return mpClient;
}

/**
 * Calcula CRC16-CCITT (0x1021) oficial do Banco Central do Brasil para PIX BR Code.
 */
export function crc16Pix(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera string padrão EMV BR Code oficial (PIX Copia e Cola).
 */
export function generatePixBrCode(options: {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txId?: string;
}): string {
  const formatField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  const cleanName = options.merchantName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .substring(0, 25);

  const cleanCity = options.merchantCity
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .substring(0, 15);

  const cleanTxId = (options.txId || 'AFFETO')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 25);

  const accountInfo = formatField('00', 'br.gov.bcb.pix') + formatField('01', options.pixKey);
  const additionalData = formatField('05', cleanTxId);

  let raw =
    formatField('00', '01') +
    formatField('26', accountInfo) +
    formatField('52', '0000') +
    formatField('53', '986') +
    formatField('54', options.amount.toFixed(2)) +
    formatField('58', 'BR') +
    formatField('59', cleanName || 'AFFETO PAES') +
    formatField('60', cleanCity || 'SAO PAULO') +
    formatField('62', additionalData) +
    '6304';

  const checksum = crc16Pix(raw);
  return `${raw}${checksum}`;
}

/**
 * Cria cobrança real no Mercado Pago.
 */
export async function createRealMercadoPagoPayment(
  order: Order,
  method: PaymentMethod,
  options?: {
    payer_cpf?: string;
    payer_email?: string;
    payer_name?: string;
    app_url?: string;
    store_pix_key?: string;
  }
): Promise<PaymentRecord> {
  const nowIso = new Date().toISOString();
  const paymentId = `pay-${order.id}-${Date.now()}`;
  const client = getMercadoPagoClient();
  const appUrl = options?.app_url || process.env.APP_URL || 'https://affetopaes.com.br';

  const customerName = options?.payer_name || order.customer_name || 'Cliente';
  const [firstName, ...rest] = customerName.trim().split(' ');
  const lastName = rest.join(' ') || 'Cliente';
  const customerEmail = options?.payer_email || order.customer_email || 'cliente@affetopaes.com.br';
  const cleanCpf = (options?.payer_cpf || '').replace(/\D/g, '');

  // 1. Caso Mercado Pago esteja configurado com Access Token real
  if (client) {
    try {
      if (method === 'PIX') {
        const paymentClient = new Payment(client);
        console.info(`[MercadoPago] Criando cobrança PIX real para Pedido ${order.code} (R$ ${order.total.toFixed(2)})`);

        const payerData: any = {
          email: customerEmail,
          first_name: firstName,
          last_name: lastName,
        };

        if (cleanCpf && cleanCpf.length === 11) {
          payerData.identification = {
            type: 'CPF',
            number: cleanCpf,
          };
        }

        const mpResponse = await paymentClient.create({
          body: {
            transaction_amount: Number(order.total.toFixed(2)),
            description: `Pedido ${order.code} - Affeto Pães Artesanais`,
            payment_method_id: 'pix',
            payer: payerData,
            external_reference: order.id,
            notification_url: `${appUrl}/api/webhooks/mercadopago`,
          },
          requestOptions: {
            idempotencyKey: `mp-pix-${order.id}-${Date.now()}`,
          },
        });

        const txData = mpResponse.point_of_interaction?.transaction_data;
        const qrCode = txData?.qr_code || '';
        const qrCodeBase64 = txData?.qr_code_base64 || '';
        const ticketUrl = txData?.ticket_url || '';
        const mpStatus = mpResponse.status === 'approved' ? 'APPROVED' : 'PENDING';

        console.info(`[MercadoPago] PIX real gerado com sucesso: ID=${mpResponse.id}, Status=${mpResponse.status}`);

        return {
          id: paymentId,
          order_id: order.id,
          provider: 'MERCADO_PAGO',
          external_id: String(mpResponse.id),
          method: 'PIX',
          amount: order.total,
          status: mpStatus,
          qr_code: qrCode,
          qr_code_base64: qrCodeBase64,
          ticket_url: ticketUrl,
          created_at: nowIso,
          updated_at: nowIso,
        };
      }

      if (method === 'CREDIT_CARD') {
        const preferenceClient = new Preference(client);
        console.info(`[MercadoPago] Criando checkout seguro com cartão para Pedido ${order.code}`);

        const items = order.items && order.items.length > 0
          ? order.items.map((item) => ({
              id: item.product_id,
              title: item.product_name,
              quantity: item.quantity,
              unit_price: Number(item.unit_price.toFixed(2)),
              currency_id: 'BRL',
            }))
          : [
              {
                id: order.id,
                title: `Pedido ${order.code}`,
                quantity: 1,
                unit_price: Number(order.total.toFixed(2)),
                currency_id: 'BRL',
              },
            ];

        // Se houver frete, adiciona como item ou custo de envio
        if (order.delivery_fee > 0) {
          items.push({
            id: 'frete-entrega',
            title: 'Taxa de Entrega',
            quantity: 1,
            unit_price: Number(order.delivery_fee.toFixed(2)),
            currency_id: 'BRL',
          });
        }

        const prefResponse = await preferenceClient.create({
          body: {
            items,
            payer: {
              name: customerName,
              email: customerEmail,
              phone: {
                number: (order.customer_phone || '').replace(/\D/g, ''),
              },
              address: {
                street_name: order.address?.street || 'Retirada no Balcão',
                zip_code: (order.address?.zip_code || '').replace(/\D/g, ''),
              },
            },
            payment_methods: {
              installments: 12,
            },
            back_urls: {
              success: `${appUrl}/?order_id=${order.id}&status=approved`,
              pending: `${appUrl}/?order_id=${order.id}&status=pending`,
              failure: `${appUrl}/?order_id=${order.id}&status=failure`,
            },
            auto_return: 'approved',
            external_reference: order.id,
            notification_url: `${appUrl}/api/webhooks/mercadopago`,
          },
        });

        console.info(`[MercadoPago] Checkout Preference criado com sucesso: ID=${prefResponse.id}, URL=${prefResponse.init_point}`);

        return {
          id: paymentId,
          order_id: order.id,
          provider: 'MERCADO_PAGO',
          external_id: String(prefResponse.id),
          method: 'CREDIT_CARD',
          amount: order.total,
          status: 'PENDING',
          ticket_url: prefResponse.init_point || '',
          created_at: nowIso,
          updated_at: nowIso,
        };
      }
    } catch (mpError: any) {
      console.error('[MercadoPago API Error]:', mpError?.message || mpError);
      // Continua para fallback gerado com chave PIX da padaria se a chamada falhar
    }
  } else {
    console.warn('[MercadoPago] MERCADOPAGO_ACCESS_TOKEN não configurado no servidor.');
  }

  // 2. Fallback resiliente com a Chave PIX oficial da padaria (EMV BR Code)
  const pixKey = options?.store_pix_key || 'contato@affetopaes.com.br';
  const brCode = generatePixBrCode({
    pixKey,
    merchantName: 'AFFETO PAES',
    merchantCity: 'SAO PAULO',
    amount: order.total,
    txId: order.code,
  });

  return {
    id: paymentId,
    order_id: order.id,
    provider: isMercadoPagoConfigured() ? 'MERCADO_PAGO' : 'MANUAL',
    external_id: `affeto_${order.code.replace(/[^a-zA-Z0-9]/g, '')}`,
    method,
    amount: order.total,
    status: 'PENDING',
    qr_code: brCode,
    ticket_url: `https://www.mercadopago.com.br/`,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

/**
 * Consulta status real de pagamento no Mercado Pago.
 */
export async function getRealMercadoPagoPayment(paymentId: string) {
  const client = getMercadoPagoClient();
  if (!client) return null;

  try {
    const paymentClient = new Payment(client);
    const payment = await paymentClient.get({ id: paymentId });
    return payment;
  } catch (err: any) {
    console.error(`[MercadoPago] Erro ao consultar pagamento ${paymentId}:`, err?.message || err);
    return null;
  }
}
