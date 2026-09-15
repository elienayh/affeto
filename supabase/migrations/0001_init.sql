-- Affeto Pães — migração inicial (Fase 1)
-- Cobre o núcleo transacional necessário para Fases 1-3.
-- Entidades de marketing/fidelidade/pós-MVP entram em migrações seguintes,
-- seguindo a regra da seção 4 do prompt-v2 (schema existe, sem UI).

create extension if not exists "uuid-ossp";

create type user_role as enum (
  'SUPER_ADMIN', 'ADMIN', 'ATENDENTE', 'PRODUCAO', 'ENTREGADOR', 'CUSTOMER'
);

create type order_status as enum (
  'PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'CANCELLED'
);

create type payment_status as enum (
  'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED'
);

-- ---------- identidade ----------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role user_role not null default 'CUSTOMER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table addresses (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references profiles(id) on delete cascade,
  label text, -- "Casa", "Trabalho"
  zip_code text not null,
  street text not null,
  number text,
  complement text,
  neighborhood text,
  city text not null,
  reference text,
  created_at timestamptz not null default now()
);

-- ---------- catálogo ----------

create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references categories(id),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(10, 2) not null,
  promotional_price numeric(10, 2),
  unit text not null default 'unidade',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null, -- caminho no bucket `products` do Supabase Storage
  display_order int not null default 0
);

create table product_options (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null -- ex: "Com/sem manteiga"
);

create table product_option_values (
  id uuid primary key default uuid_generate_v4(),
  option_id uuid not null references product_options(id) on delete cascade,
  label text not null,
  price_delta numeric(10, 2) not null default 0
);

create table inventory (
  product_id uuid primary key references products(id) on delete cascade,
  quantity int not null default 0,
  reserved int not null default 0,
  version int not null default 0 -- controle de concorrência otimista, seção 5.2
);

-- ---------- carrinho e pedido ----------

create table carts (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table cart_items (
  id uuid primary key default uuid_generate_v4(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null check (quantity > 0),
  unit_price numeric(10, 2) not null,
  note text
);

create table delivery_zones (
  id uuid primary key default uuid_generate_v4(),
  name text not null, -- bairro/região
  is_active boolean not null default true
);

create table delivery_fees (
  id uuid primary key default uuid_generate_v4(),
  zone_id uuid not null references delivery_zones(id) on delete cascade,
  fee numeric(10, 2) not null,
  min_order_value numeric(10, 2) not null default 0,
  free_above numeric(10, 2)
);

create table coupons (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  percent_off numeric(5, 2),
  amount_off numeric(10, 2),
  min_order_value numeric(10, 2) not null default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  usage_limit int,
  is_active boolean not null default true
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_number bigint generated always as identity,
  customer_id uuid not null references profiles(id),
  fulfillment_type text not null check (fulfillment_type in ('DELIVERY', 'PICKUP')),
  address_id uuid references addresses(id),
  scheduled_for timestamptz, -- agendamento (seção 14 do prompt-v1)
  subtotal numeric(10, 2) not null,
  discount numeric(10, 2) not null default 0,
  delivery_fee numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  status order_status not null default 'PENDING_PAYMENT',
  payment_status payment_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null,
  unit_price numeric(10, 2) not null
);

create table order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  changed_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_payment_id text,
  status payment_status not null default 'PENDING',
  amount numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create table payment_events (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid not null references payments(id) on delete cascade,
  raw_payload jsonb not null,
  received_at timestamptz not null default now()
);

create table business_hours (
  weekday int not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  primary key (weekday)
);

create table business_exceptions (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  is_closed boolean not null default true,
  note text
);

create table favorites (
  customer_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  primary key (customer_id, product_id)
);

create table banners (
  id uuid primary key default uuid_generate_v4(),
  title text,
  subtitle text,
  storage_path text not null,
  link_type text check (link_type in ('PRODUCT', 'CATEGORY', 'PROMOTION')),
  link_target_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  display_order int not null default 0
);

-- ---------- pós-MVP: schema presente, sem UI (seção 4 do prompt-v2) ----------

create table loyalty_accounts (
  customer_id uuid primary key references profiles(id) on delete cascade,
  points int not null default 0
);

create table loyalty_transactions (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references profiles(id) on delete cascade,
  points int not null,
  order_id uuid references orders(id),
  created_at timestamptz not null default now()
);

create table cashback_accounts (
  customer_id uuid primary key references profiles(id) on delete cascade,
  balance numeric(10, 2) not null default 0
);

create table cashback_transactions (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references profiles(id) on delete cascade,
  amount numeric(10, 2) not null,
  order_id uuid references orders(id),
  created_at timestamptz not null default now()
);

create table referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid not null references profiles(id),
  referred_id uuid references profiles(id),
  status text not null default 'PENDING',
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id),
  customer_id uuid not null references profiles(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references profiles(id) on delete cascade,
  event_type text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- RLS: deny por padrão, policies explícitas ----------

alter table profiles enable row level security;
alter table addresses enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table favorites enable row level security;
alter table loyalty_accounts enable row level security;
alter table cashback_accounts enable row level security;
-- (demais tabelas: mesma lógica — deny por padrão, policy por role, ver seção 6 do prompt-v2)

create policy "cliente vê o próprio perfil"
  on profiles for select
  using (auth.uid() = id);

create policy "cliente vê os próprios pedidos"
  on orders for select
  using (auth.uid() = customer_id);

create policy "cliente vê os próprios endereços"
  on addresses for select
  using (auth.uid() = customer_id);

create policy "cliente gerencia os próprios favoritos"
  on favorites for all
  using (auth.uid() = customer_id);

-- Catálogo (categories, products, banners, etc.) é público para leitura
-- e só editável por role ADMIN/SUPER_ADMIN — policies detalhadas na Fase 4,
-- junto com o CRUD administrativo.
