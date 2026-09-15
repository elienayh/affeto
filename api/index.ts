import express from 'express';
import { INITIAL_COUPONS, INITIAL_DELIVERY_ZONES, INITIAL_PRODUCTS } from '../src/data/mockData';
import { calculateOrderPricing } from '../src/lib/pricingEngine';

const app = express();
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

// 2. Server-side Pricing Engine
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

// 3. Mercado Pago Webhook Handler
app.post('/api/webhooks/mercadopago', async (req, res) => {
  try {
    const payload = req.body;
    const paymentId = payload?.data?.id || req.query['data.id'] || req.query.id;

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

export default app;
