import fs from 'fs';
import path from 'path';
import {
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
  INITIAL_DELIVERY_CEPS,
  INITIAL_DELIVERY_ZONES,
  INITIAL_PRODUCTION_BATCHES,
  INITIAL_PRODUCTS,
  INITIAL_STORE_SETTINGS,
  SAMPLE_ORDERS,
} from './seedData';
import {
  Category,
  Coupon,
  DeliveryCepRule,
  DeliveryZone,
  Order,
  OrderStatus,
  PaymentStatus,
  ProductionBatch,
  Product,
  StoreSettings,
} from '../types';

interface AffetoStoreData {
  storeSettings: StoreSettings;
  products: Product[];
  categories: Category[];
  coupons: Coupon[];
  deliveryZones: DeliveryZone[];
  deliveryCeps: DeliveryCepRule[];
  orders: Order[];
  productionBatches: ProductionBatch[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'affeto_store.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

class ServerStorage {
  private data: AffetoStoreData;

  constructor() {
    this.ensureDirectories();
    this.data = this.loadData();
  }

  private ensureDirectories() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (err) {
        console.error('[ServerStorage] Error creating data directory:', err);
      }
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      try {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      } catch (err) {
        console.error('[ServerStorage] Error creating uploads directory:', err);
      }
    }
  }

  private loadData(): AffetoStoreData {
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          storeSettings: { ...INITIAL_STORE_SETTINGS, ...parsed.storeSettings },
          products: Array.isArray(parsed.products) && parsed.products.length > 0 ? parsed.products : INITIAL_PRODUCTS,
          categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : INITIAL_CATEGORIES,
          coupons: Array.isArray(parsed.coupons) ? parsed.coupons : INITIAL_COUPONS,
          deliveryZones: Array.isArray(parsed.deliveryZones) ? parsed.deliveryZones : INITIAL_DELIVERY_ZONES,
          deliveryCeps: Array.isArray(parsed.deliveryCeps) ? parsed.deliveryCeps : INITIAL_DELIVERY_CEPS,
          orders: Array.isArray(parsed.orders) ? parsed.orders : SAMPLE_ORDERS,
          productionBatches: Array.isArray(parsed.productionBatches) ? parsed.productionBatches : INITIAL_PRODUCTION_BATCHES,
        };
      } catch (err) {
        console.error('[ServerStorage] Error reading data file, using defaults:', err);
      }
    }

    const initialData: AffetoStoreData = {
      storeSettings: INITIAL_STORE_SETTINGS,
      products: INITIAL_PRODUCTS,
      categories: INITIAL_CATEGORIES,
      coupons: INITIAL_COUPONS,
      deliveryZones: INITIAL_DELIVERY_ZONES,
      deliveryCeps: INITIAL_DELIVERY_CEPS,
      orders: SAMPLE_ORDERS,
      productionBatches: INITIAL_PRODUCTION_BATCHES,
    };

    this.saveDataToFile(initialData);
    return initialData;
  }

  private saveDataToFile(dataToSave?: AffetoStoreData) {
    const payload = dataToSave || this.data;
    try {
      this.ensureDirectories();
      fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ServerStorage] Error saving data to file:', err);
    }
  }

  /**
   * Helper to convert base64 data URLs to static image files on disk
   * for ultra-fast, permanent browser access without bloating JSON payload.
   */
  public processBase64Image(dataUrl: string, prefix: string = 'img'): string {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return dataUrl;
    }

    try {
      const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (!match) return dataUrl;

      let extension = match[1].toLowerCase();
      if (extension === 'jpeg') extension = 'jpg';
      if (extension === 'svg+xml') extension = 'svg';

      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `${prefix}_${Date.now()}.${extension}`;
      const filePath = path.join(UPLOADS_DIR, filename);

      fs.writeFileSync(filePath, buffer);
      return `/uploads/${filename}`;
    } catch (err) {
      console.error('[ServerStorage] Failed to save base64 image:', err);
      return dataUrl; // fallback to storing base64 directly
    }
  }

  // -----------------------------------------------------------------
  // STORE SETTINGS
  // -----------------------------------------------------------------
  public getSettings(): StoreSettings {
    return this.data.storeSettings;
  }

  public updateSettings(settings: Partial<StoreSettings>): StoreSettings {
    let logoUrl = settings.logo_url;
    if (logoUrl && logoUrl.startsWith('data:image/')) {
      logoUrl = this.processBase64Image(logoUrl, 'logo');
    }

    this.data.storeSettings = {
      ...this.data.storeSettings,
      ...settings,
      logo_url: logoUrl !== undefined ? logoUrl : this.data.storeSettings.logo_url,
    };

    this.saveDataToFile();
    return this.data.storeSettings;
  }

  // -----------------------------------------------------------------
  // PRODUCTS
  // -----------------------------------------------------------------
  public getProducts(): Product[] {
    return this.data.products;
  }

  public saveProduct(product: Product): Product {
    let imageUrl = product.image_url;
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      imageUrl = this.processBase64Image(imageUrl, `prod_${product.slug || 'item'}`);
    }

    const cleanedProduct: Product = {
      ...product,
      image_url: imageUrl,
      updated_at: new Date().toISOString(),
    };

    const idx = this.data.products.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      this.data.products[idx] = cleanedProduct;
    } else {
      if (!cleanedProduct.created_at) {
        cleanedProduct.created_at = new Date().toISOString();
      }
      this.data.products.push(cleanedProduct);
    }

    this.saveDataToFile();
    return cleanedProduct;
  }

  public deleteProduct(id: string): boolean {
    const initialLen = this.data.products.length;
    this.data.products = this.data.products.filter((p) => p.id !== id);
    const deleted = this.data.products.length < initialLen;
    if (deleted) this.saveDataToFile();
    return deleted;
  }

  // -----------------------------------------------------------------
  // CATEGORIES
  // -----------------------------------------------------------------
  public getCategories(): Category[] {
    return this.data.categories;
  }

  public saveCategory(category: Category): Category {
    let imageUrl = category.image_url;
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      imageUrl = this.processBase64Image(imageUrl, `cat_${category.slug || 'item'}`);
    }

    const cleanedCat: Category = {
      ...category,
      image_url: imageUrl,
    };

    const idx = this.data.categories.findIndex((c) => c.id === category.id || c.slug === category.slug);
    if (idx >= 0) {
      this.data.categories[idx] = cleanedCat;
    } else {
      this.data.categories.push(cleanedCat);
    }

    this.saveDataToFile();
    return cleanedCat;
  }

  public deleteCategory(id: string): boolean {
    const initialLen = this.data.categories.length;
    this.data.categories = this.data.categories.filter((c) => c.id !== id);
    const deleted = this.data.categories.length < initialLen;
    if (deleted) this.saveDataToFile();
    return deleted;
  }

  // -----------------------------------------------------------------
  // COUPONS
  // -----------------------------------------------------------------
  public getCoupons(): Coupon[] {
    return this.data.coupons;
  }

  public saveCoupon(coupon: Coupon): Coupon {
    const idx = this.data.coupons.findIndex((c) => c.id === coupon.id || c.code === coupon.code);
    if (idx >= 0) {
      this.data.coupons[idx] = coupon;
    } else {
      this.data.coupons.push(coupon);
    }
    this.saveDataToFile();
    return coupon;
  }

  public deleteCoupon(id: string): boolean {
    const initialLen = this.data.coupons.length;
    this.data.coupons = this.data.coupons.filter((c) => c.id !== id);
    const deleted = this.data.coupons.length < initialLen;
    if (deleted) this.saveDataToFile();
    return deleted;
  }

  // -----------------------------------------------------------------
  // DELIVERY ZONES & CEPS
  // -----------------------------------------------------------------
  public getDeliveryZones(): DeliveryZone[] {
    return this.data.deliveryZones;
  }

  public saveDeliveryZones(zones: DeliveryZone[]): DeliveryZone[] {
    this.data.deliveryZones = zones;
    this.saveDataToFile();
    return zones;
  }

  public getDeliveryCeps(): DeliveryCepRule[] {
    return this.data.deliveryCeps;
  }

  public saveDeliveryCep(cep: DeliveryCepRule): DeliveryCepRule {
    const idx = this.data.deliveryCeps.findIndex((c) => c.id === cep.id || c.cep === cep.cep);
    if (idx >= 0) {
      this.data.deliveryCeps[idx] = cep;
    } else {
      this.data.deliveryCeps.push(cep);
    }
    this.saveDataToFile();
    return cep;
  }

  public deleteDeliveryCep(id: string): boolean {
    const initialLen = this.data.deliveryCeps.length;
    this.data.deliveryCeps = this.data.deliveryCeps.filter((c) => c.id !== id);
    const deleted = this.data.deliveryCeps.length < initialLen;
    if (deleted) this.saveDataToFile();
    return deleted;
  }

  // -----------------------------------------------------------------
  // ORDERS
  // -----------------------------------------------------------------
  public getOrders(): Order[] {
    return this.data.orders;
  }

  public addOrder(order: Order): Order {
    this.data.orders = [order, ...this.data.orders];
    this.saveDataToFile();
    return order;
  }

  public updateOrderStatus(orderId: string, status: OrderStatus, changedBy: string, notes?: string): Order | null {
    const idx = this.data.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;

    const order = this.data.orders[idx];
    const prevStatus = order.status;
    order.status = status;
    order.updated_at = new Date().toISOString();

    if (!order.status_history) order.status_history = [];
    order.status_history.push({
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order_id: order.id,
      previous_status: prevStatus,
      new_status: status,
      changed_by: changedBy,
      notes: notes || `Status alterado para ${status}`,
      created_at: new Date().toISOString(),
    });

    this.data.orders[idx] = order;
    this.saveDataToFile();
    return order;
  }

  public updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, externalId?: string): Order | null {
    const idx = this.data.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;

    const order = this.data.orders[idx];
    order.payment_status = paymentStatus;
    if (paymentStatus === 'APPROVED' && order.status === 'PENDING_PAYMENT') {
      order.status = 'CONFIRMED';
    }
    order.updated_at = new Date().toISOString();

    if (order.payment) {
      order.payment.status = paymentStatus;
      if (externalId) order.payment.external_id = externalId;
      order.payment.updated_at = new Date().toISOString();
    }

    this.data.orders[idx] = order;
    this.saveDataToFile();
    return order;
  }

  // -----------------------------------------------------------------
  // PRODUCTION BATCHES
  // -----------------------------------------------------------------
  public getProductionBatches(): ProductionBatch[] {
    return this.data.productionBatches;
  }

  public updateProductionBatch(
    batchData: Partial<ProductionBatch> & { product_id: string; production_date: string }
  ): ProductionBatch {
    const idx = this.data.productionBatches.findIndex(
      (b) => b.product_id === batchData.product_id && b.production_date === batchData.production_date
    );

    let updated: ProductionBatch;
    if (idx >= 0) {
      this.data.productionBatches[idx] = {
        ...this.data.productionBatches[idx],
        ...batchData,
        updated_at: new Date().toISOString(),
      };
      updated = this.data.productionBatches[idx];
    } else {
      updated = {
        id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        product_id: batchData.product_id,
        production_date: batchData.production_date,
        capacity: batchData.capacity ?? 10,
        reserved_quantity: batchData.reserved_quantity ?? 0,
        status: batchData.status ?? 'PLANNED',
        notes: batchData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.data.productionBatches.push(updated);
    }

    this.saveDataToFile();
    return updated;
  }

  public reserveBatchCapacity(
    productId: string,
    productionDate: string,
    quantity: number,
    defaultCapacity: number
  ): { success: boolean; error?: string } {
    let batch = this.data.productionBatches.find(
      (b) => b.product_id === productId && b.production_date === productionDate
    );

    if (!batch) {
      batch = {
        id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        product_id: productId,
        production_date: productionDate,
        capacity: defaultCapacity,
        reserved_quantity: 0,
        status: 'PLANNED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.data.productionBatches.push(batch);
    }

    if (batch.status === 'CANCELLED') {
      return { success: false, error: 'A fornada para esta data foi cancelada.' };
    }

    if (batch.reserved_quantity + quantity > batch.capacity) {
      return { success: false, error: 'Capacidade máxima para esta fornada foi atingida.' };
    }

    batch.reserved_quantity += quantity;
    batch.updated_at = new Date().toISOString();
    this.saveDataToFile();
    return { success: true };
  }

  public releaseBatchCapacity(productId: string, productionDate: string, quantity: number): void {
    const batch = this.data.productionBatches.find(
      (b) => b.product_id === productId && b.production_date === productionDate
    );
    if (batch) {
      batch.reserved_quantity = Math.max(0, batch.reserved_quantity - quantity);
      batch.updated_at = new Date().toISOString();
      this.saveDataToFile();
    }
  }
}

export const serverStorage = new ServerStorage();
