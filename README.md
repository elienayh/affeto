# Affeto Pães

Plataforma própria de pedidos online da padaria Affeto Pães. Next.js + Supabase + Vercel
+ Mercado Pago. Especificação completa em [`prompt-v2.md`](./prompt-v2.md).

## Estado atual

**Fase 1 (fundação) + Fase 2 (catálogo) implementadas.**

Fase 1:
- estrutura de pastas Next.js (App Router) + TypeScript + Tailwind com os tokens de marca;
- clients Supabase (browser, server, admin) já separando o que pode rodar no navegador do
  que só pode rodar no servidor;
- migração inicial do banco (`supabase/migrations/0001_init.sql`) com o núcleo transacional
  e RLS básica ativada;
- pricing engine server-side (stub funcional, sem promoções/cupons ainda — Fase 3);
- stubs de serviço para as features pós-MVP (fidelidade, cashback, notificações), conforme
  a regra da seção 4 do prompt-v2.

Fase 2:
- Home, `/categorias`, `/categoria/[slug]`, `/produto/[slug]` e `/busca` consultando o
  Supabase de verdade (nenhum mock) — rode `supabase/seed.sql` para ter o que ver;
- autenticação via Supabase Auth (`/entrar`, `/cadastro`, logout), necessária para favoritos;
- favoritos (`/favoritos`, botão ♥ na página de produto);
- design system ampliado: `ProductCard`, `CategoryCard`, `QuantitySelector`,
  `FavoriteButton`, `Header`.

**Ainda não implementado:** carrinho persistente, checkout, entrega/retirada, painel admin
(Fase 4), Mercado Pago (Fase 5). O botão "Adicionar" na página de produto é presentacional
até a Fase 3 ligar o carrinho.

## Como rodar localmente

```bash
npm install
cp .env.example .env.local   # preencher com as credenciais do seu projeto Supabase
npm run dev
```

Para aplicar o schema, use a CLI do Supabase (`supabase db push`) apontando para o projeto,
ou cole o conteúdo de `supabase/migrations/0001_init.sql` no SQL Editor do Supabase — e depois
`supabase/seed.sql` para ter categorias/produtos de demonstração e navegar pelo app.

Autenticação: crie usuários normalmente pela tela `/cadastro` (usa Supabase Auth). Não é
necessário configurar nada além das variáveis de ambiente.

## Roadmap

Ver seção 7 de `prompt-v2.md` para a checklist de "Definition of Done" de cada fase.

1. Fundação — ✅
2. Catálogo — ✅
3. Compra (carrinho, entrega/retirada, checkout) — *próxima*
4. Administração
5. Mercado Pago
6. Marketing avançado (promoções complexas)
7. Fidelidade / cashback / indicação
8. Evolução (notificações push, WhatsApp, avaliações, PWA)
