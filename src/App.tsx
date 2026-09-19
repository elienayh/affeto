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
  Lock,
  Truck,
} from 'lucide-react';
import { catalogService } from './services/catalogService';
import { orderService } from './services/orderService';
import { pricingEngine } from './lib/pricingEngine';
import { dataStore, DEFAULT_STORE_SETTINGS, fetchServerRuntimeConfig } from './lib/supabase';
import { adminAuth } from './lib/adminAuth';
import { getNextAvailableBatch } from './lib/batchScheduler';
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
  ProductionBatch,
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
import { AdminLoginModal } from './components/AdminLoginModal';
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

  // Store & delivery settings (Unificada com dados editáveis)
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
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
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isScheduleInfoOpen, setIsScheduleInfoOpen] = useState(false);

  // Helper para abrir o Painel do Gestor (exige senha se não autenticado)
  const handleOpenAdminPanel = () => {
    if (adminAuth.isAuthenticated()) {
      setIsAdminOpen(true);
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  // Listener for direct /admin and #admin routing requested by user
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || path.startsWith('/admin/') || hash === '#admin') {
        if (adminAuth.isAuthenticated()) {
          setIsAdminOpen(true);
        } else {
          setIsAdminLoginOpen(true);
        }
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
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);

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
    setLoadError(null);
    try {
      // 1. Fetch server runtime configuration so Supabase credentials and database synchronization
      // are active immediately in this and all other browser sessions!
      await fetchServerRuntimeConfig();

      const [prods, cats, zones, cps, sets, ords, cepRules, batches] = await Promise.all([
        catalogService.getProducts(),
        catalogService.getCategories(),
        dataStore.getDeliveryZones(),
        dataStore.getCoupons(),
        dataStore.getStoreSettings(),
        dataStore.getOrders(),
        dataStore.getDeliveryCeps(),
        dataStore.getProductionBatches(),
      ]);

      setProducts(prods);
      setCategories(cats);
      setDeliveryZones(zones);
      if (zones.length > 0) setSelectedZoneId(zones[0].id);
      setCoupons(cps);
      setStoreSettings(sets);
      setAllOrders(ords);
      setDeliveryCepRules(cepRules);
      setProductionBatches(batches);

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
    } catch (err: any) {
      console.error('[Affeto Initial Load Error]:', err);
      setLoadError(err?.message || 'Erro ao carregar dados do Affeto Pães.');
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
    if (!storeSettings) {
      return {
        subtotal: 0,
        discount: 0,
        delivery_fee: 0,
        total: 0,
        items_count: 0,
        qualifies_for_free_shipping: false,
        amount_needed_for_free_shipping: 0,
        applied_coupon: undefined,
        minimum_order_met: true,
        minimum_order_value: 0,
        error: undefined,
      };
    }
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
    notes: string,
    scheduledBatchDate?: string,
    scheduledBatchLabel?: string,
    deliveryWindow?: string
  ) => {
    let targetBatchDate = scheduledBatchDate;
    let targetBatchLabel = scheduledBatchLabel;
    let targetDeliveryWindow = deliveryWindow;

    // Se o produto for de fornada programada e nenhuma data foi enviada explicitamente, calcula a próxima fornada disponível
    if (product.schedule_config?.is_scheduled_only && !targetBatchDate) {
      const autoBatch = getNextAvailableBatch(product, allOrders, new Date(), quantity, productionBatches);
      if (autoBatch) {
        targetBatchDate = autoBatch.dateString;
        targetBatchLabel = autoBatch.formattedDate;
        targetDeliveryWindow = autoBatch.deliveryWindow;
      }
    }

    const newItem = pricingEngine.createCartItem(
      product,
      quantity,
      selectedOptions,
      notes,
      targetBatchDate,
      targetBatchLabel,
      targetDeliveryWindow
    );

    setCartItems((prev) => {
      // Regra da Padaria Affeto: Uma mesma linha de produto deve ficar integralmente em uma única fornada
      const existingIdx = prev.findIndex(
        (it) =>
          it.product.id === product.id &&
          JSON.stringify(it.selected_options) === JSON.stringify(selectedOptions) &&
          it.notes === notes &&
          it.scheduled_batch_date === targetBatchDate
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        const updatedQty = updated[existingIdx].quantity + quantity;
        updated[existingIdx] = pricingEngine.createCartItem(
          product,
          updatedQty,
          selectedOptions,
          notes,
          targetBatchDate,
          targetBatchLabel,
          targetDeliveryWindow
        );
        return updated;
      }

      return [...prev, newItem];
    });

    showToast(`"${product.name}" adicionado à sua cesta!`);
    // Não abre a cesta automaticamente, permitindo que o cliente continue escolhendo mais produtos livremente.
  };

  const handleQuickAdd = (product: Product) => {
    if (product.options && product.options.length > 0) {
      setSelectedProduct(product);
    } else {
      let batchDate: string | undefined;
      let batchLabel: string | undefined;
      let deliveryWin: string | undefined;

      if (product.schedule_config?.is_scheduled_only) {
        const auto = getNextAvailableBatch(product, allOrders, new Date(), 1, productionBatches);
        if (auto) {
          batchDate = auto.dateString;
          batchLabel = auto.formattedDate;
          deliveryWin = auto.deliveryWindow;
        }
      }

      handleAddToCart(product, 1, [], '', batchDate, batchLabel, deliveryWin);
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
            it.notes,
            it.scheduled_batch_date,
            it.scheduled_batch_label,
            it.delivery_window
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

    // Refresh orders and production batches
    dataStore.getOrders().then((ords) => setAllOrders(ords));
    dataStore.getProductionBatches().then((batches) => setProductionBatches(batches));

    // Show Payment Screen
    setActivePaymentOrder({ order, method: paymentMethod });
  };

  const handlePaymentApproved = (updatedOrder: Order) => {
    dataStore.getOrders().then((ords) => setAllOrders(ords));
    dataStore.getProductionBatches().then((batches) => setProductionBatches(batches));
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
        onLogout={() => {
          setIsAdminOpen(false);
          window.history.pushState(null, '', '/');
          showToast('Sessão administrativa finalizada com sucesso.');
        }}
        orders={allOrders}
        onOrderUpdated={() => {
          dataStore.getOrders().then(setAllOrders);
          dataStore.getDeliveryCeps().then(setDeliveryCepRules);
          catalogService.getProducts().then(setProducts);
          catalogService.getCategories().then(setCategories);
          dataStore.getStoreSettings().then(setStoreSettings);
          dataStore.getProductionBatches().then(setProductionBatches);
        }}
      />
    );
  }

  // 1. Error state: clear feedback with retry button
  if (loadError) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex flex-col items-center justify-center p-6 text-[#3A2E1F]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#3A2E1F]/10 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#B8623F]/10 flex items-center justify-center text-[#B8623F]">
            <Flame className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif font-bold text-2xl text-[#3A2E1F]">Não foi possível carregar os dados</h2>
            <p className="text-sm text-[#7E6C58]">
              {loadError}
            </p>
          </div>
          <button
            onClick={() => loadInitialData()}
            className="w-full py-3.5 bg-[#B8623F] hover:bg-[#9E5132] text-white font-medium rounded-xl transition-all shadow-md active:scale-98 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // 2. Loading state: single, neutral, smooth skeleton loader before rendering live store
  if (loadingCatalog || !storeSettings) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex flex-col">
        {/* Neutral header skeleton */}
        <header className="w-full bg-[#FAF7F0]/80 border-b border-[#3A2E1F]/10 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#3A2E1F]/5 animate-pulse" />
              <div className="space-y-2">
                <div className="w-32 h-5 bg-[#3A2E1F]/10 rounded-md animate-pulse" />
                <div className="w-24 h-3 bg-[#3A2E1F]/5 rounded-md animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3A2E1F]/5 animate-pulse" />
              <div className="w-10 h-10 rounded-xl bg-[#3A2E1F]/5 animate-pulse" />
            </div>
          </div>
        </header>

        {/* Central warm loading indicator */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-[#B8623F]/20 border-t-[#B8623F] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Wheat className="w-6 h-6 text-[#B8623F]/80 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2 max-w-sm">
            <h2 className="font-serif font-bold text-xl text-[#3A2E1F] tracking-tight">Affeto Pães</h2>
            <p className="text-xs text-[#7E6C58] leading-relaxed">
              Aquecendo o forno e carregando os pães frescos...
            </p>
          </div>
        </main>
      </div>
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
                  productionBatches={productionBatches}
                  onSelectProduct={setSelectedProduct}
                  onQuickAdd={handleQuickAdd}
                  isInCart={cartItems.some((it) => it.product.id === featured.id)}
                />
              );
            })()}

            {/* 3. Demais Itens em Sequência por Categoria */}
            <div id="cardapio-itens-sequencia" className="space-y-12 pt-2">
              {searchQuery.trim() ? (
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
                          productionBatches={productionBatches}
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
                              productionBatches={productionBatches}
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
              <div className="flex items-center gap-3">
                {storeSettings.logo_url ? (
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#B8623F]/40 p-0.5 bg-white shrink-0 shadow-xs">
                    <img
                      src={storeSettings.logo_url}
                      alt={storeSettings.name}
                      className="w-full h-full rounded-lg object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-[#B8623F] text-white flex items-center justify-center font-serif font-bold text-lg shrink-0">
                    {storeSettings.name ? storeSettings.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                )}
                <div>
                  <span className="block font-serif font-bold text-xl tracking-tight text-[#FAF7F0]">
                    {storeSettings.name}
                  </span>
                  <span className="block text-[10px] text-[#A99885] tracking-wider uppercase font-medium">
                    {storeSettings.city ? `${storeSettings.city} - ${storeSettings.state || 'MG'}` : 'Padaria Artesanal'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#A99885] leading-relaxed">
                {storeSettings.description ||
                  'Pães e folhados de fermentação lenta com levain de 36 horas, farinhas francesas selecionadas e respeito ao tempo do trigo.'}
              </p>
            </div>

            {/* Column 2: Delivery Schedule */}
            <div className="space-y-2 text-xs">
              <h4 className="font-serif font-bold text-sm text-[#EADBBA]">
                Programação de Entregas
              </h4>
              <div className="flex items-center gap-2 text-sm font-medium text-[#FAF7F0] bg-white/5 py-2.5 px-3 rounded-xl border border-white/10">
                <Truck className="w-4 h-4 text-[#B8623F] shrink-0" />
                <span>{storeSettings.delivery_schedule_text || 'Entregas nas terças e sextas'}</span>
              </div>
            </div>

            {/* Column 3: Location & Contact */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-serif font-bold text-sm text-[#EADBBA]">
                Endereço & Atendimento
              </h4>
              <div className="flex items-start gap-2 text-[#A99885]">
                <MapPin className="w-4 h-4 text-[#B8623F] shrink-0 mt-0.5" />
                <span className="leading-snug">{storeSettings.pickup_address || storeSettings.address}</span>
              </div>
              {storeSettings.phone && (
                <div className="flex items-center gap-2 text-[#A99885]">
                  <Phone className="w-4 h-4 text-[#B8623F] shrink-0" />
                  <a
                    href={`tel:${storeSettings.phone.replace(/\D/g, '')}`}
                    className="hover:text-white transition-colors"
                  >
                    {storeSettings.phone}
                  </a>
                </div>
              )}
              {storeSettings.whatsapp && (
                <div className="flex items-center gap-2 text-[#A99885]">
                  <span className="w-4 h-4 text-emerald-400 font-bold text-xs flex items-center justify-center">💬</span>
                  <a
                    href={`https://wa.me/${storeSettings.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white underline underline-offset-2 transition-colors"
                  >
                    WhatsApp: {storeSettings.whatsapp}
                  </a>
                </div>
              )}
              {storeSettings.instagram && (
                <div className="flex items-center gap-2 text-[#A99885]">
                  <Instagram className="w-4 h-4 text-[#B8623F] shrink-0" />
                  <a
                    href={`https://instagram.com/${storeSettings.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    {storeSettings.instagram}
                  </a>
                </div>
              )}
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

          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7E6C58]">
            {/* Botão no rodapé para o Painel do Gestor posicionado à esquerda */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <button
                id="btn-footer-painel-gestor"
                onClick={handleOpenAdminPanel}
                className="text-[#A99885] hover:text-[#EADBBA] transition-colors flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-lg hover:bg-white/5 border border-white/10 hover:border-white/20"
                title="Acesso Restrito da Gerência"
              >
                <Lock className="w-3.5 h-3.5 text-[#B8623F]" />
                <span className="font-medium text-[#C4B7A6] hover:text-white">Painel do Gestor</span>
              </button>
              <span className="text-[11px] text-[#554432] hidden sm:inline">Affeto Delivery & Balcão</span>
            </div>

            <p className="w-full sm:w-auto text-center sm:text-right">
              © {new Date().getFullYear()} {storeSettings.name}. Feito com afeto e farinha pura.
            </p>
          </div>
        </div>
      </footer>

      {/* MODALS & OVERLAYS */}

      {/* 1. Product Customization & Details Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          orders={allOrders}
          productionBatches={productionBatches}
          onClose={() => setSelectedProduct(null)}
          isFavorite={selectedProduct ? favoriteIds.includes(selectedProduct.id) : false}
          onToggleFavorite={handleToggleFavorite}
          onAddToCart={handleAddToCart}
        />
      )}

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
        productionBatches={productionBatches}
        storeSettings={storeSettings}
        onOrderCreated={handleOrderCreated}
      />

      {/* 4. Live Order Tracking Modal */}
      {trackingOrder && (
        <OrderTrackingModal
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
          storePhone={storeSettings.whatsapp}
        />
      )}

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

      {/* 10. Admin Login Modal com Senha para o Painel do Gestor */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => {
          setIsAdminLoginOpen(false);
          if (
            window.location.pathname.toLowerCase() === '/admin' ||
            window.location.pathname.toLowerCase().startsWith('/admin/') ||
            window.location.hash.toLowerCase() === '#admin'
          ) {
            window.history.pushState(null, '', '/');
          }
        }}
        onSuccess={() => {
          setIsAdminLoginOpen(false);
          setIsAdminOpen(true);
        }}
      />
    </div>
  );
}
