-- Affeto Pães — dados demonstrativos (seção 54 do prompt-v1)
-- Rodar depois de 0001_init.sql, no SQL Editor do Supabase ou via `supabase db reset`.
-- Preços fictícios, fáceis de alterar depois pelo painel admin (Fase 4).
-- As imagens usam paths de exemplo em Supabase Storage (bucket `products`);
-- suba as imagens reais nesses caminhos ou troque por outros existentes.

insert into categories (name, slug, display_order) values
  ('Pães', 'paes', 1),
  ('Bolos', 'bolos', 2),
  ('Salgados', 'salgados', 3),
  ('Bebidas', 'bebidas', 4),
  ('Combos', 'combos', 5);

with cat as (select id, slug from categories)

insert into products (category_id, name, slug, description, price, promotional_price, unit)
select cat.id, v.name, v.slug, v.description, v.price, v.promotional_price, v.unit
from (values
  ('paes', 'Pão Francês', 'pao-frances', 'Crocante por fora, macio por dentro. Assado várias vezes ao dia.', 0.90, null::numeric, 'unidade'),
  ('paes', 'Pão de Leite', 'pao-de-leite', 'Macio e levemente adocicado, ótimo para o café da manhã.', 1.20, null, 'unidade'),
  ('paes', 'Pão Caseiro', 'pao-caseiro', 'Receita tradicional de forno a lenha.', 12.90, 10.90, 'unidade (700g)'),
  ('paes', 'Pão Integral', 'pao-integral', 'Feito com grãos integrais, sem açúcar refinado.', 14.90, null, 'unidade (600g)'),
  ('salgados', 'Pão de Queijo', 'pao-de-queijo', 'Receita mineira, forninho sempre quente.', 2.50, null, 'unidade'),
  ('bolos', 'Bolo de Milho', 'bolo-de-milho', 'Feito com milho verde de verdade.', 24.90, null, 'unidade (900g)'),
  ('bolos', 'Bolo de Cenoura', 'bolo-de-cenoura', 'Com cobertura de chocolate.', 26.90, 22.90, 'unidade (900g)'),
  ('bebidas', 'Café Affeto', 'cafe-affeto', 'Café coado na hora, torra própria.', 6.00, null, 'copo 300ml'),
  ('combos', 'Combo Café da Manhã', 'combo-cafe-da-manha', '4 pães franceses + manteiga + café.', 18.90, 15.90, 'combo')
) as v(category_slug, name, slug, description, price, promotional_price, unit)
join cat on cat.slug = v.category_slug;

-- Opções/adicionais de exemplo (seção 10 do prompt-v1: "Pão com manteiga")
insert into product_options (product_id, name)
select id, 'Como prefere' from products where slug = 'pao-frances';

insert into product_option_values (option_id, label, price_delta)
select po.id, v.label, v.price_delta
from product_options po
join products p on p.id = po.product_id and p.slug = 'pao-frances'
cross join (values ('Com manteiga', 0.50), ('Sem manteiga', 0)) as v(label, price_delta);

insert into product_options (product_id, name)
select id, 'Adicionais' from products where slug = 'pao-de-queijo';

insert into product_option_values (option_id, label, price_delta)
select po.id, v.label, v.price_delta
from product_options po
join products p on p.id = po.product_id and p.slug = 'pao-de-queijo'
cross join (values ('+ Queijo extra', 1.50), ('+ Presunto', 2.00), ('+ Requeijão', 1.00)) as v(label, price_delta);

-- Estoque de demonstração
insert into inventory (product_id, quantity, reserved)
select id, 150, 0 from products;

-- Horário de funcionamento (seção 13 do prompt-v1)
insert into business_hours (weekday, opens_at, closes_at) values
  (1, '06:00', '19:00'),
  (2, '06:00', '19:00'),
  (3, '06:00', '19:00'),
  (4, '06:00', '19:00'),
  (5, '06:00', '19:00'),
  (6, '06:00', '19:00'),
  (0, '06:00', '12:00');

-- Taxa de entrega de demonstração
insert into delivery_zones (name) values ('Centro'), ('Bairro X'), ('Bairro Y');

insert into delivery_fees (zone_id, fee, min_order_value, free_above)
select z.id, v.fee, 0, 50
from delivery_zones z
join (values ('Centro', 3.00), ('Bairro X', 5.00), ('Bairro Y', 7.00)) as v(name, fee)
  on v.name = z.name;

-- Cupom de exemplo
insert into coupons (code, percent_off, min_order_value, valid_until, usage_limit)
values ('AFFETO10', 10, 30, '2026-09-30', 500);
