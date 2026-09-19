import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  LayoutDashboard,
  Kanban,
  Package,
  Ticket,
  Settings,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Truck,
  Store,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Calendar,
  Upload,
  Image as ImageIcon,
  Layers,
  LogOut,
  Phone,
  CreditCard,
} from 'lucide-react';
import { adminAuth } from '../lib/adminAuth';
import { dataStore } from '../lib/supabase';
import { orderService } from '../services/orderService';
import {
  Category,
  Coupon,
  DeliveryCepRule,
  DeliveryZone,
  Order,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  Product,
  StoreSettings,
} from '../types';
import { OrderCard } from './admin/OrderCard';
import { OrderFilters } from './admin/OrderFilters';
import { OrderDetailsModal } from './admin/OrderDetailsModal';
import { OrderEditModal } from './admin/OrderEditModal';
import { OrderCancelModal } from './admin/OrderCancelModal';
import { OrderListView } from './admin/OrderListView';
import {
  OrderFilterState,
  OrderSortOption,
  OperationalStage,
  filterOrders,
  sortOrders,
  getOperationalStage,
  getOperationalStageLabel,
} from '../utils/orderManagementUtils';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
  orders: Order[];
  onOrderUpdated: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  onLogout,
  orders,
  onOrderUpdated,
}) => {
  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'orders' | 'products' | 'categories' | 'coupons' | 'ceps' | 'settings'
  >('orders');

  // Products and categories state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [ceps, setCeps] = useState<DeliveryCepRule[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  // New CEP form state
  const [newCep, setNewCep] = useState({
    cep: '',
    label: '',
    fee: 10,
    estimated_minutes: 35,
  });

  // Selected order for detailed modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Order filters, sorting & view mode state
  const [orderFilters, setOrderFilters] = useState<OrderFilterState>({
    search: '',
    operationalStage: 'TODOS',
    paymentStatus: 'TODOS',
    dateFilter: 'TODOS',
    deliveryType: 'TODOS',
    location: 'TODOS',
    customerName: 'TODOS',
    productId: 'TODOS',
  });
  const [orderSortOption, setOrderSortOption] = useState<OrderSortOption>('DELIVERY_DATE_ASC');
  const [orderViewMode, setOrderViewMode] = useState<'kanban' | 'list'>('kanban');

  // Modals for editing and cancelling orders
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  // Product Create/Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const productImageInputRef = useRef<HTMLInputElement>(null);

  // Category Create/Edit Modal State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isNewCategory, setIsNewCategory] = useState(false);

  // Logo file upload ref
  const logoImageInputRef = useRef<HTMLInputElement>(null);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState<string | null>(null);

  // Load Data
  const reloadData = async () => {
    const [p, c, cp, z, cepRules, s] = await Promise.all([
      dataStore.getProducts(),
      dataStore.getCategories(),
      dataStore.getCoupons(),
      dataStore.getDeliveryZones(),
      dataStore.getDeliveryCeps(),
      dataStore.getStoreSettings(),
    ]);
    setProducts(p);
    setCategories(c);
    setCoupons(cp);
    setZones(z);
    setCeps(cepRules);
    setStoreSettings(s);
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
    }
  }, [isOpen, onOrderUpdated]);

  if (!isOpen) return null;

  // Handle Delivery Location / Frete management
  const handleAddCep = async () => {
    if (!newCep.label.trim()) return;
    const rule: DeliveryCepRule = {
      id: `loc-${Date.now()}`,
      label: newCep.label.trim(),
      fee: Number(newCep.fee) || 0,
      cep: newCep.cep?.trim() || '36830-000',
      estimated_minutes: Number(newCep.estimated_minutes) || 30,
      active: true,
    };
    const updated = [...ceps, rule];
    setCeps(updated);
    await dataStore.saveDeliveryCeps(updated);
    setNewCep({ cep: '', label: '', fee: 5, estimated_minutes: 35 });
    await reloadData();
    onOrderUpdated();
  };

  const handleToggleCep = async (id: string) => {
    const updated = ceps.map((c) => (c.id === id ? { ...c, active: !c.active } : c));
    setCeps(updated);
    await dataStore.saveDeliveryCeps(updated);
    await reloadData();
    onOrderUpdated();
  };

  const handleDeleteCep = async (id: string) => {
    const updated = ceps.filter((c) => c.id !== id);
    setCeps(updated);
    await dataStore.deleteDeliveryCep(id);
    await reloadData();
    onOrderUpdated();
  };

  // Handle Product Photo Upload
  const handleProductImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingProduct) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setEditingProduct({
          ...editingProduct,
          image_url: base64,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Logo Photo Upload
  const handleLogoImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && storeSettings) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const newSettings = {
          ...storeSettings,
          logo_url: base64,
        };
        setStoreSettings(newSettings);
        setSettingsSavedMessage('Salvando logotipo no banco de dados e servidor...');
        try {
          const saved = await dataStore.saveStoreSettings(newSettings);
          if (saved) {
            setStoreSettings(saved);
          }
          await reloadData();
          onOrderUpdated();
          setSettingsSavedMessage('Logotipo atualizado e sincronizado com sucesso em todas as instâncias!');
          setTimeout(() => setSettingsSavedMessage(null), 5000);
        } catch (err) {
          console.error('Erro ao salvar logo:', err);
          setSettingsSavedMessage('Erro ao salvar logotipo. Tente novamente.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Category Save
  const handleSaveCategory = async (cat: Category) => {
    await dataStore.saveCategory(cat);
    await reloadData();
    setEditingCategory(null);
    setIsNewCategory(false);
    onOrderUpdated();
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const hasProducts = products.some((p) => p.category_id === categoryId);
    if (hasProducts) {
      alert('Não é possível excluir esta categoria pois existem produtos associados a ela. Mova os produtos antes.');
      return;
    }
    if (confirm('Tem certeza de que deseja excluir esta categoria?')) {
      await dataStore.deleteCategory(categoryId);
      await reloadData();
      onOrderUpdated();
    }
  };

  // Handle Product Save
  const handleSaveProduct = async (prod: Product) => {
    await dataStore.saveProduct(prod);
    await reloadData();
    setEditingProduct(null);
    setIsNewProduct(false);
    onOrderUpdated();
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Tem certeza de que deseja excluir este produto do cardápio?')) {
      await dataStore.deleteProduct(productId);
      await reloadData();
      onOrderUpdated();
    }
  };

  // Status advancement helper
  const handleAdvanceStatus = async (order: Order, nextStatus: OrderStatus, actionNote: string) => {
    await orderService.updateStatus(order.id, nextStatus, 'ADMIN_PANEL', actionNote);
    onOrderUpdated();
    if (selectedOrder?.id === order.id) {
      const refreshed = await orderService.getOrderById(order.id);
      setSelectedOrder(refreshed);
    }
  };

  // Payment status updater
  const handleUpdatePayment = async (
    order: Order,
    status: PaymentStatus,
    method?: PaymentMethod,
    note?: string
  ) => {
    await orderService.updatePayment(order.id, status, undefined, method, note);
    onOrderUpdated();
    if (selectedOrder?.id === order.id) {
      const refreshed = await orderService.getOrderById(order.id);
      setSelectedOrder(refreshed);
    }
  };

  // Order full update (save edited order)
  const handleSaveEditedOrder = async (updatedOrder: Order, auditNote: string) => {
    await orderService.updateOrder(updatedOrder, auditNote);
    onOrderUpdated();
    if (selectedOrder?.id === updatedOrder.id) {
      const refreshed = await orderService.getOrderById(updatedOrder.id);
      setSelectedOrder(refreshed);
    }
  };

  // Order cancellation
  const handleCancelOrder = async (order: Order, reason: string) => {
    await orderService.updateStatus(
      order.id,
      'CANCELLED',
      'ADMIN_PANEL',
      `Cancelamento operacional: ${reason}`
    );
    onOrderUpdated();
    if (selectedOrder?.id === order.id) {
      const refreshed = await orderService.getOrderById(order.id);
      setSelectedOrder(refreshed);
    }
  };

  // Available filters data derived from current orders & rules
  const availableLocations = React.useMemo(() => {
    const locs = new Set<string>();
    orders.forEach((o) => {
      if (o.address?.neighborhood) locs.add(o.address.neighborhood);
      if (o.address?.city) locs.add(o.address.city);
    });
    ceps.forEach((c) => {
      if (c.label) locs.add(c.label);
    });
    return Array.from(locs).sort();
  }, [orders, ceps]);

  const availableCustomers = React.useMemo(() => {
    const custs = new Set<string>();
    orders.forEach((o) => {
      if (o.customer_name) custs.add(o.customer_name);
    });
    return Array.from(custs).sort();
  }, [orders]);

  // Filtered & Sorted orders
  const filteredOrders = React.useMemo(() => {
    return filterOrders(orders, orderFilters);
  }, [orders, orderFilters]);

  const sortedOrders = React.useMemo(() => {
    return sortOrders(filteredOrders, orderSortOption);
  }, [filteredOrders, orderSortOption]);

  // Stats calculation
  const totalRevenue = orders
    .filter((o) => o.payment_status === 'APPROVED')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingPaymentCount = orders.filter(
    (o) => o.payment_status === 'PENDING' && o.status !== 'CANCELLED'
  ).length;

  const stageAguardandoCount = orders.filter(
    (o) => getOperationalStage(o) === 'AGUARDANDO_PREPARO'
  ).length;

  const stageEmPreparoCount = orders.filter(
    (o) => getOperationalStage(o) === 'EM_PREPARO'
  ).length;

  const stageProntoRotaCount = orders.filter(
    (o) => ['PRONTO', 'EM_ROTA'].includes(getOperationalStage(o))
  ).length;

  // -------------------------------------------------------------
  // FULL SCREEN COMPLETE ADMIN DASHBOARD (Acesso Direto)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#3A2E1F] flex flex-col selection:bg-[#B8623F] selection:text-white">
      {/* Admin Top Navigation Header */}
      <header className="bg-white border-b border-[#3A2E1F]/10 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#B8623F]/60 p-0.5 shadow-xs bg-[#FAF7F0] flex items-center justify-center shrink-0">
                {storeSettings?.logo_url ? (
                  <img
                    src={storeSettings.logo_url}
                    alt="Affeto Logo"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#F3ECDD] rounded-full flex items-center justify-center font-serif font-bold text-lg text-[#3A2E1F]">
                    A
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif font-bold text-lg tracking-tight text-[#3A2E1F]">
                    Affeto Pães • Painel Administrativo
                  </h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-[#7E6C58]">
                  Cidade Base: <strong className="text-[#3A2E1F]">{storeSettings?.city || 'Espera Feliz'}-{storeSettings?.state || 'MG'}</strong>
                </p>
              </div>
            </div>

            {/* Admin Profile & Actions */}
            <div className="flex items-center gap-3 text-xs">
              <div className="hidden sm:flex flex-col text-right">
                <span className="font-bold text-[#3A2E1F]">Painel do Gestor</span>
                <span className="text-[10px] text-[#7E6C58] font-mono">
                  {adminAuth.getCurrentUser() || 'toledodias87@gmail.com'}
                </span>
              </div>

              {/* View Store Button */}
              <button
                id="btn-admin-ver-loja"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-[#FAF7F0] hover:bg-[#F3ECDD] text-[#3A2E1F] border border-[#3A2E1F]/20 transition-colors flex items-center gap-1.5 font-semibold cursor-pointer shadow-2xs"
                title="Voltar para o cardápio da loja"
              >
                <Store className="w-4 h-4 text-[#B8623F]" />
                <span>Voltar à Loja</span>
              </button>

              {/* Logout Button */}
              <button
                id="btn-admin-logout"
                onClick={() => {
                  adminAuth.logout();
                  if (onLogout) {
                    onLogout();
                  } else {
                    onClose();
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors flex items-center gap-1.5 font-semibold cursor-pointer shadow-2xs"
                title="Sair do painel administrativo"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-3 border-t border-[#3A2E1F]/10 mt-3 text-xs">
            <button
              id="tab-admin-pedidos"
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-2 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#3A2E1F] text-white shadow-xs font-semibold'
                  : 'text-[#7E6C58] hover:bg-black/5 hover:text-[#3A2E1F]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Pedidos & Fornadas ({orders.length})</span>
            </button>

            <button
              id="tab-admin-produtos"
              onClick={() => setActiveTab('products')}
              className={`px-3 py-2 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-[#3A2E1F] text-white shadow-xs font-semibold'
                  : 'text-[#7E6C58] hover:bg-black/5 hover:text-[#3A2E1F]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Produtos & Fotos ({products.length})</span>
            </button>

            <button
              id="tab-admin-categorias"
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-2 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-[#3A2E1F] text-white shadow-xs font-semibold'
                  : 'text-[#7E6C58] hover:bg-black/5 hover:text-[#3A2E1F]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Categorias do Cardápio ({categories.length})</span>
            </button>

            <button
              id="tab-admin-ceps"
              onClick={() => setActiveTab('ceps')}
              className={`px-3 py-2 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'ceps'
                  ? 'bg-[#3A2E1F] text-white shadow-xs font-semibold'
                  : 'text-[#7E6C58] hover:bg-black/5 hover:text-[#3A2E1F]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Locais & Frete ({ceps.length})</span>
            </button>

            <button
              id="tab-admin-cupons"
              onClick={() => setActiveTab('coupons')}
              className={`px-3 py-2 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'coupons'
                  ? 'bg-[#3A2E1F] text-white shadow-xs font-semibold'
                  : 'text-[#7E6C58] hover:bg-black/5 hover:text-[#3A2E1F]'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Cupons de Desconto</span>
            </button>

            <button
              id="tab-admin-config"
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-2 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#3A2E1F] text-white shadow-xs font-semibold'
                  : 'text-[#7E6C58] hover:bg-black/5 hover:text-[#3A2E1F]'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Logotipo & Configurações da Loja</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Page Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Header Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] text-[#7E6C58] uppercase font-bold block">Faturamento Aprovado</span>
            <span className="font-serif font-bold text-xl text-emerald-700">
              R$ {totalRevenue.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[10px] text-[#7E6C58] block mt-0.5">
              {pendingPaymentCount > 0 ? `${pendingPaymentCount} pagamentos pendentes` : 'Sem pendências financeiras'}
            </span>
          </div>
          <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] text-[#7E6C58] uppercase font-bold block">Aguardando Preparo</span>
            <span className="font-serif font-bold text-xl text-amber-600">{stageAguardandoCount}</span>
            <span className="text-[10px] text-[#7E6C58] block mt-0.5">Prontos para entrar em produção</span>
          </div>
          <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] text-[#7E6C58] uppercase font-bold block">Em Preparo / Forno</span>
            <span className="font-serif font-bold text-xl text-[#B8623F]">{stageEmPreparoCount}</span>
            <span className="text-[10px] text-[#7E6C58] block mt-0.5">Fornadas em andamento</span>
          </div>
          <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] text-[#7E6C58] uppercase font-bold block">Pronto & Em Rota</span>
            <span className="font-serif font-bold text-xl text-purple-700">{stageProntoRotaCount}</span>
            <span className="text-[10px] text-[#7E6C58] block mt-0.5">Para despacho ou retirada</span>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: GESTÃO COMPLETA DE PEDIDOS (OPERACIONAL & DESVINCULADA) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Barra de Título */}
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="font-serif font-bold text-xl text-[#3A2E1F]">
                  Gestão Operacional de Pedidos & Fornadas
                </h2>
                <p className="text-xs text-[#7E6C58]">
                  Fluxo operacional contínuo independente da confirmação financeira.
                </p>
              </div>
              <button
                onClick={onOrderUpdated}
                className="px-3 py-1.5 rounded-xl border border-[#3A2E1F]/20 bg-white hover:bg-[#FAF7F0] text-xs font-semibold text-[#3A2E1F] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Atualizar Pedidos</span>
              </button>
            </div>

            {/* Barra de Busca Universal e Filtros Combináveis */}
            <OrderFilters
              filters={orderFilters}
              onFilterChange={setOrderFilters}
              onResetFilters={() =>
                setOrderFilters({
                  search: '',
                  operationalStage: 'TODOS',
                  paymentStatus: 'TODOS',
                  dateFilter: 'TODOS',
                  deliveryType: 'TODOS',
                  location: 'TODOS',
                  customerName: 'TODOS',
                  productId: 'TODOS',
                })
              }
              sortOption={orderSortOption}
              onSortChange={setOrderSortOption}
              viewMode={orderViewMode}
              onViewModeChange={setOrderViewMode}
              availableProducts={products}
              availableLocations={availableLocations}
              availableCustomers={availableCustomers}
              totalOrdersCount={orders.length}
              filteredOrdersCount={sortedOrders.length}
            />

            {/* MODO LISTA / TABELA */}
            {orderViewMode === 'list' ? (
              <OrderListView
                orders={sortedOrders}
                onViewDetails={(ord) => setSelectedOrder(ord)}
                onEditOrder={(ord) => setOrderToEdit(ord)}
                onCancelOrder={(ord) => setOrderToCancel(ord)}
                onAdvanceStatus={handleAdvanceStatus}
                onUpdatePayment={handleUpdatePayment}
              />
            ) : (
              /* MODO KANBAN: 5 COLUNAS OPERACIONAIS */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 items-start">
                {/* 1. AGUARDANDO PREPARO */}
                {(() => {
                  const columnOrders = sortedOrders.filter(
                    (o) => getOperationalStage(o) === 'AGUARDANDO_PREPARO'
                  );
                  return (
                    <div className="bg-white/70 border border-[#3A2E1F]/15 rounded-2xl p-3 space-y-3 shadow-2xs">
                      <div className="flex justify-between items-center pb-2 border-b border-[#3A2E1F]/10">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <h3 className="font-bold text-xs text-[#3A2E1F]">Aguardando Preparo</h3>
                        </div>
                        <span className="text-[11px] font-bold bg-amber-100/70 text-amber-800 px-2 py-0.5 rounded-full">
                          {columnOrders.length}
                        </span>
                      </div>
                      <div className="space-y-2.5 min-h-[140px]">
                        {columnOrders.length === 0 ? (
                          <div className="py-8 text-center text-[11px] text-[#7E6C58]/70 italic">
                            Nenhum pedido aguardando
                          </div>
                        ) : (
                          columnOrders.map((ord) => (
                            <OrderCard
                              key={ord.id}
                              order={ord}
                              onViewDetails={(o) => setSelectedOrder(o)}
                              onEditOrder={(o) => setOrderToEdit(o)}
                              onCancelOrder={(o) => setOrderToCancel(o)}
                              onAdvanceStatus={handleAdvanceStatus}
                              onUpdatePayment={handleUpdatePayment}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. EM PREPARO */}
                {(() => {
                  const columnOrders = sortedOrders.filter(
                    (o) => getOperationalStage(o) === 'EM_PREPARO'
                  );
                  return (
                    <div className="bg-white/70 border border-[#3A2E1F]/15 rounded-2xl p-3 space-y-3 shadow-2xs">
                      <div className="flex justify-between items-center pb-2 border-b border-[#3A2E1F]/10">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-[#B8623F]" />
                          <h3 className="font-bold text-xs text-[#3A2E1F]">Em Preparo</h3>
                        </div>
                        <span className="text-[11px] font-bold bg-[#B8623F]/15 text-[#994E30] px-2 py-0.5 rounded-full">
                          {columnOrders.length}
                        </span>
                      </div>
                      <div className="space-y-2.5 min-h-[140px]">
                        {columnOrders.length === 0 ? (
                          <div className="py-8 text-center text-[11px] text-[#7E6C58]/70 italic">
                            Nenhum pedido em forno
                          </div>
                        ) : (
                          columnOrders.map((ord) => (
                            <OrderCard
                              key={ord.id}
                              order={ord}
                              onViewDetails={(o) => setSelectedOrder(o)}
                              onEditOrder={(o) => setOrderToEdit(o)}
                              onCancelOrder={(o) => setOrderToCancel(o)}
                              onAdvanceStatus={handleAdvanceStatus}
                              onUpdatePayment={handleUpdatePayment}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 3. PRONTO */}
                {(() => {
                  const columnOrders = sortedOrders.filter(
                    (o) => getOperationalStage(o) === 'PRONTO'
                  );
                  return (
                    <div className="bg-white/70 border border-[#3A2E1F]/15 rounded-2xl p-3 space-y-3 shadow-2xs">
                      <div className="flex justify-between items-center pb-2 border-b border-[#3A2E1F]/10">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <h3 className="font-bold text-xs text-[#3A2E1F]">Pronto</h3>
                        </div>
                        <span className="text-[11px] font-bold bg-blue-100/70 text-blue-800 px-2 py-0.5 rounded-full">
                          {columnOrders.length}
                        </span>
                      </div>
                      <div className="space-y-2.5 min-h-[140px]">
                        {columnOrders.length === 0 ? (
                          <div className="py-8 text-center text-[11px] text-[#7E6C58]/70 italic">
                            Nenhum pedido pronto
                          </div>
                        ) : (
                          columnOrders.map((ord) => (
                            <OrderCard
                              key={ord.id}
                              order={ord}
                              onViewDetails={(o) => setSelectedOrder(o)}
                              onEditOrder={(o) => setOrderToEdit(o)}
                              onCancelOrder={(o) => setOrderToCancel(o)}
                              onAdvanceStatus={handleAdvanceStatus}
                              onUpdatePayment={handleUpdatePayment}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 4. EM ROTA / BALCÃO */}
                {(() => {
                  const columnOrders = sortedOrders.filter(
                    (o) => getOperationalStage(o) === 'EM_ROTA'
                  );
                  return (
                    <div className="bg-white/70 border border-[#3A2E1F]/15 rounded-2xl p-3 space-y-3 shadow-2xs">
                      <div className="flex justify-between items-center pb-2 border-b border-[#3A2E1F]/10">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-purple-600" />
                          <h3 className="font-bold text-xs text-[#3A2E1F]">Em Rota</h3>
                        </div>
                        <span className="text-[11px] font-bold bg-purple-100/70 text-purple-800 px-2 py-0.5 rounded-full">
                          {columnOrders.length}
                        </span>
                      </div>
                      <div className="space-y-2.5 min-h-[140px]">
                        {columnOrders.length === 0 ? (
                          <div className="py-8 text-center text-[11px] text-[#7E6C58]/70 italic">
                            Nenhum pedido em trânsito
                          </div>
                        ) : (
                          columnOrders.map((ord) => (
                            <OrderCard
                              key={ord.id}
                              order={ord}
                              onViewDetails={(o) => setSelectedOrder(o)}
                              onEditOrder={(o) => setOrderToEdit(o)}
                              onCancelOrder={(o) => setOrderToCancel(o)}
                              onAdvanceStatus={handleAdvanceStatus}
                              onUpdatePayment={handleUpdatePayment}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 5. ENTREGUE */}
                {(() => {
                  const columnOrders = sortedOrders.filter(
                    (o) => getOperationalStage(o) === 'ENTREGUE'
                  );
                  return (
                    <div className="bg-white/70 border border-[#3A2E1F]/15 rounded-2xl p-3 space-y-3 shadow-2xs">
                      <div className="flex justify-between items-center pb-2 border-b border-[#3A2E1F]/10">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <h3 className="font-bold text-xs text-[#3A2E1F]">Entregue</h3>
                        </div>
                        <span className="text-[11px] font-bold bg-emerald-100/70 text-emerald-800 px-2 py-0.5 rounded-full">
                          {columnOrders.length}
                        </span>
                      </div>
                      <div className="space-y-2.5 min-h-[140px]">
                        {columnOrders.length === 0 ? (
                          <div className="py-8 text-center text-[11px] text-[#7E6C58]/70 italic">
                            Nenhum pedido finalizado
                          </div>
                        ) : (
                          columnOrders.map((ord) => (
                            <OrderCard
                              key={ord.id}
                              order={ord}
                              onViewDetails={(o) => setSelectedOrder(o)}
                              onEditOrder={(o) => setOrderToEdit(o)}
                              onCancelOrder={(o) => setOrderToCancel(o)}
                              onAdvanceStatus={handleAdvanceStatus}
                              onUpdatePayment={handleUpdatePayment}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 6. COLUNA EXTRA: CANCELADOS (se selecionado no filtro ou houver cancelados) */}
                {orderFilters.operationalStage === 'CANCELADO' && (
                  <div className="bg-rose-50/40 border border-rose-200 rounded-2xl p-3 space-y-3 shadow-2xs">
                    <div className="flex justify-between items-center pb-2 border-b border-rose-200">
                      <h3 className="font-bold text-xs text-rose-800">Cancelados</h3>
                      <span className="text-[11px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                        {sortedOrders.filter((o) => getOperationalStage(o) === 'CANCELADO').length}
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {sortedOrders
                        .filter((o) => getOperationalStage(o) === 'CANCELADO')
                        .map((ord) => (
                          <OrderCard
                            key={ord.id}
                            order={ord}
                            onViewDetails={(o) => setSelectedOrder(o)}
                            onEditOrder={(o) => setOrderToEdit(o)}
                            onCancelOrder={(o) => setOrderToCancel(o)}
                            onAdvanceStatus={handleAdvanceStatus}
                            onUpdatePayment={handleUpdatePayment}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: PRODUTOS & FOTOS (Upload e Gestão de Estoque) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="font-serif font-bold text-xl text-[#3A2E1F]">
                  Produtos do Cardápio & Fotos
                </h2>
                <p className="text-xs text-[#7E6C58]">
                  Adicione fotos dos produtos, ajuste preços, controle estoques e forneça detalhes das fornadas.
                </p>
              </div>
              <button
                id="btn-admin-novo-produto"
                onClick={() => {
                  const newProd: Product = {
                    id: `prod-${Date.now()}`,
                    category_id: categories[0]?.id || 'cat-paes',
                    name: '',
                    slug: '',
                    description: '',
                    base_price: 25.0,
                    promotional_price: null,
                    unit: 'unidade',
                    is_active: true,
                    is_featured: false,
                    stock_quantity: 10,
                    track_stock: true,
                    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };
                  setIsNewProduct(true);
                  setEditingProduct(newProd);
                }}
                className="px-4 py-2 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Novo Produto</span>
              </button>
            </div>

            <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F0] border-b border-[#3A2E1F]/10 text-[#7E6C58] uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3.5">Foto & Produto</th>
                      <th className="p-3.5">Categoria</th>
                      <th className="p-3.5">Preço Base</th>
                      <th className="p-3.5">Preço Promo</th>
                      <th className="p-3.5">Estoque</th>
                      <th className="p-3.5">Fornadas Agendadas</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3A2E1F]/10">
                    {products.map((p) => {
                      const cat = categories.find((c) => c.id === p.category_id);
                      return (
                        <tr key={p.id} className="hover:bg-[#FAF7F0]/60 transition-colors">
                          <td className="p-3.5 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-[#3A2E1F]/10">
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <span className="font-bold text-[#3A2E1F] block text-sm">{p.name}</span>
                              <span className="text-[11px] text-[#7E6C58]">{p.unit}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-[#554432] font-medium">{cat?.name || '-'}</td>
                          <td className="p-3.5 font-semibold text-[#3A2E1F]">
                            R$ {p.base_price.toFixed(2)}
                          </td>
                          <td className="p-3.5 text-[#B8623F] font-semibold">
                            {p.promotional_price ? `R$ ${p.promotional_price.toFixed(2)}` : '-'}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                p.stock_quantity <= 3
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-50 text-emerald-800'
                              }`}
                            >
                              {p.stock_quantity} un
                            </span>
                          </td>
                          <td className="p-3.5">
                            {p.schedule_config?.is_scheduled_only ? (
                              <span className="text-[10px] font-semibold text-[#B8623F] bg-[#B8623F]/10 px-2 py-0.5 rounded-full block max-w-fit">
                                {p.schedule_config.days_label || 'Fornada Programada'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#7E6C58]">Disponível Diário</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                p.is_active
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {p.is_active ? 'Ativo' : 'Pausado'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1">
                            <button
                              onClick={() => {
                                setIsNewProduct(false);
                                setEditingProduct({ ...p });
                              }}
                              className="p-1.5 rounded-lg text-[#3A2E1F] hover:bg-[#FAF7F0] cursor-pointer"
                              title="Editar Produto & Foto"
                            >
                              <Edit2 className="w-4 h-4 text-[#B8623F]" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 rounded-lg text-[#7E6C58] hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                              title="Excluir Produto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: CATEGORIAS DO CARDÁPIO (Edição Completa) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="font-serif font-bold text-xl text-[#3A2E1F]">
                  Categorias do Cardápio
                </h2>
                <p className="text-xs text-[#7E6C58]">
                  Organize o cardápio, adicione novas seções e altere os nomes exibidos aos clientes.
                </p>
              </div>
              <button
                id="btn-admin-nova-categoria"
                onClick={() => {
                  const newCat: Category = {
                    id: `cat-${Date.now()}`,
                    name: '',
                    slug: '',
                    description: '',
                    sort_order: categories.length + 1,
                    active: true,
                    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
                  };
                  setIsNewCategory(true);
                  setEditingCategory(newCat);
                }}
                className="px-4 py-2 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Nova Categoria</span>
              </button>
            </div>

            <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F0] border-b border-[#3A2E1F]/10 text-[#7E6C58] uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3.5">Ordem</th>
                      <th className="p-3.5">Nome da Categoria</th>
                      <th className="p-3.5">Descrição</th>
                      <th className="p-3.5">Produtos Vinculados</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3A2E1F]/10">
                    {categories
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((cat) => {
                        const count = products.filter((p) => p.category_id === cat.id).length;
                        return (
                          <tr key={cat.id} className="hover:bg-[#FAF7F0]/60 transition-colors">
                            <td className="p-3.5 font-bold text-[#7E6C58]">#{cat.sort_order}</td>
                            <td className="p-3.5 font-serif font-bold text-sm text-[#3A2E1F]">
                              {cat.name}
                            </td>
                            <td className="p-3.5 text-[#7E6C58] max-w-xs truncate">
                              {cat.description || '-'}
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-full bg-[#FAF7F0] text-[#3A2E1F] font-semibold text-[11px] border border-[#3A2E1F]/10">
                                {count} produtos
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                  cat.active
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {cat.active ? 'Ativa' : 'Inativa'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right space-x-1">
                              <button
                                onClick={() => {
                                  setIsNewCategory(false);
                                  setEditingCategory({ ...cat });
                                }}
                                className="p-1.5 rounded-lg text-[#3A2E1F] hover:bg-[#FAF7F0] cursor-pointer"
                                title="Editar Categoria"
                              >
                                <Edit2 className="w-4 h-4 text-[#B8623F]" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="p-1.5 rounded-lg text-[#7E6C58] hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                title="Excluir Categoria"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: LOCAIS & TAXAS DE FRETE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'ceps' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-serif font-bold text-xl text-[#3A2E1F]">
                  Locais Atendidos & Taxas de Entrega
                </h2>
                <p className="text-xs text-[#7E6C58]">
                  Cadastre cada local ou bairro específico e sua respectiva taxa de frete (ex: Espera Feliz (Centro) - R$ 3,00, Espera Feliz (Zona Rural) - R$ 5,00). O cliente escolhe diretamente pela lista.
                </p>
              </div>
            </div>

            {/* Form to add Delivery Location */}
            <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-5 shadow-2xs space-y-4">
              <h3 className="font-bold text-sm text-[#3A2E1F] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#B8623F]" />
                <span>Cadastrar Novo Local de Entrega</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#554432] mb-1">Nome do Local / Região / Bairro *</label>
                  <input
                    type="text"
                    placeholder="Ex: Espera Feliz (Centro) ou Espera Feliz (Zona Rural)"
                    value={newCep.label}
                    onChange={(e) => setNewCep({ ...newCep, label: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0] focus:bg-white text-[#3A2E1F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Taxa de Frete (R$) *</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ex: 3.00 ou 5.00"
                    value={newCep.fee}
                    onChange={(e) => setNewCep({ ...newCep, fee: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0] focus:bg-white text-[#3A2E1F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Tempo Estimado (min)</label>
                  <input
                    type="number"
                    value={newCep.estimated_minutes}
                    onChange={(e) =>
                      setNewCep({ ...newCep, estimated_minutes: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0] focus:bg-white text-[#3A2E1F]"
                  />
                </div>
              </div>
              <button
                onClick={handleAddCep}
                disabled={!newCep.label.trim()}
                className="px-4 py-2.5 bg-[#B8623F] hover:bg-[#994E30] disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-all"
              >
                Cadastrar Local de Entrega
              </button>
            </div>

            {/* List of Delivery Locations */}
            <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-[#3A2E1F]/10 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#3A2E1F]">Locais Cadastrados para Seleção ({ceps.length})</h3>
                  <p className="text-[11px] text-[#7E6C58]">Estes locais aparecem ordenados para o cliente escolher na cesta de compras.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F0] border-b border-[#3A2E1F]/10 text-[#7E6C58] uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Local / Região de Destino</th>
                      <th className="p-3">Taxa de Frete</th>
                      <th className="p-3">Tempo Estimado</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3A2E1F]/10">
                    {ceps.map((rule) => (
                      <tr key={rule.id} className="hover:bg-[#FAF7F0]/50">
                        <td className="p-3 font-semibold text-[#3A2E1F]">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#B8623F] shrink-0" />
                            {rule.label || rule.cep}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-[#B8623F]">
                          R$ {rule.fee.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-3 text-[#7E6C58]">{rule.estimated_minutes || 30} min</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleToggleCep(rule.id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                              rule.active
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {rule.active ? 'Ativo' : 'Pausado'}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteCep(rule.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                            title="Remover Local"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: CUPONS DE DESCONTO */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'coupons' && (
          <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-5 shadow-2xs space-y-4">
            <h2 className="font-serif font-bold text-xl text-[#3A2E1F] flex items-center gap-2">
              <Ticket className="w-5 h-5 text-[#B8623F]" />
              <span>Cupons de Desconto Cadastrados</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {coupons.map((cp) => (
                <div key={cp.id} className="p-3.5 bg-[#FAF7F0] border border-[#3A2E1F]/10 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-sm text-[#B8623F] bg-white px-2 py-0.5 rounded border border-[#B8623F]/20">
                      {cp.code}
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      {cp.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7E6C58]">{cp.description}</p>
                  <div className="text-xs font-semibold text-[#3A2E1F]">
                    Desconto: {cp.discount_type === 'PERCENTAGE' ? `${cp.discount_value}%` : `R$ ${cp.discount_value.toFixed(2)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: LOGOTIPO & CONFIGURAÇÕES DA LOJA */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'settings' && storeSettings && (
          <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-6 shadow-2xs space-y-6">
            <div>
              <h2 className="font-serif font-bold text-xl text-[#3A2E1F]">
                Logotipo & Configurações da Padaria
              </h2>
              <p className="text-xs text-[#7E6C58]">
                Altere a imagem circular da logo, o endereço de retirada, cidade exibida e informações gerais.
              </p>
            </div>

            {/* SEÇÃO DO LOGOTIPO CIRCULAR */}
            <div className="p-5 bg-[#FAF7F0] rounded-2xl border border-[#3A2E1F]/15 space-y-4">
              <h3 className="font-serif font-bold text-base text-[#3A2E1F] flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#B8623F]" />
                <span>Logotipo da Loja (Imagem Circular)</span>
              </h3>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Visual Preview */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-[#B8623F]/70 p-0.5 shadow-md bg-white flex items-center justify-center">
                    {storeSettings.logo_url ? (
                      <img
                        src={storeSettings.logo_url}
                        alt="Preview Logo"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#F3ECDD] rounded-full flex items-center justify-center font-serif font-bold text-4xl text-[#3A2E1F]">
                        A
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-[#7E6C58]">Visualização na Loja</span>
                </div>

                {/* Upload & Controls */}
                <div className="flex-1 space-y-3 text-xs w-full">
                  <input
                    type="file"
                    ref={logoImageInputRef}
                    accept="image/*"
                    onChange={handleLogoImageFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoImageInputRef.current?.click()}
                      className="px-4 py-2.5 bg-[#B8623F] hover:bg-[#994E30] text-white font-semibold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Subir Imagem da Logo do Computador</span>
                    </button>

                    {storeSettings.logo_url && (
                      <button
                        type="button"
                        onClick={() => setStoreSettings({ ...storeSettings, logo_url: '' })}
                        className="px-3 py-2 border border-[#3A2E1F]/20 text-[#7E6C58] hover:text-rose-600 hover:bg-white rounded-xl cursor-pointer"
                      >
                        Restaurar Logo "A" Padrão
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#554432] mb-1">
                      Ou informe uma URL externa da imagem:
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={storeSettings.logo_url || ''}
                      onChange={(e) =>
                        setStoreSettings({ ...storeSettings, logo_url: e.target.value })
                      }
                      className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* MENSAGEM DE CONFIRMAÇÃO AO SALVAR */}
            {settingsSavedMessage && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{settingsSavedMessage}</span>
              </div>
            )}

            {/* SEÇÃO 1: IDENTIDADE & MARCA */}
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-base text-[#3A2E1F] border-b border-[#3A2E1F]/10 pb-2">
                1. Informações & Identidade da Padaria
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Nome da Padaria</label>
                  <input
                    type="text"
                    value={storeSettings.name}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, name: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Instagram (@usuario)</label>
                  <input
                    type="text"
                    value={storeSettings.instagram || ''}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, instagram: e.target.value })
                    }
                    placeholder="@affetopaes"
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#554432] mb-1">
                    Descrição / Slogan (Exibido no Rodapé)
                  </label>
                  <textarea
                    rows={2}
                    value={storeSettings.description || ''}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, description: e.target.value })
                    }
                    placeholder="Pães e folhados de fermentação lenta com levain de 36 horas, farinhas francesas selecionadas..."
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: LOCALIZAÇÃO & ENDEREÇO */}
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-base text-[#3A2E1F] border-b border-[#3A2E1F]/10 pb-2">
                2. Localização & Endereços
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#554432] mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={storeSettings.city || ''}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, city: e.target.value })
                    }
                    placeholder="Espera Feliz"
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#554432] mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    value={storeSettings.state || ''}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, state: e.target.value })
                    }
                    placeholder="MG"
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#554432] mb-1">
                    Texto de Localização no Cabeçalho e Rodapé (Ex: Espera Feliz - MG)
                  </label>
                  <input
                    type="text"
                    value={storeSettings.address}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, address: e.target.value })
                    }
                    placeholder="Espera Feliz - MG"
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                  <span className="text-[10px] text-[#7E6C58] mt-0.5 block">
                    Este dado alimenta a identificação principal de cidade e estado da loja.
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#554432] mb-1">
                    Endereço Completo para Retirada no Balcão e Rodapé
                  </label>
                  <input
                    type="text"
                    value={storeSettings.pickup_address || storeSettings.address}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, pickup_address: e.target.value })
                    }
                    placeholder="Rua Principal, 100 - Centro, Espera Feliz - MG"
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                  <span className="text-[10px] text-[#7E6C58] mt-0.5 block">
                    Utilizado no rodapé, no checkout e no modal de localização física da padaria.
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: CONTATOS & ATENDIMENTO */}
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-base text-[#3A2E1F] border-b border-[#3A2E1F]/10 pb-2">
                3. Canais de Atendimento
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#554432] mb-1">
                    Telefone de Atendimento (Exibido no Rodapé)
                  </label>
                  <input
                    type="text"
                    value={storeSettings.phone || ''}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, phone: e.target.value })
                    }
                    placeholder="(32) 98468-0513"
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#554432] mb-1">
                    WhatsApp (Apenas números com DDD e código 55)
                  </label>
                  <input
                    type="text"
                    value={storeSettings.whatsapp}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, whatsapp: e.target.value })
                    }
                    placeholder="5532984680513"
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                  <span className="text-[10px] text-[#7E6C58] mt-0.5 block">
                    Utilizado para envio do resumo do pedido via WhatsApp e links diretos.
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 4: HORÁRIOS & FORNADAS */}
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-base text-[#3A2E1F] border-b border-[#3A2E1F]/10 pb-2">
                4. Fornadas & Programação de Entregas
              </h3>
              <div className="space-y-3 text-xs">
                {/* FRASE DE ENTREGAS NO RODAPÉ */}
                <div className="bg-[#FAF7F0] p-3 rounded-xl border border-[#B8623F]/25 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-[#3A2E1F]">
                      Frase de Entregas (Exibida no Rodapé)
                    </label>
                    <span className="text-[10px] uppercase font-bold text-[#B8623F] bg-[#B8623F]/10 px-2 py-0.5 rounded-full">
                      Rodapé
                    </span>
                  </div>
                  <input
                    type="text"
                    id="input-admin-delivery-schedule"
                    value={storeSettings.delivery_schedule_text ?? 'Entregas nas terças e sextas'}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, delivery_schedule_text: e.target.value })
                    }
                    placeholder="Entregas nas terças e sextas"
                    className="w-full p-2.5 rounded-lg border border-[#3A2E1F]/20 bg-white text-[#3A2E1F] font-semibold text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-[#B8623F]"
                  />
                  <p className="text-[11px] text-[#7E6C58]">
                    Esta frase é exibida de forma destacada no rodapé da loja, substituindo a lista diária. Padrão: <span className="font-semibold text-[#3A2E1F]">Entregas nas terças e sextas</span>.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-[#554432] mb-1">
                    Texto Informativo de Fornada Fresca (Exibido no Cabeçalho e Avisos)
                  </label>
                  <input
                    type="text"
                    value={storeSettings.fresh_batch_hours || ''}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, fresh_batch_hours: e.target.value })
                    }
                    placeholder="Fornada fresca saindo às 08h00 e às 15h00."
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                </div>

                <div className="mt-3">
                  <label className="block font-semibold text-[#554432] mb-2">
                    Horários Semanais de Atendimento
                  </label>
                  <div className="border border-[#3A2E1F]/15 rounded-xl overflow-hidden divide-y divide-[#3A2E1F]/10">
                    {storeSettings.opening_hours?.map((oh, idx) => (
                      <div key={idx} className="p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2 bg-white">
                        <span className="w-32 font-bold text-[#3A2E1F]">{oh.day}</span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!oh.is_closed}
                              onChange={(e) => {
                                const updatedHours = [...storeSettings.opening_hours];
                                updatedHours[idx].is_closed = !e.target.checked;
                                setStoreSettings({ ...storeSettings, opening_hours: updatedHours });
                              }}
                              className="rounded accent-[#B8623F]"
                            />
                            <span className="text-[11px] text-[#554432]">Aberto</span>
                          </label>

                          {!oh.is_closed ? (
                            <div className="flex items-center gap-1.5 ml-2">
                              <input
                                type="text"
                                value={oh.open}
                                onChange={(e) => {
                                  const updatedHours = [...storeSettings.opening_hours];
                                  updatedHours[idx].open = e.target.value;
                                  setStoreSettings({ ...storeSettings, opening_hours: updatedHours });
                                }}
                                className="w-16 p-1 border border-[#3A2E1F]/20 rounded-lg text-center text-xs bg-[#FAF7F0]"
                              />
                              <span className="text-xs text-[#7E6C58]">às</span>
                              <input
                                type="text"
                                value={oh.close}
                                onChange={(e) => {
                                  const updatedHours = [...storeSettings.opening_hours];
                                  updatedHours[idx].close = e.target.value;
                                  setStoreSettings({ ...storeSettings, opening_hours: updatedHours });
                                }}
                                className="w-16 p-1 border border-[#3A2E1F]/20 rounded-lg text-center text-xs bg-[#FAF7F0]"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-rose-600 font-semibold italic ml-2">
                              Fechado
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 5: FINANCEIRO & REGRAS DE ENTREGA */}
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-base text-[#3A2E1F] border-b border-[#3A2E1F]/10 pb-2">
                5. Configurações Comerciais & PIX
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Chave PIX da Padaria</label>
                  <input
                    type="text"
                    value={storeSettings.pix_key}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, pix_key: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Valor Mínimo de Pedido (R$)</label>
                  <input
                    type="number"
                    value={storeSettings.min_order_value}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, min_order_value: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Frete Grátis a Partir de (R$)</label>
                  <input
                    type="number"
                    value={storeSettings.free_shipping_threshold || 120}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        free_shipping_threshold: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Tempo Médio de Preparo (min)</label>
                  <input
                    type="number"
                    value={storeSettings.lead_time_minutes || 45}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        lead_time_minutes: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                </div>
              </div>
            </div>

            {/* BOTÃO SALVAR */}
            <div className="pt-4 border-t border-[#3A2E1F]/10 flex flex-wrap items-center gap-3">
              <button
                id="btn-admin-salvar-configuracoes"
                onClick={async () => {
                  const saved = await dataStore.saveStoreSettings(storeSettings);
                  if (saved) {
                    setStoreSettings(saved);
                  }
                  onOrderUpdated();
                  setSettingsSavedMessage('Configurações salvas com sucesso! As alterações já estão ativas em todo o sistema.');
                  setTimeout(() => setSettingsSavedMessage(null), 5000);
                }}
                className="px-6 py-3 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Todas as Alterações</span>
              </button>

              {settingsSavedMessage && (
                <span className="text-xs text-emerald-700 font-medium">
                  {settingsSavedMessage}
                </span>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: EDITAR / CRIAR PRODUTO (Com Upload de Fotos) */}
      {/* ------------------------------------------------------------- */}
      {editingProduct && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#3A2E1F]/15 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-[#3A2E1F]/10">
              <h3 className="font-serif font-bold text-lg text-[#3A2E1F]">
                {isNewProduct ? 'Cadastrar Novo Produto' : 'Editar Produto'}
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-full hover:bg-black/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* UPLOAD DE FOTO DO PRODUTO */}
              <div className="p-4 bg-[#FAF7F0] rounded-2xl border border-[#3A2E1F]/15 space-y-3">
                <label className="block font-bold text-[#3A2E1F]">
                  Foto do Produto
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border border-[#3A2E1F]/20 shrink-0">
                    <img
                      src={editingProduct.image_url}
                      alt={editingProduct.name || 'Preview'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <input
                      type="file"
                      ref={productImageInputRef}
                      accept="image/*"
                      onChange={handleProductImageFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => productImageInputRef.current?.click()}
                      className="px-3.5 py-2 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Subir Foto do Computador</span>
                    </button>
                    <div>
                      <input
                        type="text"
                        placeholder="Ou cole a URL da imagem aqui"
                        value={editingProduct.image_url}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, image_url: e.target.value })
                        }
                        className="w-full p-2 rounded-xl border border-[#3A2E1F]/20 bg-white text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações Básicas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Nome do Produto</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, name: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20"
                    placeholder="Ex: Pão Sourdough Tradicional"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Categoria</label>
                  <select
                    value={editingProduct.category_id}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, category_id: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#554432] mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={editingProduct.description}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20"
                  placeholder="Ingredientes, tempo de fermentação, etc."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Preço Base (R$)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingProduct.base_price}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        base_price: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Preço Promo (R$)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Opcional"
                    value={editingProduct.promotional_price || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        promotional_price: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Estoque Atual</label>
                  <input
                    type="number"
                    value={editingProduct.stock_quantity}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        stock_quantity: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.is_active}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        is_active: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-[#B8623F]"
                  />
                  <span className="font-semibold">Produto Ativo no Cardápio</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.is_featured}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        is_featured: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-[#B8623F]"
                  />
                  <span>Destaque Principal</span>
                </label>
              </div>

              {/* Schedule Fornada Config */}
              <div className="pt-2 border-t border-[#3A2E1F]/10 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#3A2E1F]">
                  <input
                    type="checkbox"
                    checked={editingProduct.schedule_config?.is_scheduled_only ?? false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        setEditingProduct({
                          ...editingProduct,
                          schedule_config: {
                            is_scheduled_only: true,
                            available_days: [2, 5],
                            batch_limit: 10,
                            days_label: 'Fornadas às Terças e Sextas (Lote de 10 un)',
                          },
                        });
                      } else {
                        const { schedule_config, ...rest } = editingProduct;
                        setEditingProduct(rest as Product);
                      }
                    }}
                    className="w-4 h-4 accent-[#B8623F]"
                  />
                  <span>Restringir a dias específicos de fornada (ex: só terça e sexta)</span>
                </label>

                {editingProduct.schedule_config?.is_scheduled_only && (
                  <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#B7A05E]/30 space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#554432] mb-1">
                        Dias com fornada fresca:
                      </label>
                      <div className="grid grid-cols-4 gap-1 text-[11px]">
                        {[
                          { day: 0, label: 'Dom' },
                          { day: 1, label: 'Seg' },
                          { day: 2, label: 'Ter' },
                          { day: 3, label: 'Qua' },
                          { day: 4, label: 'Qui' },
                          { day: 5, label: 'Sex' },
                          { day: 6, label: 'Sáb' },
                        ].map(({ day, label }) => {
                          const isSelected =
                            editingProduct.schedule_config?.available_days.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const currentDays =
                                  editingProduct.schedule_config?.available_days || [];
                                const nextDays = isSelected
                                  ? currentDays.filter((d) => d !== day)
                                  : [...currentDays, day].sort();
                                setEditingProduct({
                                  ...editingProduct,
                                  schedule_config: {
                                    ...editingProduct.schedule_config!,
                                    available_days: nextDays,
                                  },
                                });
                              }}
                              className={`py-1 px-1.5 rounded-lg font-bold border text-center transition-colors ${
                                isSelected
                                  ? 'bg-[#B8623F] text-white border-[#B8623F]'
                                  : 'bg-white text-[#7E6C58] border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#554432] mb-0.5">
                          Limite por fornada (unidades)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={editingProduct.schedule_config?.batch_limit || 10}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              schedule_config: {
                                ...editingProduct.schedule_config!,
                                batch_limit: Number(e.target.value) || 1,
                              },
                            })
                          }
                          className="w-full p-1.5 rounded-lg border border-[#3A2E1F]/20 text-xs bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-[#554432] mb-0.5">
                          Rótulo da fornada
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Terças e Sextas"
                          value={editingProduct.schedule_config?.days_label || ''}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              schedule_config: {
                                ...editingProduct.schedule_config!,
                                days_label: e.target.value,
                              },
                            })
                          }
                          className="w-full p-1.5 rounded-lg border border-[#3A2E1F]/20 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#3A2E1F]/10">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 bg-gray-100 text-[#3A2E1F] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveProduct(editingProduct)}
                className="px-5 py-2 bg-[#B8623F] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
              >
                Salvar Produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: EDITAR / CRIAR CATEGORIA */}
      {/* ------------------------------------------------------------- */}
      {editingCategory && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#3A2E1F]/15 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#3A2E1F]/10">
              <h3 className="font-serif font-bold text-lg text-[#3A2E1F]">
                {isNewCategory ? 'Nova Categoria' : 'Editar Categoria'}
              </h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="p-1 rounded-full hover:bg-black/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#554432] mb-1">Nome da Categoria</label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20"
                  placeholder="Ex: Pães de Fermentação Natural"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#554432] mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, description: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20"
                  placeholder="Explicação breve da categoria"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Ordem de Exibição</label>
                  <input
                    type="number"
                    value={editingCategory.sort_order}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        sort_order: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={editingCategory.active}
                      onChange={(e) =>
                        setEditingCategory({ ...editingCategory, active: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#B8623F]"
                    />
                    <span>Categoria Ativa</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#3A2E1F]/10">
              <button
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 bg-gray-100 text-[#3A2E1F] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveCategory(editingCategory)}
                className="px-5 py-2 bg-[#B8623F] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
              >
                Salvar Categoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: DETALHES COMPLETOS DO PEDIDO & AUDITORIA */}
      {/* ------------------------------------------------------------- */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onEditOrder={(ord) => {
            setSelectedOrder(null);
            setOrderToEdit(ord);
          }}
          onCancelOrder={(ord) => {
            setSelectedOrder(null);
            setOrderToCancel(ord);
          }}
          onAdvanceStatus={handleAdvanceStatus}
          onUpdatePayment={handleUpdatePayment}
          storePhone={storeSettings?.phone}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: EDIÇÃO COMPLETA DO PEDIDO */}
      {/* ------------------------------------------------------------- */}
      {orderToEdit && (
        <OrderEditModal
          order={orderToEdit}
          onClose={() => setOrderToEdit(null)}
          onSave={handleSaveEditedOrder}
          availableProducts={products}
          availableZones={zones}
          availableCepRules={ceps}
          availableCoupons={coupons}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 6: CANCELAMENTO OPERACIONAL DO PEDIDO */}
      {/* ------------------------------------------------------------- */}
      {orderToCancel && (
        <OrderCancelModal
          order={orderToCancel}
          onClose={() => setOrderToCancel(null)}
          onConfirm={handleCancelOrder}
        />
      )}
    </div>
  );
};
