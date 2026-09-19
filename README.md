# 🥖 Affeto Pães

```{=html}
<p align="center">
```
`<strong>`{=html}Uma plataforma digital completa para transformar uma
padaria artesanal em uma operação conectada.`</strong>`{=html}
```{=html}
</p>
```
```{=html}
<p align="center">
```
Catálogo • Pedidos • Produção • Entregas • Pagamentos • Gestão
```{=html}
</p>
```
```{=html}
<p align="center">
```
`<a href="https://affetopaes.vercel.app/">`{=html}🌐
Aplicação`</a>`{=html} •
`<a href="https://github.com/elienayh/affeto">`{=html}💻
Código-fonte`</a>`{=html}
```{=html}
</p>
```

------------------------------------------------------------------------

## ✨ Sobre o projeto

O **Affeto Pães** é uma plataforma web desenvolvida para uma padaria
artesanal, conectando a experiência de compra do cliente à operação
interna da empresa.

Mais do que um catálogo online, o sistema foi pensado como uma
**plataforma de gestão operacional**, acompanhando o pedido desde a
escolha dos produtos até a produção e a entrega.

### O sistema reúne

-   🛒 Loja online e catálogo
-   📦 Gestão de pedidos
-   🥖 Produção e fornadas
-   🚚 Entregas e retirada
-   💳 Pagamentos
-   🎟️ Cupons e promoções
-   📍 Regras de entrega
-   🖼️ Imagens e identidade da loja
-   ⚙️ Configurações administrativas

------------------------------------------------------------------------

## 🎯 O conceito

A proposta é resolver uma necessidade real:

> **Como transformar uma operação artesanal em uma experiência digital
> organizada sem perder a identidade da marca?**

A resposta é uma aplicação que une **e-commerce, operação de pedidos e
gestão da produção** em uma única experiência.

O **Supabase é utilizado como fonte oficial dos dados operacionais**,
mantendo as informações centralizadas.

------------------------------------------------------------------------

## 🧩 Principais recursos

### 🛍️ Loja online

-   Catálogo por categorias
-   Busca de produtos
-   Produtos em destaque
-   Descrições detalhadas
-   Variações e opções
-   Carrinho persistente
-   Favoritos
-   Cupons
-   Retirada ou entrega
-   Agendamento de pedidos

### 📅 Produtos com produção programada

Uma padaria artesanal não funciona necessariamente como um estoque
convencional.

Um produto pode possuir:

-   dias específicos de produção;
-   quantidade máxima por fornada;
-   prazo mínimo para pedido;
-   janela de entrega;
-   disponibilidade futura.

Isso permite cenários como:

> **"Disponível somente na próxima fornada de sexta-feira."**

### 📦 Gestão de pedidos

O painel permite acompanhar:

-   cliente;
-   produtos e quantidades;
-   valores;
-   forma de entrega;
-   endereço;
-   data e horário;
-   observações;
-   pagamento;
-   situação operacional.

A interface foi pensada como uma **esteira operacional**, facilitando a
visualização dos pedidos que precisam de atenção.

### 💰 Pagamento separado da operação

O Affeto considera que:

> **status de pagamento e status operacional são dimensões diferentes do
> pedido.**

Um pedido pode ainda não estar pago e, mesmo assim, estar confirmado
para produção ou em rota.

Isso permite situações reais como:

**"O cliente paga na entrega, mas o pedido já pode entrar na
produção."**

### 🚚 Entregas

Estrutura para trabalhar com:

-   CEP;
-   localidade;
-   região;
-   taxa;
-   prazo estimado;
-   retirada;
-   data programada;
-   janela de entrega.

### 🏷️ Cupons

Suporte para:

-   percentual;
-   valor fixo;
-   valor mínimo;
-   validade;
-   limite de utilização.

### 🖼️ Gestão de imagens

Integração com armazenamento em nuvem para:

-   logotipo;
-   fotos de produtos;
-   imagens de categorias;
-   assets administrativos.

------------------------------------------------------------------------

## 🧑‍💼 Painel administrativo

  Área                    Função
  ----------------------- ----------------------------
  📦 Pedidos & Fornadas   Acompanhamento operacional
  🥖 Produtos & Fotos     Gestão do catálogo
  🗂️ Categorias           Organização do cardápio
  📍 Locais & Frete       Regras de entrega
  🎟️ Cupons               Promoções
  ⚙️ Configurações        Identidade e funcionamento

A ideia é permitir que o gestor administre a operação sem precisar
acessar diretamente o banco de dados.

------------------------------------------------------------------------

## 🏗️ Arquitetura

``` text
┌─────────────────────────────┐
│        Cliente / Gestor     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       React + Vite          │
│       TypeScript            │
│       Tailwind CSS          │
└──────────────┬──────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ API / Vercel│  │  Supabase   │
│             │  │ PostgreSQL  │
└──────┬──────┘  │ Auth/Storage│
       │         └─────────────┘
       ▼
┌─────────────────────────────┐
│       Serviços externos     │
│        Mercado Pago         │
└─────────────────────────────┘
```

### Stack

**Frontend** - React - TypeScript - Vite - Tailwind CSS

**Backend e dados** - Node.js - Express - Supabase - PostgreSQL

**Infraestrutura** - GitHub - Vercel - Supabase Storage

**Pagamentos** - Mercado Pago

------------------------------------------------------------------------

## 🔐 Fonte de verdade

Um princípio importante do projeto é evitar múltiplas fontes
concorrentes.

### Supabase = fonte oficial

Dados operacionais como:

-   produtos;
-   categorias;
-   pedidos;
-   configurações;
-   cupons;
-   zonas de entrega;

devem permanecer centralizados no banco.

O `localStorage` é reservado para recursos apropriados à experiência do
cliente, como carrinho e favoritos, e não funciona como banco principal
da operação.

------------------------------------------------------------------------

## 🛠️ Desenvolvimento

### Requisitos

-   Node.js
-   npm
-   Projeto Supabase
-   Conta Vercel para publicação

### Instalação

``` bash
git clone https://github.com/elienayh/affeto.git
cd affeto
npm install
```

### Variáveis de ambiente

Crie `.env` baseado em `.env.example`.

``` env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=

VITE_BAKERY_WHATSAPP_NUMBER=
```

> **Nunca publique credenciais reais no GitHub.**

### Desenvolvimento

``` bash
npm run dev
```

### Build

``` bash
npm run build
```

### Verificação de tipos

``` bash
npx tsc --noEmit
```

------------------------------------------------------------------------

## ☁️ Deploy

O projeto pode ser publicado diretamente a partir do GitHub através da
integração com a Vercel.

``` text
GitHub
   │
   ▼
Commit / Push
   │
   ▼
Vercel
   │
   ├── Build
   ├── Deploy
   └── Production
        │
        ▼
      Affeto
```

------------------------------------------------------------------------

## 📐 Princípios

### 1. Dados centralizados

O banco é a fonte oficial das informações operacionais.

### 2. Interface orientada à operação

O painel deve ajudar o gestor a **agir**, não apenas visualizar dados.

### 3. Estados independentes

Pagamento, produção e entrega possuem estados próprios.

### 4. Experiência simples

A tecnologia deve ficar em segundo plano.

### 5. Identidade artesanal

A interface preserva a personalidade de uma padaria artesanal em vez de
parecer apenas um sistema administrativo.

------------------------------------------------------------------------

## 🚀 Roadmap

-   [ ] Dashboard financeiro avançado
-   [ ] Histórico completo de alterações
-   [ ] Gestão avançada de produção
-   [ ] Planejamento automático de fornadas
-   [ ] Rotas de entrega
-   [ ] Notificações via WhatsApp
-   [ ] Relatórios de vendas
-   [ ] Análise de produtos mais vendidos
-   [ ] Previsão de demanda
-   [ ] Programa de fidelidade
-   [ ] Gestão de clientes
-   [ ] PWA / experiência mobile aprimorada

------------------------------------------------------------------------

## 📸 Interface

### Loja

Uma vitrine digital criada para apresentar os produtos, facilitar a
descoberta e conduzir o cliente ao pedido.

### Gestão

Um painel operacional para acompanhar pedidos, produção, pagamentos e
entregas.

> Adicione screenshots reais da aplicação conforme o projeto evoluir.

------------------------------------------------------------------------

## 🥖 Sobre a Affeto Pães

A **Affeto Pães** é uma padaria artesanal localizada em **Espera Feliz
--- MG**, com foco em produtos de fermentação lenta, pães artesanais,
viennoiserie e confeitaria.

O sistema foi desenvolvido para transformar a operação da marca em uma
experiência digital integrada, mantendo simplicidade para o cliente e
controle para quem administra o negócio.

------------------------------------------------------------------------

## 📄 Licença

Este projeto possui código-fonte público para fins de demonstração e
desenvolvimento.

Consulte os termos definidos pelo proprietário antes de reutilizar o
código em aplicações comerciais.

------------------------------------------------------------------------

```{=html}
<p align="center">
```
`<strong>`{=html}🥖 Affeto Pães`</strong>`{=html}`<br>`{=html}
Tecnologia para uma operação artesanal.
```{=html}
</p>
```
