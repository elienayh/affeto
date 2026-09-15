import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_COUPONS, INITIAL_DELIVERY_ZONES, INITIAL_PRODUCTS } from './src/data/mockData';
import { calculateOrderPricing } from './src/lib/pricingEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'Affeto Pães',
      supabase_target: 'https://ropgdbgkjghwdxdglchz.supabase.co',
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Server-side Pricing Engine (Single Source of Truth - Section 5.1)
  app.post('/api/pricing/calculate', (req, res) => {
    try {
      const { items, delivery_type, delivery_zone_id, coupon_code } = req.body;

      const result = calculateOrderPricing({
        items: items || [],
        availableProducts: INITIAL_PRODUCTS,
        delivery_type: delivery_type || 'DELIVERY',
        delivery_zone_id,
        availableZones: INITIAL_DELIVERY_ZONES,
        coupon_code,
        availableCoupons: INITIAL_COUPONS,
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
