import { dataStore } from '../lib/supabase';
import { Category, Product } from '../types';

export const catalogService = {
  getCategories: async (): Promise<Category[]> => {
    const cats = await dataStore.getCategories();
    return cats.filter((c) => c.active).sort((a, b) => a.sort_order - b.sort_order);
  },

  getAllCategories: async (): Promise<Category[]> => {
    return dataStore.getCategories();
  },

  getProducts: async (categoryId?: string, searchQuery?: string): Promise<Product[]> => {
    let products = await dataStore.getProducts();

    if (categoryId && categoryId !== 'all') {
      products = products.filter((p) => p.category_id === categoryId);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    return products;
  },

  getProductById: async (id: string): Promise<Product | null> => {
    const products = await dataStore.getProducts();
    return products.find((p) => p.id === id) || null;
  },

  getProductBySlug: async (slug: string): Promise<Product | null> => {
    const products = await dataStore.getProducts();
    return products.find((p) => p.slug === slug) || null;
  },

  saveProduct: async (product: Product): Promise<Product> => {
    const products = await dataStore.getProducts();
    const idx = products.findIndex((p) => p.id === product.id);

    if (idx >= 0) {
      products[idx] = { ...product, updated_at: new Date().toISOString() };
    } else {
      products.push({
        ...product,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    dataStore.saveProducts(products);
    return product;
  },

  updateStock: async (productId: string, newStock: number): Promise<boolean> => {
    const products = await dataStore.getProducts();
    const prod = products.find((p) => p.id === productId);
    if (!prod) return false;

    prod.stock_quantity = Math.max(0, newStock);
    prod.updated_at = new Date().toISOString();
    dataStore.saveProducts(products);
    return true;
  },

  deleteProduct: async (productId: string): Promise<boolean> => {
    const products = await dataStore.getProducts();
    const filtered = products.filter((p) => p.id !== productId);
    dataStore.saveProducts(filtered);
    return true;
  },
};
