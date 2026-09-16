export interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number;
}

export interface ProductImage {
  id: string;
  storage_path: string;
  display_order: number;
}

export interface ProductOptionValue {
  id: string;
  label: string;
  price_delta: number;
}

export interface ProductOption {
  id: string;
  name: string;
  values: ProductOptionValue[];
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  unit: string;
  is_active: boolean;
  images: ProductImage[];
  available_quantity?: number;
}

export interface ProductDetail extends Product {
  options: ProductOption[];
}
