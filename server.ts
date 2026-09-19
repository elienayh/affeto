import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { calculateOrderPricing } from './src/lib/pricingEngine';
import { serverStorage } from './src/server/storage';
import {
  syncStoreSettingsToSupabase,
  getStoreSettingsFromSupabase,
  uploadAssetToSupabaseStorage,
  syncProductToSupabase,
  deleteProductFromSupabase,
  syncCategoryToSupabase,
  deleteCategoryFromSupabase,
  syncDeliveryCepsToSupabase,
  getDeliveryCepsFromSupabase,
} from './src/server/supabaseServer';
import {
  createRealMercadoPagoPayment,
  getRealMercadoPagoPayment,
  isMercadoPagoConfigured,
} from './src/server/mercadopago';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON payloads up to 20MB for uploaded images/logos
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Static uploads directory for permanent assets (logos, photos)
  const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // 1. Health check
  app.get('/api/health', (_req, res) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ropgdbgkjghwdxdglchz.supabase.co';
    const hasAnonKey = Boolean(process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

    return res.json({
      status: 'ok',
      app: 'Affeto Pães',
      supabase_target: supabaseUrl,
      supabase_configured: hasAnonKey,
      supabase_service_role_configured: hasServiceRoleKey,
      persistence: 'server-active',
      timestamp: new Date().toISOString(),
    });
  });

  // Client configuration: guarantees every browser (Chrome, Safari, mobile, incognito)
  // automatically connects to the same Supabase database without manual setup!
  app.get('/api/config', (_req, res) => {
    return res.json({
      supabaseUrl: process.env.VITE_SUPABASE_URL || 'https://ropgdbgkjghwdxdglchz.supabase.co',
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
      bakeryWhatsapp: process.env.VITE_BAKERY_WHATSAPP_NUMBER || '5532984680513',
    });
  });

  // -----------------------------------------------------------------
  // STORE SETTINGS & LOGO / ADDRESS PERSISTENCE
  // -----------------------------------------------------------------
  const handleGetSettings = async (_req: express.Request, res: express.Response) => {
    try {
      // 1. Busca no Supabase para sincronização em tempo real entre dispositivos
      const supabaseSettings = await getStoreSettingsFromSupabase();
      if (supabaseSettings) {
        serverStorage.updateSettings(supabaseSettings);
        return res.json(supabaseSettings);
      }
      const settings = serverStorage.getSettings();
      return res.json(settings);
    } catch (err: any) {
      console.error('[API Settings Get Error]:', err);
      return res.json(serverStorage.getSettings());
    }
  };

  const handleUpdateSettings = async (req: express.Request, res: express.Response) => {
    try {
      const payload = { ...req.body };
      // Se a imagem for base64, realiza upload permanente para o Supabase Storage
      if (payload.logo_url && payload.logo_url.startsWith('data:image/')) {
        const permanentCdnUrl = await uploadAssetToSupabaseStorage(payload.logo_url, 'logos', 'affeto_logo');
        if (permanentCdnUrl) {
          payload.logo_url = permanentCdnUrl;
        }
      }

      // 1. Atualiza configurações locais
      const updated = serverStorage.updateSettings(payload);

      // 2. Sincroniza imediatamente com o banco de dados Supabase
      const synced = await syncStoreSettingsToSupabase(updated);
      console.info('[API Settings Updated]: Logo e configurações salvos no servidor e Supabase.');

      // 3. Retorna apenas uma resposta HTTP final
      return res.json(synced || updated);
    } catch (err: any) {
      console.error('[API Settings Update Error]:', err);
      return res.status(500).json({ error: 'Erro ao salvar configurações no servidor' });
    }
  };

  app.get('/api/store-settings', handleGetSettings);
  app.get('/api/settings', handleGetSettings);
  app.put('/api/store-settings', handleUpdateSettings);
  app.post('/api/store-settings', handleUpdateSettings);
  app.put('/api/settings', handleUpdateSettings);
  app.post('/api/settings', handleUpdateSettings);

  // Dedicated asset upload endpoint to Supabase Storage (affeto-assets bucket)
  app.post('/api/upload', async (req: express.Request, res: express.Response) => {
    try {
      const { image, folder = 'general', prefix = 'asset' } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'Nenhuma imagem fornecida' });
      }
      const url = await uploadAssetToSupabaseStorage(image, folder, prefix);
      if (url) {
        return res.json({ url });
      }
      return res.status(500).json({ error: 'Falha no upload para o Supabase Storage' });
    } catch (err: any) {
      console.error('[API Upload Error]:', err);
      return res.status(500).json({ error: err?.message || 'Erro no upload' });
    }
  });

  // -----------------------------------------------------------------
  // PRODUCTS PERSISTENCE
  // -----------------------------------------------------------------
  app.get('/api/products', (_req, res) => {
    try {
      const products = serverStorage.getProducts();
      return res.json(products);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao carregar produtos' });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      const saved = serverStorage.saveProduct(req.body);
      syncProductToSupabase(saved).catch((err) => {
        console.warn('[Server] Supabase product sync warning:', err);
      });
      return res.json(saved);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao salvar produto' });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    try {
      const saved = serverStorage.saveProduct({ ...req.body, id: req.params.id });
      syncProductToSupabase(saved).catch((err) => {
        console.warn('[Server] Supabase product sync warning:', err);
      });
      return res.json(saved);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    try {
      const success = serverStorage.deleteProduct(req.params.id);
      deleteProductFromSupabase(req.params.id).catch((err) => {
        console.warn('[Server] Supabase product delete warning:', err);
      });
      return res.json({ success });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao excluir produto' });
    }
  });

  // -----------------------------------------------------------------
  // CATEGORIES PERSISTENCE
  // -----------------------------------------------------------------
  app.get('/api/categories', (_req, res) => {
    try {
      return res.json(serverStorage.getCategories());
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao carregar categorias' });
    }
  });

  app.post('/api/categories', async (req, res) => {
    try {
      const saved = serverStorage.saveCategory(req.body);
      syncCategoryToSupabase(saved).catch((err) => {
        console.warn('[Server] Supabase category sync warning:', err);
      });
      return res.json(saved);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao salvar categoria' });
    }
  });

  app.delete('/api/categories/:id', async (req, res) => {
    try {
      const success = serverStorage.deleteCategory(req.params.id);
      deleteCategoryFromSupabase(req.params.id).catch((err) => {
        console.warn('[Server] Supabase category delete warning:', err);
      });
      return res.json({ success });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao excluir categoria' });
    }
  });

  // -----------------------------------------------------------------
  // COUPONS PERSISTENCE
  // -----------------------------------------------------------------
  app.get('/api/coupons', (_req, res) => {
    try {
      return res.json(serverStorage.getCoupons());
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao carregar cupons' });
    }
  });

  app.post('/api/coupons', (req, res) => {
    try {
      const saved = serverStorage.saveCoupon(req.body);
      return res.json(saved);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao salvar cupom' });
    }
  });

  app.delete('/api/coupons/:id', (req, res) => {
    try {
      const success = serverStorage.deleteCoupon(req.params.id);
      return res.json({ success });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao excluir cupom' });
    }
  });

  // -----------------------------------------------------------------
  // DELIVERY ZONES & CEPS PERSISTENCE
  // -----------------------------------------------------------------
  app.get('/api/delivery-zones', (_req, res) => {
    try {
      return res.json(serverStorage.getDeliveryZones());
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao carregar zonas de entrega' });
    }
  });

  app.put('/api/delivery-zones', (req, res) => {
    try {
      return res.json(serverStorage.saveDeliveryZones(req.body));
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao atualizar zonas de entrega' });
    }
  });

  app.get('/api/delivery-ceps', async (_req, res) => {
    try {
      const fromSupabase = await getDeliveryCepsFromSupabase();
      if (fromSupabase && fromSupabase.length > 0) {
        return res.json(fromSupabase);
      }
      return res.json(serverStorage.getDeliveryCeps());
    } catch (err) {
      console.warn('[Server] Falha ao consultar CEPs do Supabase, usando local:', err);
      return res.json(serverStorage.getDeliveryCeps());
    }
  });

  app.post('/api/delivery-ceps', async (req, res) => {
    try {
      const saved = serverStorage.saveDeliveryCep(req.body);
      syncDeliveryCepsToSupabase(serverStorage.getDeliveryCeps()).catch((err) => {
        console.warn('[Server] Supabase delivery ceps sync warning:', err);
      });
      return res.json(saved);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao salvar regra de CEP' });
    }
  });

  app.delete('/api/delivery-ceps/:id', (req, res) => {
    try {
      const success = serverStorage.deleteDeliveryCep(req.params.id);
      return res.json({ success });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao excluir regra de CEP' });
    }
  });

  // -----------------------------------------------------------------
  // CUSTOMERS LOOKUP BY PHONE
  // -----------------------------------------------------------------
  app.get('/api/customers/lookup', (req, res) => {
    try {
      const phone = String(req.query.phone || '');
      const customer = serverStorage.findCustomerByPhone(phone);
      if (customer) {
        return res.json({ found: true, customer });
      }
      return res.json({ found: false });
    } catch (err) {
      console.error('[API Customers Lookup Error]:', err);
      return res.status(500).json({ error: 'Erro ao buscar cadastro de cliente' });
    }
  });

  // -----------------------------------------------------------------
  // ORDERS PERSISTENCE
  // -----------------------------------------------------------------
  app.get('/api/orders', (_req, res) => {
    try {
      return res.json(serverStorage.getOrders());
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao carregar pedidos' });
    }
  });

  app.post('/api/orders', (req, res) => {
    try {
      const saved = serverStorage.addOrder(req.body);
      return res.status(201).json(saved);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao registrar pedido' });
    }
  });

  app.patch('/api/orders/:id/status', (req, res) => {
    try {
      const { status, changed_by, notes } = req.body;
      const updated = serverStorage.updateOrderStatus(req.params.id, status, changed_by || 'ADMIN', notes);
      if (!updated) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
    }
  });

  app.patch('/api/orders/:id/payment', (req, res) => {
    try {
      const { payment_status, external_id, payment_method, notes } = req.body;
      const updated = serverStorage.updatePaymentStatus(
        req.params.id,
        payment_status,
        external_id,
        payment_method,
        notes
      );
      if (!updated) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao atualizar status de pagamento' });
    }
  });

  app.put('/api/orders/:id', (req, res) => {
    try {
      const { audit_note, ...orderData } = req.body;
      const updated = serverStorage.updateOrder(req.params.id, orderData, audit_note);
      if (!updated) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao atualizar pedido completo' });
    }
  });

  // -----------------------------------------------------------------
  // PRODUCTION BATCHES PERSISTENCE
  // -----------------------------------------------------------------
  app.get('/api/production-batches', (_req, res) => {
    try {
      return res.json(serverStorage.getProductionBatches());
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao carregar fornadas' });
    }
  });

  app.post('/api/production-batches', (req, res) => {
    try {
      return res.json(serverStorage.updateProductionBatch(req.body));
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao atualizar fornada' });
    }
  });

  app.post('/api/production-batches/reserve', (req, res) => {
    try {
      const { product_id, production_date, quantity, default_capacity } = req.body;
      const result = serverStorage.reserveBatchCapacity(product_id, production_date, quantity, default_capacity || 10);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao reservar lote da fornada' });
    }
  });

  app.post('/api/production-batches/release', (req, res) => {
    try {
      const { product_id, production_date, quantity } = req.body;
      serverStorage.releaseBatchCapacity(product_id, production_date, quantity);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao liberar lote' });
    }
  });

  // 2. Server-side Pricing Engine (Single Source of Truth)
  app.post('/api/pricing/calculate', (req, res) => {
    try {
      const { items, delivery_type, delivery_zone_id, coupon_code } = req.body;

      const result = calculateOrderPricing({
        items: items || [],
        availableProducts: serverStorage.getProducts(),
        delivery_type: delivery_type || 'DELIVERY',
        delivery_zone_id,
        availableZones: serverStorage.getDeliveryZones(),
        coupon_code,
        availableCoupons: serverStorage.getCoupons(),
      });

      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      return res.json(result);
    } catch (err: any) {
      console.error('[API Pricing Error]:', err);
      return res.status(500).json({ error: 'Erro ao recalcular preços no servidor' });
    }
  });

  // 3. Mercado Pago Payment Integration
  app.get('/api/payments/config', (_req, res) => {
    return res.json({
      mercadopago_configured: isMercadoPagoConfigured(),
      environment: 'production',
      supported_methods: ['PIX', 'CREDIT_CARD'],
    });
  });

  app.post('/api/payments/create', async (req, res) => {
    try {
      const { order_id, method, payer_cpf, payer_email, payer_name } = req.body;
      if (!order_id) {
        return res.status(400).json({ error: 'order_id é obrigatório' });
      }

      const order = serverStorage.getOrder(order_id);
      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado para gerar pagamento' });
      }

      const storeSettings = serverStorage.getSettings();
      const appUrl = `${req.protocol}://${req.get('host')}`;

      const paymentRecord = await createRealMercadoPagoPayment(order, method || 'PIX', {
        payer_cpf,
        payer_email,
        payer_name,
        app_url: appUrl,
        store_pix_key: storeSettings?.pix_key,
      });

      serverStorage.setOrderPayment(order.id, paymentRecord);

      if (paymentRecord.status === 'APPROVED') {
        serverStorage.updatePaymentStatus(order.id, 'APPROVED', paymentRecord.external_id);
      }

      return res.json({
        success: true,
        payment: paymentRecord,
        order: serverStorage.getOrder(order.id),
        is_mercadopago_real: isMercadoPagoConfigured(),
      });
    } catch (err: any) {
      console.error('[API Payments Create Error]:', err);
      return res.status(500).json({ error: err?.message || 'Erro ao processar pagamento' });
    }
  });

  app.get('/api/payments/:orderId/status', async (req, res) => {
    try {
      const order = serverStorage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      const paymentRecord = order.payment;

      // Se o pedido ainda está pendente e possui ID numérico real do Mercado Pago, consulta status na API do Mercado Pago
      if (
        order.payment_status === 'PENDING' &&
        paymentRecord?.external_id &&
        !paymentRecord.external_id.startsWith('affeto_') &&
        isMercadoPagoConfigured()
      ) {
        try {
          const mpData = await getRealMercadoPagoPayment(paymentRecord.external_id);
          if (mpData) {
            if (mpData.status === 'approved') {
              serverStorage.updatePaymentStatus(order.id, 'APPROVED', String(mpData.id));
              serverStorage.updateOrderStatus(
                order.id,
                'CONFIRMED',
                'MERCADO_PAGO',
                `Pagamento aprovado confirmado pelo Mercado Pago [ID: ${mpData.id}]`
              );
            } else if (mpData.status === 'rejected' || mpData.status === 'cancelled') {
              serverStorage.updatePaymentStatus(order.id, 'REJECTED', String(mpData.id));
            }
          }
        } catch (mpErr) {
          console.warn('[MercadoPago Status Check Warning]:', mpErr);
        }
      }

      const freshOrder = serverStorage.getOrder(req.params.orderId) || order;
      return res.json({
        order_id: freshOrder.id,
        payment_status: freshOrder.payment_status,
        order_status: freshOrder.status,
        is_approved: freshOrder.payment_status === 'APPROVED',
        payment: freshOrder.payment,
      });
    } catch (err: any) {
      console.error('[Payment Status Error]:', err);
      return res.status(500).json({ error: 'Erro ao verificar status do pagamento' });
    }
  });

  // Mercado Pago Real Webhook Handler
  app.post('/api/webhooks/mercadopago', async (req, res) => {
    try {
      const payload = req.body;
      console.info('[Mercado Pago Webhook Received]:', JSON.stringify(payload));

      const paymentId = payload?.data?.id || req.query['data.id'] || req.query.id;

      if (paymentId && isMercadoPagoConfigured()) {
        try {
          const mpPayment = await getRealMercadoPagoPayment(String(paymentId));
          if (mpPayment) {
            console.info(`[Mercado Pago Webhook] Pagamento ${paymentId}: Status=${mpPayment.status}, Ref=${mpPayment.external_reference}`);
            const orderId = mpPayment.external_reference;
            if (orderId) {
              if (mpPayment.status === 'approved') {
                serverStorage.updatePaymentStatus(orderId, 'APPROVED', String(paymentId));
                serverStorage.updateOrderStatus(
                  orderId,
                  'CONFIRMED',
                  'MERCADO_PAGO_WEBHOOK',
                  `Pagamento aprovado via Webhook Mercado Pago [ID: ${paymentId}]`
                );
              } else if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
                serverStorage.updatePaymentStatus(orderId, 'REJECTED', String(paymentId));
              }
            }
          }
        } catch (mpErr) {
          console.error('[Mercado Pago Webhook Fetch Error]:', mpErr);
        }
      }

      // Responde 200 OK imediatamente para o Mercado Pago não reenviar
      return res.status(200).json({
        received: true,
        payment_id: paymentId,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[Webhook Error]:', err);
      return res.status(200).json({ received: false, error: err?.message });
    }
  });

  // 4. Vite middleware for development vs static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      return res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Affeto Pães Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

