import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  ShoppingBag,
  Heart,
  Search,
  Filter,
  ArrowRight,
  Clock,
  Phone,
  MapPin,
  Instagram,
  CheckCircle2,
  Calendar,
  Layers,
  Flame,
  Wheat,
  ShieldCheck,
} from 'lucide-react';
import { catalogService } from './services/catalogService';
import { orderService } from './services/orderService';
import { pricingEngine } from './lib/pricingEngine';
import { dataStore } from './lib/supabase';
import {
  CartItem,
  CartItemOptionSelection,
  Category,
  Coupon,
  DeliveryCepRule,
  DeliveryType,
  DeliveryZone,
  Order,
  PaymentMethod,
  PricingBreakdown,
  Product,
  StoreSettings,
} from './types';
import { Header } from './components/Header';
import { CategoryScrollNav } from './components/CategoryScrollNav';
import { FeaturedItemBanner } from './components/FeaturedItemBanner';
import { FloatingCartButton } from './components/FloatingCartButton';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { PaymentScreen } from './components/PaymentScreen';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { OrderLookupModal } from './components/OrderLookupModal';
import { AdminPanel } from './components/AdminPanel';
import { FavoritesModal } from './components/FavoritesModal';
import { ScheduleInfoModal } from './components/ScheduleInfoModal';

export default function App() {
  // Catalog states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Delivery CEPs configuration
  const [deliveryCepRules, setDeliveryCepRules] = useState<DeliveryCepRule[]>([]);
  const [customerCep, setCustomerCep] = useState<string>('');

  // Store & delivery settings
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    name: 'Affeto Pães Artesanais',
    pix_key: 'contato@affetopaes.com.br',
    whatsapp: '5511987654321',
    address: 'Alameda Lorena, 1420 - Jardins, São Paulo - SP',
    opening_time: '07:30',
    closing_time: '19:30',
    lead_time_minutes: 45,
    min_order_value: 20.0,
    free_shipping_threshold: 120.0,
  });
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('zone-1');
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // Cart & Pricing
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('affeto_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('DELIVERY');
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | undefined>(undefined);
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Favorites
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('affeto_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals & Navigation Views
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrderLookupOpen, setIsOrderLookupOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isScheduleInfoOpen, setIsScheduleInfoOpen] = useState(false);

  // Listener for direct /admin and #admin routing requested by user
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || path.startsWith('/admin/') || hash === '#admin') {
        setIsAdminOpen(true);
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    window.addEventListener('hashchange', handleUrlRoute);
    return () => {
      window.removeEventListener('popstate', handleUrlRoute);
      window.removeEventListener('hashchange', handleUrlRoute);
    };
  }, []);

  // Active Order & Payment Flow
  const [activePaymentOrder, setActivePaymentOrder] = useState<{
    order: Order;
    method: PaymentMethod;
  } | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);

  // All store orders for admin and live updates
  const [allOrders, setAllOrders] = useState<Order[]>([]);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Initial Data Load
  const loadInitialData = async () => {
    setLoadingCatalog(true);
    try {
      const [prods, cats, zones, cps, sets, ords, cepRules] = await Promise.all([
        catalogService.getProducts(),
        catalogService.getCategories(),
        dataStore.getDeliveryZones(),
        dataStore.getCoupons(),
        dataStore.getStoreSettings(),
        dataStore.getOrders(),
        dataStore.getDeliveryCeps(),
      ]);

      setProducts(prods);
      setCategories(cats);
      setDeliveryZones(zones);
      if (zones.length > 0) setSelectedZoneId(zones[0].id);
      setCoupons(cps);
      setStoreSettings(sets);
      setAllOrders(ords);
      setDeliveryCepRules(cepRules);

      // Check URL for order tracking param
      const urlParams = new URLSearchParams(window.location.search);
      const orderParam = urlParams.get('order');
      if (orderParam) {
        const found = ords.find(
          (o) => o.code.toUpperCase() === orderParam.toUpperCase() || o.id === orderParam
        );
        if (found) {
          setTrackingOrder(found);
        }
      }
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Save cart to local storage
  useEffect(() => {
    localStorage.setItem('affeto_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Save favorites to local storage
  useEffect(() => {
    localStorage.setItem('affeto_favorites', JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  // Pricing Engine: Calculate live pricing whenever cart, delivery, zone or coupon changes
  const pricing: PricingBreakdown = useMemo(() => {
    const zone = deliveryZones.find((z) => z.id === selectedZoneId);
    return pricingEngine.calculateOrderPricing({
      items: cartItems,
      deliveryType,
      deliveryZone: zone,
      coupon: appliedCoupon,
      storeSettings,
      zipCode: customerCep,
      deliveryCepRules,
    });
  }, [
    cartItems,
    deliveryType,
    selectedZoneId,
    deliveryZones,
    appliedCoupon,
    storeSettings,
    customerCep,
    deliveryCepRules,
  ]);

  // Favorites Handlers
  const handleToggleFavorite = (productId: string) => {
    setFavoriteIds((prev) => {
      if (prev.includes(productId)) {
        showToast('Removido dos favoritos');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('Salvo nos favoritos!');
        return [...prev, productId];
      }
    });
  };

  // Cart Handlers
  const handleAddToCart = (
    product: Product,
    quantity: number,
    selectedOptions: CartItemOptionSelection[],
    notes: string
  ) => {
    const newItem = pricingEngine.createCartItem(product, quantity, selectedOptions, notes);

    setCartItems((prev) => {
      // Check if identical item already exists (same product and same options)
      const existingIdx = prev.findIndex(
        (it) =>
          it.product.id === product.id &&
          JSON.stringify(it.selected_options) === JSON.stringify(selectedOptions) &&
          it.notes === notes
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        const updatedQty = updated[existingIdx].quantity + quantity;
        updated[existingIdx] = pricingEngine.createCartItem(
          product,
          updatedQty,
          selectedOptions,
          notes
        );
        return updated;
      }

      return [...prev, newItem];
    });

    showToast(`"${product.name}" adicionado à sua cesta!`);
  };

  const handleQuickAdd = (product: Product) => {
    if (product.options && product.options.length > 0) {
      setSelectedProduct(product);
    } else {
      handleAddToCart(product, 1, [], '');
    }
  };

  const handleUpdateCartQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(cartItemId);
      return;
    }

    setCartItems((prev) =>
      prev.map((it) => {
        if (it.id === cartItemId) {
          return pricingEngine.createCartItem(
            it.product,
            newQty,
            it.selected_options,
            it.notes
          );
        }
        return it;
      })
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((it) => it.id !== cartItemId));
  };

  // Coupon handling
  const handleApplyCoupon = (code: string) => {
    setCouponMessage(null);
    if (!code.trim()) {
      setAppliedCoupon(undefined);
      return;
    }

    const res = pricingEngine.validateCoupon(code, pricing.subtotal, coupons);
    if (res.error || !res.coupon) {
      setCouponMessage({ text: res.error || 'Cupom inválido.', isError: true });
      setAppliedCoupon(undefined);
    } else {
      setAppliedCoupon(res.coupon);
      setCouponMessage({
        text: `Cupom ${res.coupon.code} aplicado com sucesso!`,
        isError: false,
      });
      showToast(`Cupom ${res.coupon.code} ativado!`);
    }
  };

  // Order & Payment flow transitions
  const handleOrderCreated = (order: Order, paymentMethod: PaymentMethod) => {
    // Clear cart
    setCartItems([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);

    // Refresh orders
    dataStore.getOrders().then((ords) => setAllOrders(ords));

    // Show Payment Screen
    setActivePaymentOrder({ order, method: paymentMethod });
  };

  const handlePaymentApproved = (updatedOrder: Order) => {
    dataStore.getOrders().then((ords) => setAllOrders(ords));
    showToast(`Pagamento do pedido ${updatedOrder.code} aprovado com sucesso!`);
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategoryId !== 'all' && p.category_id !== selectedCategoryId) {
        return false;
      }

      // Tag filter
      if (selectedTag !== 'all' && (!p.tags || !p.tags.includes(selectedTag))) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesDesc = p.description.toLowerCase().includes(query);
        const matchesTags = p.tags?.some((t) => t.toLowerCase().includes(query));
        if (!matchesName && !matchesDesc && !matchesTags) return false;
      }

      return true;
    });
  }, [products, selectedCategoryId, selectedTag, searchQuery]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    products.forEach((p) => p.tags?.forEach((t) => tagsSet.add(t)));
    return Array.from(tagsSet);
  }, [products]);

  const favoriteProducts = useMemo(() => {
    return products.filter((p) => favoriteIds.includes(p.id));
  }, [products, favoriteIds]);

  // If Admin view is active, render full-page AdminPanel directly
  if (isAdminOpen) {
    return (
      <AdminPanel
        isOpen={true}
        onClose={() => {
          setIsAdminOpen(false);
          if (
            window.location.pathname.toLowerCase() === '/admin' ||
            window.location.pathname.toLowerCase().startsWith('/admin/') ||
            window.location.hash.toLowerCase() === '#admin'
          ) {
            window.history.pushState(null, '', '/');
          }
        }}
        orders={allOrders}
        onOrderUpdated={() => {
          dataStore.getOrders().then(setAllOrders);
          dataStore.getDeliveryCeps().then(setDeliveryCepRules);
          catalogService.getProducts().then(setProducts);
          catalogService.getCategories().then(setCategories);
          dataStore.getStoreSettings().then(setStoreSettings);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#3A2E1F] flex flex-col selection:bg-[#B8623F] selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-70 bg-[#3A2E1F] text-[#F3ECDD] text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-[#B7A05E]/30 animate-slideUp">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Header */}
      <Header
        cartCount={pricing.items_count}
        favoritesCount={favoriteIds.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        onOpenOrderLookup={() => setIsOrderLookupOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        storeSettings={storeSettings}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* If Active Payment Screen is open, display it prominently */}
        {activePaymentOrder ? (
          <PaymentScreen
            order={activePaymentOrder.order}
            paymentMethod={activePaymentOrder.method}
            storeSettings={storeSettings}
            onPaymentApproved={(upd) => {
              setActivePaymentOrder({ ...activePaymentOrder, order: upd });
              handlePaymentApproved(upd);
            }}
            onViewOrderTracking={(ord) => {
              setActivePaymentOrder(null);
              setTrackingOrder(ord);
            }}
            onBackToMenu={() => setActivePaymentOrder(null)}
          />
        ) : (
          <>
            {/* 1. Categorias Cadastradas com Navegação por Rolagem Suave */}
            <CategoryScrollNav
              categories={categories}
              activeCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              productsCounts={categories.reduce((acc, cat) => {
                acc[cat.id] = products.filter((p) => p.category_id === cat.id && p.is_active).length;
                return acc;
              }, {} as Record<string, number>)}
            />

            {/* 2. Item em Destaque da Padaria */}
            {(() => {
              const featured =
                products.find((p) => p.id === 'prod-pao-nutella-especial') ||
                products.find((p) => p.tags?.includes('Destaque') || p.tags?.includes('Especial')) ||
                products[0];

              if (!featured) return null;

              return (
                <FeaturedItemBanner
                  product={featured}
                  orders={allOrders}
                  onSelectProduct={setSelectedProduct}
                  onQuickAdd={handleQuickAdd}
                  isInCart={cartItems.some((it) => it.product.id === featured.id)}
                />
              );
            })()}

            {/* 3. Demais Itens em Sequência por Categoria */}
            <div id="cardapio-itens-sequencia" className="space-y-12 pt-2">
              {loadingCatalog ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-10 h-10 border-3 border-[#B8623F] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-serif text-[#7E6C58]">
                    Aquecendo o forno e carregando os pães frescos...
                  </p>
                </div>
              ) : searchQuery.trim() ? (
                /* Exibição de busca quando usuário digita no campo de busca */
                <section className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#3A2E1F]/10 pb-2">
                    <h3 className="font-serif font-bold text-lg text-[#3A2E1F]">
                      Resultados para "{searchQuery}"
                    </h3>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-[#B8623F] hover:underline"
                    >
                      Limpar busca
                    </button>
                  </div>
                  {filteredProducts.length === 0 ? (
                    <div className="py-12 text-center bg-white rounded-2xl border border-[#3A2E1F]/10 p-6 text-xs text-[#7E6C58]">
                      Nenhum produto encontrado com o termo digitado.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                      {filteredProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          orders={allOrders}
                          isFavorite={favoriteIds.includes(product.id)}
                          onToggleFavorite={handleToggleFavorite}
                          onSelectProduct={setSelectedProduct}
                          onQuickAdd={handleQuickAdd}
                          isInCart={cartItems.some((it) => it.product.id === product.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ) : (
                /* Sequência direta por categoria com âncoras para rolagem */
                categories
                  .filter((cat) => cat.active)
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((cat) => {
                    const catProducts = products.filter(
                      (p) => p.category_id === cat.id && p.is_active
                    );
                    if (catProducts.length === 0) return null;

                    return (
                      <section
                        key={cat.id}
                        id={`secao-categoria-${cat.id}`}
                        className="space-y-4 scroll-mt-28"
                      >
                        {/* Header minimalista da Categoria */}
                        <div className="flex items-center justify-between border-b border-[#3A2E1F]/15 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#B8623F]" />
                            <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#3A2E1F] tracking-tight">
                              {cat.name}
                            </h3>
                          </div>
                          <span className="text-xs text-[#7E6C58] font-medium">
                            {catProducts.length} {catProducts.length === 1 ? 'item' : 'itens'}
                          </span>
                        </div>

                        {/* Grade de Produtos em Sequência */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                          {catProducts.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              orders={allOrders}
                              isFavorite={favoriteIds.includes(product.id)}
                              onToggleFavorite={handleToggleFavorite}
                              onSelectProduct={setSelectedProduct}
                              onQuickAdd={handleQuickAdd}
                              isInCart={cartItems.some((it) => it.product.id === product.id)}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1E1B18] text-[#FAF7F0] border-t border-[#3A2E1F]/20 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Column 1: Brand & Craft */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#B8623F] text-white flex items-center justify-center font-serif font-bold text-lg">
                  A
                </div>
                <span className="font-serif font-bold text-xl tracking-tight text-[#FAF7F0]">
                  Affeto
                </span>
              </div>
              <p className="text-xs text-[#A99885] leading-relaxed">
                Pães e folhados de fermentação lenta com levain de 36 horas, farinhas francesas selecionadas e respeito ao tempo do trigo.
              </p>
            </div>

            {/* Column 2: Hours & Schedule */}
            <div className="space-y-2 text-xs">
              <h4 className="font-serif font-bold text-sm text-[#EADBBA]">
                Horários da Fornada
              </h4>
              <p className="text-[#A99885]">
                <strong className="text-white">Segunda a Sábado:</strong> 07h30 às 19h30
              </p>
              <p className="text-[#A99885]">
                <strong className="text-white">Domingos e Feriados:</strong> 08h00 às 14h00
              </p>
              <p className="text-[#B7A05E] pt-1">
                Fornada fresca saindo às 08h00 e às 15h00.
              </p>
            </div>

            {/* Column 3: Location & Contact */}
            <div className="space-y-2 text-xs">
              <h4 className="font-serif font-bold text-sm text-[#EADBBA]">
                Endereço & Atendimento
              </h4>
              <div className="flex items-start gap-2 text-[#A99885]">
                <MapPin className="w-4 h-4 text-[#B8623F] shrink-0 mt-0.5" />
                <span>{storeSettings.address}</span>
              </div>
              <div className="flex items-center gap-2 text-[#A99885]">
                <Phone className="w-4 h-4 text-[#B8623F] shrink-0" />
                <span>WhatsApp: (11) 98765-4321</span>
              </div>
            </div>

            {/* Column 4: Quick Links & Management */}
            <div className="space-y-3 text-xs">
              <h4 className="font-serif font-bold text-sm text-[#EADBBA]">
                Atendimento & Rastreio
              </h4>
              <div className="space-y-2">
                <button
                  id="btn-footer-consultar-pedido"
                  onClick={() => setIsOrderLookupOpen(true)}
                  className="block text-[#A99885] hover:text-[#EADBBA] transition-colors cursor-pointer"
                >
                  Rastrear Meu Pedido por Código
                </button>
                <div className="pt-1 text-[11px] text-[#7E6C58]">
                  <span>Status da Fornada: </span>
                  <span className="font-mono text-emerald-400">Atendimento ao Vivo</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-[#7E6C58]">
            <p>© {new Date().getFullYear()} Affeto Pães Artesanais. Feito com afeto e farinha pura.</p>
            <p className="mt-2 sm:mt-0">Pronto para deploy na Vercel & Supabase.</p>
          </div>
        </div>
      </footer>

      {/* MODALS & OVERLAYS */}

      {/* 1. Product Customization & Details Modal */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        isFavorite={selectedProduct ? favoriteIds.includes(selectedProduct.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onAddToCart={handleAddToCart}
      />

      {/* 2. Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        pricing={pricing}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        deliveryType={deliveryType}
        onChangeDeliveryType={setDeliveryType}
        deliveryZones={deliveryZones}
        selectedZoneId={selectedZoneId}
        onChangeZoneId={setSelectedZoneId}
        deliveryCepRules={deliveryCepRules}
        inputCep={customerCep}
        onChangeCep={setCustomerCep}
        couponCodeInput={couponCode}
        onChangeCouponCode={setCouponCode}
        onApplyCoupon={handleApplyCoupon}
        couponMessage={couponMessage}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* 3. Checkout Modal com Suporte a CEP e Fornadas Programadas */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        pricing={pricing}
        deliveryType={deliveryType}
        selectedZoneId={selectedZoneId}
        deliveryCepRules={deliveryCepRules}
        initialCep={customerCep}
        orders={allOrders}
        storeSettings={storeSettings}
        onOrderCreated={handleOrderCreated}
      />

      {/* 4. Live Order Tracking Modal */}
      <OrderTrackingModal
        order={trackingOrder}
        onClose={() => setTrackingOrder(null)}
        storePhone={storeSettings.whatsapp}
      />

      {/* 5. Order Lookup Modal */}
      <OrderLookupModal
        isOpen={isOrderLookupOpen}
        onClose={() => setIsOrderLookupOpen(false)}
        onSelectOrder={(ord) => setTrackingOrder(ord)}
      />

      {/* 6. Favorites Modal */}
      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favoriteProducts}
        onRemoveFavorite={handleToggleFavorite}
        onQuickAdd={handleQuickAdd}
      />

      {/* 8. Schedule Info Modal */}
      <ScheduleInfoModal
        isOpen={isScheduleInfoOpen}
        onClose={() => setIsScheduleInfoOpen(false)}
      />

      {/* 9. Floating Cart Button (Botão flutuante para finalizar o pedido a qualquer momento) */}
      <FloatingCartButton
        itemsCount={pricing.items_count}
        totalAmount={pricing.total}
        itemCount={pricing.items_count}
        subtotal={pricing.total}
        onClick={() => setIsCartOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
      />
    </div>
  );
}
