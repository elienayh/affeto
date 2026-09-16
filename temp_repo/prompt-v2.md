# Prompt Técnico — Affeto Pães (v2)

> Revisão do prompt original. Objetivo: eliminar ambiguidades, transformar intenções em
> requisitos verificáveis e amarrar o escopo ao repositório real do projeto.

**Repositório oficial:** https://github.com/elienayh/affeto.git
**Estado atual do repositório:** vazio (sem commits) — este prompt assume ponto de partida zero.

---

## 0. Sumário executivo

Aplicação web mobile-first de pedidos online para a padaria **Affeto Pães**, com catálogo
(pães, bolos, salgados, doces, bebidas, combos), carrinho, entrega/retirada agendada,
pagamento via Mercado Pago e painel administrativo. Stack: Next.js + Supabase + Vercel.

O prompt original (62 seções) é completo em intenção, mas mistura três coisas que precisam
ser separadas para virar um plano executável: **requisitos de produto**, **regras de negócio
não-negociáveis** e **roadmap de fases**. Esta v2 reorganiza nessa ordem e adiciona o que
faltava: critérios de "pronto", contrato de dados mínimo e definição do que é MVP real vs.
o que é "preparar estrutura para o futuro".

---

## 1. O que muda em relação à v1

| Ponto | v1 | v2 |
|---|---|---|
| Repositório | Não mencionado | Fixado: `elienayh/affeto`, branch `main` protegida, trabalho em branches `feature/*` |
| Escopo do MVP | Fases 1–8 descritas com o mesmo peso | MVP explícito = Fases 1–5. Fases 6–8 (fidelidade, cashback, indicação, WhatsApp, PWA) marcadas como **pós-MVP**, apenas com camada de serviço preparada, sem UI completa |
| "Preparar estrutura para o futuro" | Repetido em ~10 seções sem definição | Definido uma vez (seção 4) o que isso significa tecnicamente: tabela existe + tipo TS existe + service layer com stub, sem tela |
| Critério de aceite | Ausente | Cada fase (seção 7) ganha uma checklist de "Definition of Done" |
| Concorrência de estoque | Mencionada como regra, sem mecanismo | Especificado: reserva otimista com `SELECT ... FOR UPDATE` ou coluna `version` + retry, dentro de uma transação Postgres/Supabase RPC |
| Cálculo financeiro | "Recalcular no servidor" repetido 3x | Consolidado numa única regra (seção 5.1): existe *um* módulo `pricing-engine` que é a única fonte de verdade para subtotal/desconto/frete/total, chamado por checkout e por webhook |
| Identidade visual | Adjetivos ("aconchego", "elegância") sem tokens | Convertidos em paleta hexadecimal e escala tipográfica concretas (seção 3) |
| Imagens de referência | Anexadas sem indicação de uso técnico | Logo tratada como asset de marca (favicon, header, splash); foto do pão como referência de *mood* fotográfico para banners, não para ser usada literalmente (é material de terceiros/mockup, não asset de produção) |

---

## 2. Stack e restrições técnicas (mantido da v1, sem ambiguidade)

- **Frontend:** Next.js (App Router) + React + TypeScript + Tailwind CSS
- **Hospedagem:** Vercel
- **Backend/dados:** Supabase (Postgres, Auth, Storage, RLS, Edge Functions/RPC quando necessário)
- **Pagamentos:** Mercado Pago, integração exclusivamente server-side (Route Handlers/Server Actions)
- **Proibido:** Lovable Cloud, Firebase como backend principal, banco local como fonte de dados
- **Segredos:** `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`
  nunca chegam ao bundle do cliente. Apenas variáveis com prefixo `NEXT_PUBLIC_` podem ser
  usadas em Client Components: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 3. Identidade visual (tokens, não adjetivos)

Extraído da logo e da foto de referência anexadas:

- `--color-cream: #F3ECDD` (fundo base)
- `--color-gold: #B7A05E` (destaque secundário, tag "A" da logo)
- `--color-brown-dark: #3A2E1F` (texto principal, wordmark "Affeto")
- `--color-terracota: #B8623F` (call-to-action, elemento de marca)
- `--color-white: #FFFFFF`

Tipografia: uma serifada para o wordmark/headlines (personalidade artesanal, ecoando o
logotipo) e uma sans-serif neutra para corpo de texto e UI (legibilidade em telas pequenas).
Não usar caixa alta para labels; não usar sombra genérica de card SaaS (`rgba(0,0,0,.1)` em
tudo) — sombras suaves e quentes, raio de borda generoso (cards "macios", como pão), fotos de
produto grandes e bem iluminadas (luz quente, como na imagem de referência).

## 4. Regra única: "preparar para o futuro"

Toda vez que este documento (ou o v1) disser "preparar estrutura para X futuramente"
(fidelidade, cashback, indicação, notificações push, WhatsApp, carrinho abandonado),
isso significa, tecnicamente, e **somente**:
1. a tabela existe no schema Postgres, com RLS já configurada;
2. existe um tipo TypeScript correspondente;
3. existe uma função/service (`lib/services/<nome>.ts`) com assinatura definida e
   implementação stub (retorna not-implemented ou no-op);
4. **não** existe tela de usuário final para essa função no MVP.

Isso evita que "preparar para o futuro" vire desculpa para nem começar, nem para
implementar UI completa fora do escopo do MVP.

## 5. Regras de negócio críticas (não-negociáveis)

### 5.1 Pricing engine (fonte única de verdade)
Um único módulo server-side recalcula `subtotal → desconto → taxa de entrega → total`
a partir de: itens do carrinho persistidos no banco, tabela de cupons, tabela de promoções,
tabela de taxas de entrega por região. Nunca aceitar preço, desconto ou total vindos do
cliente. Chamado por: criação de pedido/checkout e, na conferência, pelo handler do webhook
do Mercado Pago.

### 5.2 Estoque com concorrência
Ao confirmar pedido: verificar disponível → reservar em transação (lock de linha ou coluna
`version` com retry otimista) → criar pedido `PENDING_PAYMENT` → iniciar pagamento →
confirmar ou liberar reserva conforme resultado do pagamento/timeout.

### 5.3 Status separados
`order_status` (PENDING_PAYMENT, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED,
PICKED_UP, CANCELLED) é independente de `payment_status` (PENDING, APPROVED, REJECTED,
CANCELLED, REFUNDED). Ambos têm histórico (`order_status_history`, `payment_events`).

### 5.4 Webhook Mercado Pago
`/api/webhooks/mercadopago`: valida assinatura/origem conforme docs oficiais, consulta o
pagamento pela API (não confia só no payload recebido), atualiza `payment_status` e
`payment_events`, idempotente (reprocessar a mesma notificação não duplica efeito).

## 6. Modelo de dados (mesmo conjunto de entidades da v1, referência única)

```
profiles, customers, stores, addresses, categories, products, product_images,
product_options, product_option_values, inventory, production_batches, banners,
promotions, promotion_products, coupons, coupon_usage, carts, cart_items, orders,
order_items, order_status_history, payments, payment_events, delivery_zones,
delivery_fees, favorites, loyalty_accounts, loyalty_transactions, cashback_accounts,
cashback_transactions, referrals, notifications, reviews, business_hours,
business_exceptions
```
UUID como chave primária; `created_at`/`updated_at` em todas as entidades transacionais;
RLS por padrão *deny*, com policies explícitas por role
(`SUPER_ADMIN, ADMIN, ATENDENTE, PRODUCAO, ENTREGADOR, CUSTOMER`).

## 7. Fases com Definition of Done

**MVP = Fases 1 a 5.** Fases 6–8 seguem a regra da seção 4 (estrutura preparada, sem UI).

### Fase 1 — Fundação
Next.js + TS + Tailwind + design system inicial (tokens da seção 3) + Supabase (schema,
Auth, Storage, RLS) + arquitetura de pastas.
**DoD:** `npm run build` sem erros; conexão com Supabase testada; RLS ativa em todas as
tabelas com pelo menos uma policy; deploy de preview funcionando na Vercel.

### Fase 2 — Catálogo
Home, categorias, listagem de produtos, busca, página de produto, favoritos.
**DoD:** navegação completa cliente (sem login) até a página de produto, com dados reais do
Supabase (não mock).

### Fase 3 — Compra
Carrinho, entrega/retirada, endereços, horários, agendamento, criação de pedido.
**DoD:** fluxo completo do carrinho até pedido criado com status `PENDING_PAYMENT`, com
recalculo de preço no servidor (seção 5.1).

### Fase 4 — Administração
Dashboard, Kanban de pedidos, CRUD de produtos/categorias, clientes, estoque, entrega.
**DoD:** admin consegue criar produto, ver pedido novo aparecer no Kanban e mudar status.

### Fase 5 — Mercado Pago
Criação de pagamento, webhook, confirmação, tratamento de erro.
**DoD:** pedido de teste sandbox percorre pendente → aprovado com atualização automática via
webhook (seção 5.4), sem intervenção manual.

### Pós-MVP (Fases 6–8, apenas estrutura conforme seção 4)
Marketing (promoções/cupons/combos com UI completa — na verdade entra ainda no MVP pois é
usado no pricing engine desde a Fase 3/5, então cupons e promoções básicos **não** são
pós-MVP), fidelidade, cashback, indicação, avaliações, notificações, WhatsApp, pedidos
recorrentes, carrinho abandonado, PWA.

## 8. O que não fazer

- Não implementar Fases 6–8 com UI antes do MVP estar de ponta a ponta funcional.
- Não deixar regra de preço, frete ou estoque no frontend.
- Não usar a foto do pão anexada como asset final de produção (é referência de estilo; gerar
  ou licenciar fotografia própria para banners reais).
- Não expor `SUPABASE_SERVICE_ROLE_KEY` ou `MERCADOPAGO_ACCESS_TOKEN` em nenhum código que
  rode no navegador.

---

Comece pela **Fase 1**, no repositório `elienayh/affeto`, branch `main`.
