import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  LayoutDashboard,
  Kanban,
  Package,
  Ticket,
  Database,
  Settings,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Truck,
  Store,
  Copy,
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
  Sparkles,
  CreditCard,
  Key,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { adminAuth } from '../lib/adminAuth';
import { SUPABASE_FULL_SCHEMA_SQL } from '../lib/schemaSql';
import { dataStore } from '../lib/supabase';
import { orderService } from '../services/orderService';
import {
  Category,
  Coupon,
  DeliveryCepRule,
  DeliveryZone,
  Order,
  OrderStatus,
  Product,
  StoreSettings,
} from '../types';

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
    'orders' | 'products' | 'categories' | 'coupons' | 'ceps' | 'settings' | 'supabase'
  >('orders');

  // Supabase test and sync state
  const [supabaseCreds, setSupabaseCreds] = useState(() => dataStore.getCredentialsInfo());
  const [inputUrl, setInputUrl] = useState(() => dataStore.getCredentialsInfo().url);
  const [inputAnonKey, setInputAnonKey] = useState(() => dataStore.getCredentialsInfo().anonKey);
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [credentialsMsg, setCredentialsMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const [supabaseTest, setSupabaseTest] = useState<{
    tested: boolean;
    loading: boolean;
    connected: boolean;
    message: string;
    url: string;
    hasAnonKey: boolean;
    latencyMs?: number;
    tablesFound?: Record<string, number>;
    securityStatus?: string;
  }>({
    tested: false,
    loading: false,
    connected: false,
    message: '',
    url: dataStore.getCredentialsInfo().url,
    hasAnonKey: dataStore.getCredentialsInfo().hasAnonKey,
  });

  const [syncStatus, setSyncStatus] = useState<{
    syncing: boolean;
    message: string | null;
    success?: boolean;
    details?: string;
  }>({ syncing: false, message: null });

  const [copiedSql, setCopiedSql] = useState(false);

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

  // Handle CEP management
  const handleAddCep = async () => {
    if (!newCep.cep.trim() || !newCep.label.trim()) return;
    const rule: DeliveryCepRule = {
      id: `cep-${Date.now()}`,
      cep: newCep.cep.trim(),
      label: newCep.label.trim(),
      fee: Number(newCep.fee) || 0,
      estimated_minutes: Number(newCep.estimated_minutes) || 30,
      active: true,
    };
    const updated = [...ceps, rule];
    setCeps(updated);
    await dataStore.saveDeliveryCeps(updated);
    setNewCep({ cep: '', label: '', fee: 10, estimated_minutes: 35 });
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
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setStoreSettings({
          ...storeSettings,
          logo_url: base64,
        });
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

  // Handle Supabase Test
  const handleTestSupabase = async (overrideUrl?: string, overrideKey?: string) => {
    setSupabaseTest((prev) => ({ ...prev, loading: true }));
    const result = await dataStore.testSupabaseConnection(
      overrideUrl !== undefined ? overrideUrl : inputUrl,
      overrideKey !== undefined ? overrideKey : inputAnonKey
    );
    setSupabaseTest({
      tested: true,
      loading: false,
      connected: result.connected,
      message: result.message,
      url: result.url,
      hasAnonKey: result.hasAnonKey,
      latencyMs: result.latencyMs,
      tablesFound: result.tablesFound,
      securityStatus: result.securityStatus,
    });
  };

  const handleSaveCredentials = async () => {
    dataStore.setCredentialsOverride(inputUrl, inputAnonKey);
    const updated = dataStore.getCredentialsInfo();
    setSupabaseCreds(updated);
    setCredentialsMsg({ text: 'Credenciais salvas com sucesso no navegador! Testando conexão imediatamente...' });
    await handleTestSupabase(inputUrl, inputAnonKey);
    await reloadData();
    setTimeout(() => setCredentialsMsg(null), 6000);
  };

  const handleResetCredentials = async () => {
    dataStore.clearCredentialsOverride();
    const updated = dataStore.getCredentialsInfo();
    setSupabaseCreds(updated);
    setInputUrl(updated.url);
    setInputAnonKey(updated.anonKey);
    setCredentialsMsg({ text: 'Override local removido! O sistema voltou aos padrões de ambiente.' });
    await handleTestSupabase(updated.url, updated.anonKey);
    await reloadData();
    setTimeout(() => setCredentialsMsg(null), 5000);
  };

  // Handle Full Sync with Supabase
  const handleSyncAll = async () => {
    setSyncStatus({ syncing: true, message: 'Sincronizando produtos, categorias, cupons e configurações com o Supabase...' });
    const result = await dataStore.syncAllToSupabase();
    if (result.success) {
      setSyncStatus({
        syncing: false,
        success: true,
        message: `Sincronização concluída com sucesso! ${result.productsSynced} produtos, ${result.categoriesSynced} categorias, ${result.couponsSynced} cupons e ${result.ordersSynced} pedidos sincronizados no Supabase.`,
      });
      await reloadData();
      onOrderUpdated();
    } else {
      setSyncStatus({
        syncing: false,
        success: false,
        message: `Erro na sincronização: ${result.error || 'Falha ao sincronizar'}`,
      });
    }
    setTimeout(() => {
      setSyncStatus((prev) => ({ ...prev, message: null }));
    }, 8000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_FULL_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
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

  // Stats calculation
  const totalRevenue = orders
    .filter((o) => o.payment_status === 'APPROVED')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingCount = orders.filter((o) => o.status === 'PENDING_PAYMENT').length;
  const preparingCount = orders.filter((o) => o.status === 'PREPARING').length;
  const confirmedCount = orders.filter((o) => o.status === 'CONFIRMED').length;

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
              <span>CEPs & Frete da Rota ({ceps.length})</span>
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

            <button
              id="tab-admin-supabase"
              onClick={() => setActiveTab('supabase')}
              className={`px-3 py-2 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'supabase'
                  ? 'bg-[#3A2E1F] text-white shadow-xs font-semibold'
                  : 'text-[#7E6C58] hover:bg-black/5 hover:text-[#3A2E1F]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Banco de Dados (Supabase)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Page Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Header Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] text-[#7E6C58] uppercase font-bold block">Faturamento Total</span>
            <span className="font-serif font-bold text-xl text-[#3A2E1F]">
              R$ {totalRevenue.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] text-[#7E6C58] uppercase font-bold block">Aguardando Pagamento</span>
            <span className="font-serif font-bold text-xl text-amber-600">{pendingCount}</span>
          </div>
          <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] text-[#7E6C58] uppercase font-bold block">Confirmados / Fornada</span>
            <span className="font-serif font-bold text-xl text-[#B8623F]">{confirmedCount}</span>
          </div>
          <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] text-[#7E6C58] uppercase font-bold block">Em Preparo / Forno</span>
            <span className="font-serif font-bold text-xl text-emerald-600">{preparingCount}</span>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: PEDIDOS & KANBAN */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-serif font-bold text-xl text-[#3A2E1F]">
                  Painel de Pedidos & Esteira de Fornadas
                </h2>
                <p className="text-xs text-[#7E6C58]">
                  Acompanhe os pedidos em tempo real e avance as etapas de preparo e entrega.
                </p>
              </div>
              <button
                onClick={onOrderUpdated}
                className="px-3 py-1.5 rounded-xl border border-[#3A2E1F]/20 text-xs font-medium hover:bg-white flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Atualizar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Coluna 1: Pendentes */}
              <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-3.5 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[#3A2E1F]/10">
                  <h3 className="font-bold text-xs text-[#3A2E1F] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Aguardando Pagamento</span>
                  </h3>
                  <span className="text-[11px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full">
                    {orders.filter((o) => o.status === 'PENDING_PAYMENT').length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {orders
                    .filter((o) => o.status === 'PENDING_PAYMENT')
                    .map((o) => (
                      <div
                        key={o.id}
                        onClick={() => setSelectedOrder(o)}
                        className="p-3 bg-[#FAF7F0] hover:bg-[#F3ECDD] border border-[#3A2E1F]/10 rounded-xl cursor-pointer transition-all text-xs space-y-1.5"
                      >
                        <div className="flex justify-between font-mono font-bold text-[#3A2E1F]">
                          <span>{o.code}</span>
                          <span className="text-[#B8623F]">R$ {o.total.toFixed(2)}</span>
                        </div>
                        <p className="font-semibold text-[#3A2E1F] truncate">{o.customer_name}</p>
                        <div className="text-[11px] text-[#7E6C58]">
                          {o.items.length} itens • {o.delivery_type === 'DELIVERY' ? 'Entrega' : 'Retirada'}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdvanceStatus(o, 'CONFIRMED', 'Pagamento aprovado manualmente pelo admin');
                          }}
                          className="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                        >
                          Confirmar Pagamento
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Coluna 2: Confirmados / Aguardando Fornada */}
              <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-3.5 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[#3A2E1F]/10">
                  <h3 className="font-bold text-xs text-[#3A2E1F] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Confirmados (Fornada)</span>
                  </h3>
                  <span className="text-[11px] font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full">
                    {orders.filter((o) => o.status === 'CONFIRMED').length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {orders
                    .filter((o) => o.status === 'CONFIRMED')
                    .map((o) => (
                      <div
                        key={o.id}
                        onClick={() => setSelectedOrder(o)}
                        className="p-3 bg-[#FAF7F0] hover:bg-[#F3ECDD] border border-[#3A2E1F]/10 rounded-xl cursor-pointer transition-all text-xs space-y-1.5"
                      >
                        <div className="flex justify-between font-mono font-bold text-[#3A2E1F]">
                          <span>{o.code}</span>
                          <span className="text-[#B8623F]">R$ {o.total.toFixed(2)}</span>
                        </div>
                        <p className="font-semibold text-[#3A2E1F] truncate">{o.customer_name}</p>
                        <div className="text-[11px] text-[#7E6C58]">
                          📅 Data: {o.scheduled_date} ({o.scheduled_time})
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdvanceStatus(o, 'PREPARING', 'Iniciado preparo e fermentação dos pães');
                          }}
                          className="w-full mt-2 py-1.5 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-lg text-[10px] font-bold"
                        >
                          Iniciar Preparo
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Coluna 3: Em Preparo / Forno */}
              <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-3.5 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[#3A2E1F]/10">
                  <h3 className="font-bold text-xs text-[#3A2E1F] flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-amber-600" />
                    <span>No Forno / Preparando</span>
                  </h3>
                  <span className="text-[11px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full">
                    {orders.filter((o) => o.status === 'PREPARING').length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {orders
                    .filter((o) => o.status === 'PREPARING')
                    .map((o) => (
                      <div
                        key={o.id}
                        onClick={() => setSelectedOrder(o)}
                        className="p-3 bg-[#FAF7F0] hover:bg-[#F3ECDD] border border-[#3A2E1F]/10 rounded-xl cursor-pointer transition-all text-xs space-y-1.5"
                      >
                        <div className="flex justify-between font-mono font-bold text-[#3A2E1F]">
                          <span>{o.code}</span>
                          <span className="text-[#B8623F]">R$ {o.total.toFixed(2)}</span>
                        </div>
                        <p className="font-semibold text-[#3A2E1F] truncate">{o.customer_name}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = o.delivery_type === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'READY';
                            handleAdvanceStatus(o, next, 'Pães assados e prontos para envio ou retirada');
                          }}
                          className="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                        >
                          {o.delivery_type === 'DELIVERY' ? 'Despachar Entrega' : 'Pronto para Retirada'}
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Coluna 4: Pronto / Em Rota / Entregue */}
              <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-3.5 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[#3A2E1F]/10">
                  <h3 className="font-bold text-xs text-[#3A2E1F] flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Pronto / Em Rota / Final</span>
                  </h3>
                  <span className="text-[11px] font-bold bg-purple-50 text-purple-800 px-2 py-0.5 rounded-full">
                    {orders.filter((o) => ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP'].includes(o.status)).length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {orders
                    .filter((o) => ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP'].includes(o.status))
                    .map((o) => (
                      <div
                        key={o.id}
                        onClick={() => setSelectedOrder(o)}
                        className="p-3 bg-[#FAF7F0] hover:bg-[#F3ECDD] border border-[#3A2E1F]/10 rounded-xl cursor-pointer transition-all text-xs space-y-1.5"
                      >
                        <div className="flex justify-between font-mono font-bold text-[#3A2E1F]">
                          <span>{o.code}</span>
                          <span className="text-[10px] uppercase font-bold text-[#7E6C58]">{o.status}</span>
                        </div>
                        <p className="font-semibold text-[#3A2E1F] truncate">{o.customer_name}</p>
                        {(o.status === 'READY' || o.status === 'OUT_FOR_DELIVERY') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = o.delivery_type === 'DELIVERY' ? 'DELIVERED' : 'PICKED_UP';
                              handleAdvanceStatus(o, next, 'Entregue ao cliente com sucesso');
                            }}
                            className="w-full py-1.5 bg-[#3A2E1F] hover:bg-[#554432] text-white rounded-lg text-[10px] font-bold"
                          >
                            Finalizar Entrega
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
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
        {/* TAB 4: CEPS & FRETE DA ROTA */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'ceps' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-serif font-bold text-xl text-[#3A2E1F]">
                  CEPs Atendidos & Taxas Individuais de Frete
                </h2>
                <p className="text-xs text-[#7E6C58]">
                  Defina os CEPs atendidos pela entrega própria da padaria e a taxa de frete correspondente.
                </p>
              </div>
            </div>

            {/* Form to add CEP rule */}
            <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-5 shadow-2xs space-y-4">
              <h3 className="font-bold text-sm text-[#3A2E1F] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#B8623F]" />
                <span>Cadastrar Novo CEP de Entrega</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#554432] mb-1">CEP (ou prefixo)</label>
                  <input
                    type="text"
                    placeholder="Ex: 36830-000 ou 36830"
                    value={newCep.cep}
                    onChange={(e) => setNewCep({ ...newCep, cep: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Bairro / Rota de Entrega</label>
                  <input
                    type="text"
                    placeholder="Ex: Centro / Espera Feliz"
                    value={newCep.label}
                    onChange={(e) => setNewCep({ ...newCep, label: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Taxa de Frete (R$)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newCep.fee}
                    onChange={(e) => setNewCep({ ...newCep, fee: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0] focus:bg-white"
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
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0] focus:bg-white"
                  />
                </div>
              </div>
              <button
                onClick={handleAddCep}
                className="px-4 py-2 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
              >
                Cadastrar Rota de CEP
              </button>
            </div>

            {/* List of CEPs */}
            <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F0] border-b border-[#3A2E1F]/10 text-[#7E6C58] uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">CEP Atendido</th>
                      <th className="p-3">Região / Bairro</th>
                      <th className="p-3">Taxa de Frete</th>
                      <th className="p-3">Tempo Estimado</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3A2E1F]/10">
                    {ceps.map((rule) => (
                      <tr key={rule.id} className="hover:bg-[#FAF7F0]/50">
                        <td className="p-3 font-mono font-bold text-[#3A2E1F]">{rule.cep}</td>
                        <td className="p-3 text-[#554432]">{rule.label || '-'}</td>
                        <td className="p-3 font-bold text-[#B8623F]">R$ {rule.fee.toFixed(2)}</td>
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
                            title="Remover CEP"
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
                4. Fornadas & Horários de Funcionamento
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#554432] mb-1">
                    Texto Informativo de Fornada Fresca (Exibido no Rodapé e Cabeçalho)
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

        {/* ------------------------------------------------------------- */}
        {/* TAB 7: SUPABASE & BANCO DE DADOS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'supabase' && (
          <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-6 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3A2E1F]/10">
              <div>
                <h2 className="font-serif font-bold text-xl text-[#3A2E1F] flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#B8623F]" />
                  <span>Conexão Supabase & Persistência de Dados</span>
                </h2>
                <p className="text-xs text-[#7E6C58] mt-1">
                  Verifique a integridade, o histórico de pedidos e a persistência em tempo real com o banco de dados PostgreSQL.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleTestSupabase}
                  disabled={supabaseTest.loading}
                  className="px-4 py-2.5 bg-[#3A2E1F] hover:bg-[#554432] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${supabaseTest.loading ? 'animate-spin' : ''}`} />
                  <span>Testar Conexão</span>
                </button>

                <button
                  onClick={handleSyncAll}
                  disabled={syncStatus.syncing}
                  className="px-4 py-2.5 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${syncStatus.syncing ? 'animate-spin' : ''}`} />
                  <span>Sincronizar Tudo</span>
                </button>

                <button
                  onClick={handleCopySql}
                  className="px-4 py-2.5 bg-[#FAF7F0] hover:bg-[#EADBBA]/60 border border-[#3A2E1F]/20 text-[#3A2E1F] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>
              </div>
            </div>

            {/* Sync Alert Banner */}
            {syncStatus.message && (
              <div
                className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
                  syncStatus.success
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {syncStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{syncStatus.message}</span>
              </div>
            )}

            {/* Supabase Credentials Configuration Card */}
            <div className="p-5 bg-[#FAF7F0] border border-[#3A2E1F]/15 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#3A2E1F]/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white rounded-lg border border-[#3A2E1F]/10 shadow-2xs">
                    <Key className="w-4 h-4 text-[#B8623F]" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-[#3A2E1F]">
                      Chaves de Conexão com o Supabase
                    </h3>
                    <p className="text-[11px] text-[#7E6C58]">
                      Insira ou corrija suas chaves API aqui para conectar diretamente ao banco PostgreSQL.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {supabaseCreds.isOverridden ? (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      Configurado Localmente no Navegador
                    </span>
                  ) : supabaseCreds.hasAnonKey ? (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Variável de Ambiente (.env)
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                      Chave Não Configurada
                    </span>
                  )}
                </div>
              </div>

              {credentialsMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    credentialsMsg.isError
                      ? 'bg-rose-50 text-rose-900 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{credentialsMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supabase URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3A2E1F] flex items-center justify-between">
                    <span>URL do Projeto (VITE_SUPABASE_URL)</span>
                    <span className="text-[10px] text-[#7E6C58] font-normal">Endpoint da API</span>
                  </label>
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://seu-projeto.supabase.co"
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#3A2E1F]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8623F]/30 focus:border-[#B8623F] font-mono text-[#3A2E1F]"
                  />
                  <p className="text-[10px] text-[#7E6C58]">
                    Localizado em: <em>Supabase Dashboard &gt; Project Settings &gt; API &gt; Project URL</em>.
                  </p>
                </div>

                {/* Supabase Anon Key */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3A2E1F] flex items-center justify-between">
                    <span>Chave Anônima Pública (VITE_SUPABASE_ANON_KEY)</span>
                    <span className="text-[10px] text-amber-700 font-semibold">Chave de acesso</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAnonKey ? 'text' : 'password'}
                      value={inputAnonKey}
                      onChange={(e) => setInputAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-white border border-[#3A2E1F]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8623F]/30 focus:border-[#B8623F] font-mono text-[#3A2E1F]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAnonKey(!showAnonKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#7E6C58] hover:text-[#3A2E1F] transition-colors"
                      title={showAnonKey ? 'Ocultar chave' : 'Mostrar chave'}
                    >
                      {showAnonKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#7E6C58]">
                    Localizado em: <em>Supabase Dashboard &gt; Project Settings &gt; API &gt; Project API Keys &gt; anon / public</em>.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveCredentials}
                    disabled={supabaseTest.loading}
                    className="px-4 py-2 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Credenciais e Conectar</span>
                  </button>

                  <button
                    onClick={() => handleTestSupabase(inputUrl, inputAnonKey)}
                    disabled={supabaseTest.loading}
                    className="px-3.5 py-2 bg-white hover:bg-[#FAF7F0] border border-[#3A2E1F]/20 text-[#3A2E1F] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${supabaseTest.loading ? 'animate-spin' : ''}`} />
                    <span>Testar Dados Digitados</span>
                  </button>
                </div>

                {supabaseCreds.isOverridden && (
                  <button
                    onClick={handleResetCredentials}
                    className="px-3 py-2 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar Padrão do Sistema</span>
                  </button>
                )}
              </div>
            </div>

            {/* Supabase Test Result */}
            {supabaseTest.tested && (
              <div
                className={`p-4 rounded-xl text-xs space-y-3 ${
                  supabaseTest.connected
                    ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                    : 'bg-amber-50 text-amber-950 border border-amber-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${supabaseTest.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    {supabaseTest.connected ? 'Supabase Conectado e Operacional' : 'Atenção com a Conexão'}
                  </span>
                  {supabaseTest.latencyMs !== undefined && (
                    <span className="text-[11px] font-mono bg-white/70 px-2 py-0.5 rounded border border-emerald-300">
                      Latência: {supabaseTest.latencyMs}ms
                    </span>
                  )}
                </div>
                <p>{supabaseTest.message}</p>
                {supabaseTest.securityStatus && (
                  <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5 pt-1 border-t border-emerald-200/60">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{supabaseTest.securityStatus}</span>
                  </div>
                )}
              </div>
            )}

            {/* Database Metrics Grid */}
            <div>
              <h3 className="font-serif font-bold text-sm text-[#3A2E1F] mb-3">
                Status das Tabelas e Registros no Supabase
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-[#FAF7F0] border border-[#3A2E1F]/10 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#7E6C58] block">Produtos</span>
                  <span className="font-serif font-bold text-lg text-[#3A2E1F]">
                    {supabaseTest.tablesFound?.products ?? products.length} itens
                  </span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5 font-medium">Sincronizado</span>
                </div>

                <div className="p-3.5 bg-[#FAF7F0] border border-[#3A2E1F]/10 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#7E6C58] block">Categorias</span>
                  <span className="font-serif font-bold text-lg text-[#3A2E1F]">
                    {supabaseTest.tablesFound?.categories ?? categories.length} ativas
                  </span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5 font-medium">Sincronizado</span>
                </div>

                <div className="p-3.5 bg-[#FAF7F0] border border-[#3A2E1F]/10 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#7E6C58] block">Pedidos & Histórico</span>
                  <span className="font-serif font-bold text-lg text-[#B8623F]">
                    {supabaseTest.tablesFound?.orders ?? orders.length} pedidos
                  </span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5 font-medium">Auditoria Ativa</span>
                </div>

                <div className="p-3.5 bg-[#FAF7F0] border border-[#3A2E1F]/10 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#7E6C58] block">Rotas de CEP</span>
                  <span className="font-serif font-bold text-lg text-[#3A2E1F]">
                    {ceps.length} CEPs
                  </span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5 font-medium">Cadastrados</span>
                </div>
              </div>
            </div>

            {/* Informações de Segurança e Integridade */}
            <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#3A2E1F]/15 space-y-2 text-xs text-[#554432]">
              <h4 className="font-bold text-[#3A2E1F] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Garantia de Persistência, Histórico e Segurança:</span>
              </h4>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#7E6C58]">
                <li>
                  <strong className="text-[#3A2E1F]">Modificações de Admin:</strong> Ao criar ou alterar produtos, preços, fotos, CEPs e dados da padaria, os dados são persistidos imediatamente no banco de dados e sincronizados.
                </li>
                <li>
                  <strong className="text-[#3A2E1F]">Pedidos e Itens:</strong> Cada pedido é gravado com cabeçalho, itens individuais e endereço associado no PostgreSQL.
                </li>
                <li>
                  <strong className="text-[#3A2E1F]">Histórico de Auditoria:</strong> Toda transição de status (PENDING_PAYMENT, CONFIRMED, PREPARING, etc.) grava um log cronológico imutável na tabela <code className="bg-black/5 px-1 py-0.5 rounded font-mono">order_status_history</code>.
                </li>
              </ul>
            </div>

            {/* Guia Completo: Onde atualizar as chaves em todos os locais */}
            <div className="p-5 rounded-2xl bg-white border border-[#3A2E1F]/15 space-y-3 text-xs text-[#3A2E1F]">
              <div className="flex items-center gap-2 pb-2 border-b border-[#3A2E1F]/10">
                <ShieldCheck className="w-4 h-4 text-[#B8623F]" />
                <h4 className="font-bold font-serif text-sm">
                  Onde e Como Atualizar as Chaves em Todos os Locais do Projeto:
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#3A2E1F]/10 space-y-1.5">
                  <span className="font-bold text-[#3A2E1F] block">1. No código local (.env)</span>
                  <p className="text-[#7E6C58]">
                    Crie ou edite o arquivo <code className="bg-black/5 px-1 py-0.5 rounded font-mono text-[#3A2E1F]">.env</code> na raiz do projeto:
                  </p>
                  <pre className="p-2 bg-[#3A2E1F] text-amber-100 rounded-lg font-mono text-[10px] overflow-x-auto">
{`VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua_chave_anon_aqui"
SUPABASE_SERVICE_ROLE_KEY="sua_chave_service_role"`}
                  </pre>
                </div>

                <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#3A2E1F]/10 space-y-1.5">
                  <span className="font-bold text-[#3A2E1F] block">2. Se rodar em Next.js / SSR</span>
                  <p className="text-[#7E6C58]">
                    O Next.js exige o prefixo <code className="bg-black/5 px-1 py-0.5 rounded font-mono text-[#3A2E1F]">NEXT_PUBLIC_</code> para variáveis client-side:
                  </p>
                  <pre className="p-2 bg-[#3A2E1F] text-amber-100 rounded-lg font-mono text-[10px] overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sua_chave_anon_aqui"
SUPABASE_SERVICE_ROLE_KEY="sua_chave_service_role"`}
                  </pre>
                </div>

                <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#3A2E1F]/10 space-y-1.5">
                  <span className="font-bold text-[#3A2E1F] block">3. Na Hospedagem (Vercel / Netlify / Cloud Run)</span>
                  <p className="text-[#7E6C58]">
                    Acesse o painel do seu provedor de deploy &gt; <em>Settings</em> &gt; <em>Environment Variables</em> e adicione as mesmas variáveis para Production e Preview.
                  </p>
                </div>

                <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#3A2E1F]/10 space-y-1.5">
                  <span className="font-bold text-[#3A2E1F] block">4. Tabelas e Políticas (RLS) no Supabase</span>
                  <p className="text-[#7E6C58]">
                    Se criou um novo projeto Supabase, clique no botão <strong>"Copiar SQL"</strong> no topo desta aba, acesse o <em>SQL Editor</em> no Supabase e execute o script para criar todas as tabelas e permissões.
                  </p>
                </div>
              </div>
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
      {/* MODAL 4: DETALHES DO PEDIDO & AUDITORIA */}
      {/* ------------------------------------------------------------- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#3A2E1F]/15 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-[#B8623F] uppercase">Detalhes do Pedido</span>
                <h3 className="font-serif font-bold text-xl text-[#3A2E1F]">{selectedOrder.code}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-full hover:bg-black/5 text-[#7E6C58]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-[#FAF7F0] rounded-2xl space-y-1.5 text-xs text-[#554432]">
              <div className="flex justify-between">
                <span>Cliente:</span>
                <span className="font-bold text-[#3A2E1F]">{selectedOrder.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Telefone:</span>
                <span>{selectedOrder.customer_phone}</span>
              </div>
              <div className="flex justify-between">
                <span>Horário Agendado:</span>
                <span className="font-semibold text-[#3A2E1F]">{selectedOrder.scheduled_time}</span>
              </div>
              <div className="flex justify-between">
                <span>Status Atual:</span>
                <span className="font-bold text-[#B8623F]">{selectedOrder.status}</span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-xs text-[#3A2E1F]">Itens</h4>
              <div className="border border-[#3A2E1F]/10 rounded-xl divide-y text-xs">
                {selectedOrder.items.map((it) => (
                  <div key={it.id} className="p-2.5 flex justify-between">
                    <span>{it.quantity}x {it.product_name}</span>
                    <span className="font-bold">R$ {it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit history */}
            {selectedOrder.status_history && (
              <div className="space-y-1.5">
                <h4 className="font-bold text-xs text-[#3A2E1F]">Histórico de Auditoria</h4>
                <div className="space-y-1 text-[11px] text-[#7E6C58]">
                  {selectedOrder.status_history.map((h) => (
                    <div key={h.id} className="p-2 bg-gray-50 rounded-lg flex justify-between">
                      <span>{h.new_status} ({h.changed_by})</span>
                      <span className="text-[10px]">{new Date(h.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
