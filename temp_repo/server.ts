import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { calculateOrderPricing } from './src/lib/pricingEngine';
import { serverStorage } from './src/server/storage';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

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
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'Affeto Pães',
      supabase_target: 'https://ropgdbgkjghwdxdglchz.supabase.co',
      persistence: 'server-active',
      timestamp: new Date().toISOString(),
    });
  });

  // -----------------------------------------------------------------
  // STORE SETTINGS & LOGO / ADDRESS PERSISTENCE
  // -----------------------------------------------------------------
  const handleGetSettings = (req: express.Request, res: express.Response) => {
    try {
      const settings = serverStorage.getSettings();
      res.json(settings);
    } catch (err: any) {
      console.error('[API Settings Get Error]:', err);
      res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
  };

  const handleUpdateSettings = (req: express.Request, res: express.Response) => {
    try {
      const updated = serverStorage.updateSettings(req.body);
      console.info('[API Settings Updated]: Logo and address persisted successfully');
      res.json(updated);
    } catch (err: any) {
      console.error('[API Settings Update Error]:', err);
      res.status(500).json({ error: 'Erro ao salvar configurações no servidor' });
    }
  };

  app.get('/api/store-settings', handleGetSettings);
  app.get('/api/settings', handleGetSettings);
  app.put('/api/store-settings', handleUpdateSettings);
  app.post('/api/store-settings', handleUpdateSettings);
  app.put('/api/settings', handleUpdateSettings);
  app.post('/api/settings', handleUpdateSettings);

  // -----------------------------------------------------------------
  // PRODUCTS PERSISTENCE
  // -----------------------------------------------------------------
  app.get('/api/products', (req, res) => {
    try {
      const products = serverStorage.getProducts();
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao carregar produtos' });
    }
  });

  app.post('/api/products', (req, res) => {
    try {
      const saved = serverStorage.saveProduct(req.body);
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao salvar produto' });
    }
  });

  app.put('/api/products/:id', (req, res) => {
    try {
      const saved = serverStorage.saveProduct({ ...req.body, id: req.params.id });
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
  });

  app.delete('/api/products/:id', (req, res) => {
    try {
      const success = serverStorage.deleteProduct(req.params.id);
      res.json({ success });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao excluir produto' });
    }
  });

  // -----------------------------------------------------------------
  // CATEGORIES PERSISTENCE
  // -----------------------------------------------------------------
  app.get('/api/categories', (req, res) => {
    try {
      res.json(serverStorage.getCategories());
    } catch (err) {
      res.status(500).json({ error: 'Erro ao carregar categorias' });
    }
  });

  app.post('/api/categories', (req, res) => {
    try {
      const saved = serverStorage.saveCategory(req.body);
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao salvar categoria' });
    }
  });

  app.delete('/api/categories/:id', (req, res) => {
    try {
      const success = serverStorage.deleteCategory(req.params.id);
      res.json({ success });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao excluir categoria' });
    }
  });

  // -----------------------------------------------------------------
  // COUPONS PERSISTENCE
  // -----------------------------------------------------------------
  app.get('/api/coupons', (req, res) => {
    try {
      res.json(serverStorage.getCoupons());
    } catch (err) {
      res.status(500).json({ error: 'Erro ao carregar cupons' });
    }
  });

  app.post('/api/coupons', (req, res) => {
    try {
      const saved = serverStorage.saveCoupon(req.body);
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao salvar cupom' });
    }
  });

  app.delete('/api/coupons/:id', (req, res) => {
    try {
      const success = serverStorage.deleteCoupon(req.params.id);
      res.json({ success });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao excluir cupom' });
    }
  });

  // -----------------------------------------------------------------
  // DELIVERY ZONES & CEPS PERSISTENCE
  // -----------------------------------------------------------------
  app.get('/api/delivery-zones', (req, res) => {
    try {
      res.json(serverStorage.getDeliveryZones());
    } catch (err) {
      res.status(500).json({ error: 'Erro ao carregar zonas de entrega' });
    }
  });

  app.put('/api/delivery-zones', (req, res) => {
    try {
      res.json(serverStorage.saveDeliveryZones(req.body));
    } catch (err) {
      res.status(500).json({ error: 'Erro ao atualizar zonas de entrega' });
    }
  });

  app.get('/api/delivery-ceps', (req, res) => {
    try {
      res.json(serverStorage.getDeliveryCeps());
    } catch (err) {
      res.status(500).json({ error: 'Erro ao carregar regras de CEP' });
    }
  });

  app.post('/api/delivery-ceps', (req, res) => {
    try {
      res.json(serverStorage.saveDeliveryCep(req.body));
    } catch (err) {
      res.status(500).json({ error: 'Erro ao salvar regra de CEP' });
    }
  });

  app.delete('/api/delivery-ceps/:id', (req, res) => {
    try {
      const success = serverStorage.deleteDeliveryCep(req.params.id);
      res.json({ success });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao excluir regra de CEP' });
    }
  });

  // -----------------------------------------------------------------
  // ORDERS PERSISTENCE
  // -----------------------------------------------------------------
  app.get('/api/orders', (req, res) => {
    try {
      res.json(serverStorage.getOrders());
    } catch (err) {
      res.status(500).json({ error: 'Erro ao carregar pedidos' });
    }
  });

  app.post('/api/orders', (req, res) => {
    try {
      const saved = serverStorage.addOrder(req.body);
      res.status(201).json(saved);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao registrar pedido' });
    }
  });

  app.patch('/api/orders/:id/status', (req, res) => {
    try {
      const { status, changed_by, notes } = req.body;
      const updated = serverStorage.updateOrderStatus(req.params.id, status, changed_by || 'ADMIN', notes);
      if (!updated) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
    }
  });

  app.patch('/api/orders/:id/payment', (req, res) => {
    try {
      const { payment_status, external_id } = req.body;
      const updated = serverStorage.updatePaymentStatus(req.params.id, payment_status, external_id);
      if (!updated) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao atualizar status de pagamento' });
    }
  });

  // -----------------------------------------------------------------
  // PRODUCTION BATCHES PERSISTENCE
  // -----------------------------------------------------------------
  app.get('/api/production-batches', (req, res) => {
    try {
      res.json(serverStorage.getProductionBatches());
    } catch (err) {
      res.status(500).json({ error: 'Erro ao carregar fornadas' });
    }
  });

  app.post('/api/production-batches', (req, res) => {
    try {
      res.json(serverStorage.updateProductionBatch(req.body));
    } catch (err) {
      res.status(500).json({ error: 'Erro ao atualizar fornada' });
    }
  });

  app.post('/api/production-batches/reserve', (req, res) => {
    try {
      const { product_id, production_date, quantity, default_capacity } = req.body;
      const result = serverStorage.reserveBatchCapacity(product_id, production_date, quantity, default_capacity || 10);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao reservar lote da fornada' });
    }
  });

  app.post('/api/production-batches/release', (req, res) => {
    try {
      const { product_id, production_date, quantity } = req.body;
      serverStorage.releaseBatchCapacity(product_id, production_date, quantity);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao liberar lote' });
    }
  });

  // 2. Server-side Pricing Engine (Single Source of Truth - Section 5.1)
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

  // 3. Mercado Pago Webhook Handler (Section 5.4)
  app.post('/api/webhooks/mercadopago', async (req, res) => {
    try {
      const payload = req.body;
      console.info('[Mercado Pago Webhook Received]:', payload);

      // In production, validate headers / x-signature if MERCADOPAGO_WEBHOOK_SECRET is set
      const paymentId = payload?.data?.id || req.query['data.id'] || req.query.id;

      // Responda 200 OK imediatamente para o Mercado Pago
      return res.status(200).json({
        received: true,
        payment_id: paymentId,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[Webhook Error]:', err);
      return res.status(500).json({ error: 'Webhook processing error' });
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Affeto Pães Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
