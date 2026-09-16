-- ==============================================================================
-- AFFETO PÃES ARTESANAIS - SCRIPT DE ATUALIZAÇÃO / CRIAÇÃO DO BANCO (SUPABASE)
-- Execute este script no SQL Editor do seu painel Supabase (https://supabase.com/dashboard)
-- 100% Idempotente: atualiza tabelas existentes e adiciona colunas faltantes sem perder dados.
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELA: STORES (Configurações da Loja, PIX, Logo, Endereço)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    pix_key TEXT,
    logo_url TEXT,
    is_open BOOLEAN NOT NULL DEFAULT true,
    min_order_value NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    opening_hours JSONB DEFAULT '[]'::jsonb,
    lead_time_minutes INT DEFAULT 45,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração de colunas para stores existentes
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS lead_time_minutes INT DEFAULT 45;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 3. TABELA: CATEGORIES (Categorias do Cardápio)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    display_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração de colunas para categories existentes (Corrige o erro de "description" ausente)
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 4. TABELA: PRODUCTS (Produtos, Preços, Fotos e Fornadas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(10,2),
    base_price NUMERIC(10,2),
    promotional_price NUMERIC(10,2),
    unit TEXT NOT NULL DEFAULT 'unidade',
    is_active BOOLEAN NOT NULL DEFAULT true,
    active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    stock_quantity INT NOT NULL DEFAULT 15,
    track_stock BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    allergens TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    schedule_config JSONB DEFAULT '{}'::jsonb,
    options JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração de colunas para products existentes
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promotional_price NUMERIC(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'unidade';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INT DEFAULT 15;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS schedule_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 5. TABELA: COUPONS (Cupons de Desconto)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    percent_off NUMERIC(10,2),
    amount_off NUMERIC(10,2),
    discount_type TEXT DEFAULT 'PERCENTAGE',
    discount_value NUMERIC(10,2),
    min_order_value NUMERIC(10,2) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    active BOOLEAN NOT NULL DEFAULT true,
    usage_limit INT,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração de colunas para coupons existentes
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS percent_off NUMERIC(10,2);
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS amount_off NUMERIC(10,2);
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'PERCENTAGE';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2);
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS usage_limit INT;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 6. TABELA: DELIVERY_CEPS (Taxas e Prazos por CEP)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.delivery_ceps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cep TEXT NOT NULL,
    label TEXT NOT NULL,
    fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    estimated_minutes INT NOT NULL DEFAULT 30,
    active BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração de colunas para delivery_ceps existentes
ALTER TABLE public.delivery_ceps ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.delivery_ceps ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE public.delivery_ceps ADD COLUMN IF NOT EXISTS fee NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.delivery_ceps ADD COLUMN IF NOT EXISTS estimated_minutes INT DEFAULT 30;
ALTER TABLE public.delivery_ceps ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.delivery_ceps ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.delivery_ceps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 7. TABELA: DELIVERY_ZONES (Zonas de Entrega)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    min_lead_time_minutes INT DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS fee NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS min_lead_time_minutes INT DEFAULT 30;
ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ==============================================================================
-- 8. TABELA: ORDERS (Pedidos dos Clientes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID,
    store_id UUID,
    order_number TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    payment_status TEXT NOT NULL DEFAULT 'PENDING',
    payment_method TEXT NOT NULL DEFAULT 'PIX',
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    delivery_type TEXT NOT NULL DEFAULT 'DELIVERY',
    delivery_date TEXT,
    delivery_window TEXT,
    notes TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    address JSONB DEFAULT '{}'::jsonb,
    delivery_address JSONB DEFAULT '{}'::jsonb,
    pix_qr_code TEXT,
    pix_copy_paste TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração de colunas para orders existentes
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING_PAYMENT';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'PIX';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'DELIVERY';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_date TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_window TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pix_qr_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 9. TABELA: ORDER_ITEMS (Itens dos Pedidos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID,
    product_name TEXT,
    name TEXT,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    price NUMERIC(10,2),
    quantity INT NOT NULL DEFAULT 1,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    options JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração de colunas para order_items existentes
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;

-- ==============================================================================
-- 10. TABELA: ORDER_STATUS_HISTORY (Auditoria e Linha do Tempo)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT NOT NULL DEFAULT 'SYSTEM',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 11. TABELA: PRODUCTION_BATCHES (Controle de Fornadas e Capacidade)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.production_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID,
    production_date TEXT NOT NULL,
    capacity INT NOT NULL DEFAULT 15,
    reserved_quantity INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PLANNED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 12. CONFIGURAÇÃO DE SEGURANÇA E POLÍTICAS RLS (Row Level Security)
-- Leitura e Escrita automáticas via Frontend e API Server
-- ==============================================================================

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_ceps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;

-- Políticas STORES
DROP POLICY IF EXISTS "stores_read_policy" ON public.stores;
CREATE POLICY "stores_read_policy" ON public.stores FOR SELECT USING (true);
DROP POLICY IF EXISTS "stores_modify_policy" ON public.stores;
CREATE POLICY "stores_modify_policy" ON public.stores FOR ALL USING (true) WITH CHECK (true);

-- Políticas CATEGORIES
DROP POLICY IF EXISTS "categories_read_policy" ON public.categories;
CREATE POLICY "categories_read_policy" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "categories_modify_policy" ON public.categories;
CREATE POLICY "categories_modify_policy" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- Políticas PRODUCTS
DROP POLICY IF EXISTS "products_read_policy" ON public.products;
CREATE POLICY "products_read_policy" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "products_modify_policy" ON public.products;
CREATE POLICY "products_modify_policy" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- Políticas COUPONS
DROP POLICY IF EXISTS "coupons_read_policy" ON public.coupons;
CREATE POLICY "coupons_read_policy" ON public.coupons FOR SELECT USING (true);
DROP POLICY IF EXISTS "coupons_modify_policy" ON public.coupons;
CREATE POLICY "coupons_modify_policy" ON public.coupons FOR ALL USING (true) WITH CHECK (true);

-- Políticas DELIVERY_CEPS
DROP POLICY IF EXISTS "ceps_read_policy" ON public.delivery_ceps;
CREATE POLICY "ceps_read_policy" ON public.delivery_ceps FOR SELECT USING (true);
DROP POLICY IF EXISTS "ceps_modify_policy" ON public.delivery_ceps;
CREATE POLICY "ceps_modify_policy" ON public.delivery_ceps FOR ALL USING (true) WITH CHECK (true);

-- Políticas DELIVERY_ZONES
DROP POLICY IF EXISTS "zones_read_policy" ON public.delivery_zones;
CREATE POLICY "zones_read_policy" ON public.delivery_zones FOR SELECT USING (true);
DROP POLICY IF EXISTS "zones_modify_policy" ON public.delivery_zones;
CREATE POLICY "zones_modify_policy" ON public.delivery_zones FOR ALL USING (true) WITH CHECK (true);

-- Políticas ORDERS
DROP POLICY IF EXISTS "orders_read_policy" ON public.orders;
CREATE POLICY "orders_read_policy" ON public.orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "orders_modify_policy" ON public.orders;
CREATE POLICY "orders_modify_policy" ON public.orders FOR ALL USING (true) WITH CHECK (true);

-- Políticas ORDER_ITEMS
DROP POLICY IF EXISTS "order_items_read_policy" ON public.order_items;
CREATE POLICY "order_items_read_policy" ON public.order_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "order_items_modify_policy" ON public.order_items;
CREATE POLICY "order_items_modify_policy" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

-- Políticas ORDER_STATUS_HISTORY
DROP POLICY IF EXISTS "order_status_history_read_policy" ON public.order_status_history;
CREATE POLICY "order_status_history_read_policy" ON public.order_status_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "order_status_history_modify_policy" ON public.order_status_history;
CREATE POLICY "order_status_history_modify_policy" ON public.order_status_history FOR ALL USING (true) WITH CHECK (true);

-- Políticas PRODUCTION_BATCHES
DROP POLICY IF EXISTS "batches_read_policy" ON public.production_batches;
CREATE POLICY "batches_read_policy" ON public.production_batches FOR SELECT USING (true);
DROP POLICY IF EXISTS "batches_modify_policy" ON public.production_batches;
CREATE POLICY "batches_modify_policy" ON public.production_batches FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 13. DADOS INICIAIS (SEED) - SEGURO E COM TRATAMENTO DE CONFLITOS
-- ==============================================================================

-- Loja Matriz
INSERT INTO public.stores (id, name, slug, address, phone, whatsapp, pix_key, min_order_value, lead_time_minutes, is_open)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Affeto Pães Artesanais',
    'affeto-paes',
    'Rua dos Padeiros, 123 - Centro, São Paulo - SP',
    '(11) 99876-5432',
    '5511998765432',
    'contato@affetopaes.com.br',
    30.00,
    45,
    true
)
ON CONFLICT (slug) DO UPDATE SET
    phone = EXCLUDED.phone,
    whatsapp = EXCLUDED.whatsapp,
    pix_key = EXCLUDED.pix_key,
    address = EXCLUDED.address;

-- Categorias Iniciais
INSERT INTO public.categories (id, name, slug, description, sort_order, display_order, active, is_active)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Pães de Fermentação Natural', 'paes-artesanais', 'Pães feitos com levain vivo, fermentados lentamente por 24 a 36 horas.', 1, 1, true, true),
    ('c0000000-0000-0000-0000-000000000002', 'Baguetes & Focaccias', 'baguetes-focaccias', 'Massas italianas e francesas de alta hidratação com azeite extravirgem.', 2, 2, true, true),
    ('c0000000-0000-0000-0000-000000000003', 'Doces & Viennoiserie', 'doces-viennoiserie', 'Folhados com manteiga pura, cinnamon rolls artesanais e cookies.', 3, 3, true, true),
    ('c0000000-0000-0000-0000-000000000004', 'Cafés & Bebidas', 'cafes-bebidas', 'Cafés especiais moídos na hora e kombuchas artesanais.', 4, 4, true, true),
    ('c0000000-0000-0000-0000-000000000005', 'Pastas & Geleias', 'pastas-geleias', 'Acompanhamentos artesanais sem conservantes para seus pães.', 5, 5, true, true),
    ('c0000000-0000-0000-0000-000000000006', 'Kits & Cestas de Café', 'kits-cestas', 'Seleções especiais prontas para presentear ou para o café da manhã.', 6, 6, true, true)
ON CONFLICT (slug) DO UPDATE SET
    description = EXCLUDED.description,
    active = EXCLUDED.active;

-- Cupons Iniciais
INSERT INTO public.coupons (id, code, percent_off, discount_type, discount_value, min_order_value, is_active, active)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'PRIMEIRACOMPRA', 10.00, 'PERCENTAGE', 10.00, 40.00, true, true),
    ('d0000000-0000-0000-0000-000000000002', 'BEMVINDO', 5.00, 'PERCENTAGE', 5.00, 30.00, true, true)
ON CONFLICT (code) DO NOTHING;
