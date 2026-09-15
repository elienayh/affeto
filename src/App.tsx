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
  DeliveryType,
  DeliveryZone,
  Order,
  PaymentMethod,
  PricingBreakdown,
  Product,
  StoreSettings,
} from './types';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategoryFilter } from './components/CategoryFilter';
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
      const [prods, cats, zones, cps, sets, ords] = await Promise.all([
        catalogService.getProducts(),
        catalogService.getCategories(),
        dataStore.getDeliveryZones(),
        dataStore.getCoupons(),
        dataStore.getStoreSettings(),
        dataStore.getOrders(),
      ]);

      setProducts(prods);
      setCategories(cats);
      setDeliveryZones(zones);
      if (zones.length > 0) setSelectedZoneId(zones[0].id);
      setCoupons(cps);
      setStoreSettings(sets);
      setAllOrders(ords);

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
    });
  }, [cartItems, deliveryType, selectedZoneId, deliveryZones, appliedCoupon, storeSettings]);

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
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* If Active Payment Screen is open, display it prominently */}
        {activePaymentOrder ? (
          <PaymentScreen
            order={activePaymentOrder.order}
            paymentMethod={activePaymentOrder.method}
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
            {/* Hero Banner with Fornada status & Scheduling CTA */}
            <HeroBanner
              onOpenScheduleInfo={() => setIsScheduleInfoOpen(true)}
              onExploreMenu={() => {
                const el = document.getElementById('cardapio-secao');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* Catalog Section */}
            <section id="cardapio-secao" className="space-y-6 pt-2">
              {/* Category Filter Carousel */}
              <CategoryFilter
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
              />

              {/* Secondary Tag Pills & Search Bar (mobile / auxiliary) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[#3A2E1F]/10">
                {/* Tag Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setSelectedTag('all')}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                      selectedTag === 'all'
                        ? 'bg-[#3A2E1F] text-white font-semibold'
                        : 'bg-white border border-[#3A2E1F]/15 text-[#7E6C58] hover:text-[#3A2E1F]'
                    }`}
                  >
                    Todos os Pães
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                        selectedTag === tag
                          ? 'bg-[#B8623F] text-white font-semibold'
                          : 'bg-white border border-[#3A2E1F]/15 text-[#7E6C58] hover:text-[#3A2E1F]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-[#7E6C58] font-medium shrink-0">
                  Exibindo {filteredProducts.length}{' '}
                  {filteredProducts.length === 1 ? 'produto artesanal' : 'produtos artesanais'}
                </div>
              </div>

              {/* Product Grid */}
              {loadingCatalog ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-10 h-10 border-3 border-[#B8623F] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-serif text-[#7E6C58]">
                    Aquecendo o forno e carregando os pães...
                  </p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-3xl border border-[#3A2E1F]/10 p-8 space-y-3">
                  <Wheat className="w-12 h-12 mx-auto text-[#B7A05E] opacity-60" />
                  <h3 className="font-serif font-bold text-lg text-[#3A2E1F]">
                    Nenhum pão encontrado
                  </h3>
                  <p className="text-xs text-[#7E6C58] max-w-sm mx-auto">
                    Não encontramos nenhum item com o filtro selecionado. Experimente buscar por outro nome ou limpar os filtros.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategoryId('all');
                      setSelectedTag('all');
                    }}
                    className="px-4 py-2 bg-[#B8623F] text-white rounded-xl text-xs font-semibold"
                  >
                    Limpar Filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                  {filteredProducts.map((product) => {
                    const isFav = favoriteIds.includes(product.id);
                    const inCart = cartItems.some((it) => it.product.id === product.id);

                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isFavorite={isFav}
                        onToggleFavorite={handleToggleFavorite}
                        onSelectProduct={setSelectedProduct}
                        onQuickAdd={handleQuickAdd}
                        isInCart={inCart}
                      />
                    );
                  })}
                </div>
              )}
            </section>
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
                Gestão & Integrações
              </h4>
              <div className="space-y-2">
                <button
                  id="btn-footer-consultar-pedido"
                  onClick={() => setIsOrderLookupOpen(true)}
                  className="block text-[#A99885] hover:text-[#EADBBA] transition-colors cursor-pointer"
                >
                  Rastrear Meu Pedido por Código
                </button>
                <button
                  id="btn-footer-admin-panel"
                  onClick={() => setIsAdminOpen(true)}
                  className="block text-[#B7A05E] hover:text-white font-semibold transition-colors cursor-pointer"
                >
                  Painel Administrativo & Kanban
                </button>
                <div className="pt-1 text-[11px] text-[#7E6C58]">
                  <span>Supabase: </span>
                  <span className="font-mono text-emerald-400">Conectado (ropgdbgkjghwdxdglchz)</span>
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

      {/* MODALS */}

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
        couponCodeInput={couponCode}
        onChangeCouponCode={setCouponCode}
        onApplyCoupon={handleApplyCoupon}
        couponMessage={couponMessage}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* 3. Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        pricing={pricing}
        deliveryType={deliveryType}
        selectedZoneId={selectedZoneId}
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

      {/* 6. Admin Panel Modal */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        orders={allOrders}
        onOrderUpdated={() => {
          dataStore.getOrders().then(setAllOrders);
        }}
      />

      {/* 7. Favorites Modal */}
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
    </div>
  );
}
