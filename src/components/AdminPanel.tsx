import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { SUPABASE_FULL_SCHEMA_SQL } from '../lib/schemaSql';
import { dataStore } from '../lib/supabase';
import { orderService } from '../services/orderService';
import {
  Category,
  Coupon,
  DeliveryZone,
  Order,
  OrderStatus,
  Product,
  StoreSettings,
} from '../types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onOrderUpdated: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  orders,
  onOrderUpdated,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<
    'orders' | 'products' | 'coupons' | 'supabase' | 'settings'
  >('orders');

  // Supabase test state
  const [supabaseTest, setSupabaseTest] = useState<{
    tested: boolean;
    loading: boolean;
    connected: boolean;
    message: string;
    url: string;
    hasAnonKey: boolean;
  }>({
    tested: false,
    loading: false,
    connected: false,
    message: '',
    url: 'https://ropgdbgkjghwdxdglchz.supabase.co',
    hasAnonKey: false,
  });

  const [copiedSql, setCopiedSql] = useState(false);

  // Products and categories state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  // Selected order for detailed modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Edit/create product modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Load data
  useEffect(() => {
    const load = async () => {
      const p = await dataStore.getProducts();
      const c = await dataStore.getCategories();
      const cp = await dataStore.getCoupons();
      const z = await dataStore.getDeliveryZones();
      const s = await dataStore.getStoreSettings();
      setProducts(p);
      setCategories(c);
      setCoupons(cp);
      setZones(z);
      setStoreSettings(s);
    };
    load();
  }, [isOpen, onOrderUpdated]);

  const handleTestSupabase = async () => {
    setSupabaseTest((prev) => ({ ...prev, loading: true }));
    const result = await dataStore.testSupabaseConnection();
    setSupabaseTest({
      tested: true,
      loading: false,
      connected: result.connected,
      message: result.message,
      url: result.url,
      hasAnonKey: result.hasAnonKey,
    });
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

  // Quick stats calculation
  const totalRevenue = orders
    .filter((o) => o.payment_status === 'APPROVED')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingCount = orders.filter((o) => o.status === 'PENDING_PAYMENT').length;
  const preparingCount = orders.filter((o) => o.status === 'PREPARING').length;
  const confirmedCount = orders.filter((o) => o.status === 'CONFIRMED').length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#FFFFFF] border border-[#3A2E1F]/15 rounded-3xl max-w-6xl w-full h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-[#FAF7F0] px-5 py-4 border-b border-[#3A2E1F]/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#B8623F] text-white flex items-center justify-center font-serif font-bold text-xl">
              A
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-[#3A2E1F]">Painel de Gestão da Padaria</h2>
              <div className="flex items-center gap-2 text-xs text-[#7E6C58]">
                <span>Affeto Pães • Produção & Pedidos</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-[11px] font-mono">Supabase: ropgdbgkjghwdxdglchz</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5 text-[#7E6C58]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-[#3A2E1F]/10 px-5 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3.5 border-b-2 font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'border-[#B8623F] text-[#B8623F]'
                : 'border-transparent text-[#7E6C58] hover:text-[#3A2E1F]'
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>Kanban de Pedidos ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 px-3.5 border-b-2 font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'products'
                ? 'border-[#B8623F] text-[#B8623F]'
                : 'border-transparent text-[#7E6C58] hover:text-[#3A2E1F]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Catálogo & Estoque ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`py-3 px-3.5 border-b-2 font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'coupons'
                ? 'border-[#B8623F] text-[#B8623F]'
                : 'border-transparent text-[#7E6C58] hover:text-[#3A2E1F]'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Cupons & Taxas de Entrega</span>
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            className={`py-3 px-3.5 border-b-2 font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'supabase'
                ? 'border-[#B8623F] text-[#B8623F]'
                : 'border-transparent text-[#7E6C58] hover:text-[#3A2E1F]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Supabase & SQL DDL</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3.5 border-b-2 font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#B8623F] text-[#B8623F]'
                : 'border-transparent text-[#7E6C58] hover:text-[#3A2E1F]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações da Loja</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAF7F0]/40">
          {/* TAB 1: KANBAN DE PEDIDOS */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {/* Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-[#3A2E1F]/10 shadow-2xs">
                  <span className="text-[11px] text-[#7E6C58]">Receita Aprovada</span>
                  <span className="block font-serif font-bold text-xl text-[#3A2E1F] mt-0.5">
                    R$ {totalRevenue.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-[#3A2E1F]/10 shadow-2xs">
                  <span className="text-[11px] text-[#7E6C58]">Aguardando Pagamento</span>
                  <span className="block font-serif font-bold text-xl text-amber-600 mt-0.5">
                    {pendingCount}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-[#3A2E1F]/10 shadow-2xs">
                  <span className="text-[11px] text-[#7E6C58]">Na Fornada / Preparo</span>
                  <span className="block font-serif font-bold text-xl text-[#B8623F] mt-0.5">
                    {preparingCount}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-[#3A2E1F]/10 shadow-2xs">
                  <span className="text-[11px] text-[#7E6C58]">Total de Pedidos</span>
                  <span className="block font-serif font-bold text-xl text-[#3A2E1F] mt-0.5">
                    {orders.length}
                  </span>
                </div>
              </div>

              {/* Kanban Columns */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                {/* Column 1: Pendentes de Pagamento */}
                <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-3.5 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-black/5">
                    <span className="font-bold text-xs text-[#3A2E1F] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Aguardando PIX/Cartão
                    </span>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      {orders.filter((o) => o.status === 'PENDING_PAYMENT').length}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                    {orders
                      .filter((o) => o.status === 'PENDING_PAYMENT')
                      .map((o) => (
                        <div
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          className="p-3 rounded-xl border border-black/10 hover:border-[#B8623F] bg-[#FAF7F0]/60 cursor-pointer transition-all space-y-2 text-xs"
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-mono font-bold text-[#3A2E1F]">{o.code}</span>
                            <span className="font-bold text-[#B8623F]">R$ {o.total.toFixed(2)}</span>
                          </div>
                          <p className="font-semibold text-[#3A2E1F] truncate">{o.customer_name}</p>
                          <span className="text-[10px] text-[#7E6C58] block">
                            {o.items.length} itens • {o.delivery_type === 'DELIVERY' ? 'Entrega' : 'Retirada'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdvanceStatus(o, 'CONFIRMED', 'Aprovado manualmente pelo Atendente');
                            }}
                            className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                          >
                            Confirmar Pagamento
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Column 2: Confirmados / Fila de Produção */}
                <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-3.5 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-black/5">
                    <span className="font-bold text-xs text-[#3A2E1F] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Confirmados (Fila)
                    </span>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      {orders.filter((o) => o.status === 'CONFIRMED').length}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                    {orders
                      .filter((o) => o.status === 'CONFIRMED')
                      .map((o) => (
                        <div
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          className="p-3 rounded-xl border border-black/10 hover:border-[#B8623F] bg-blue-50/30 cursor-pointer transition-all space-y-2 text-xs"
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-mono font-bold text-[#3A2E1F]">{o.code}</span>
                            <span className="font-bold text-[#B8623F]">R$ {o.total.toFixed(2)}</span>
                          </div>
                          <p className="font-semibold text-[#3A2E1F] truncate">{o.customer_name}</p>
                          <span className="text-[10px] text-[#7E6C58] block">
                            Fornada: {o.scheduled_time}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdvanceStatus(o, 'PREPARING', 'Pães colocados no forno');
                            }}
                            className="w-full py-1.5 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-lg text-[10px] font-bold"
                          >
                            Iniciar Fornada / Preparo
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Column 3: Na Fornada / Preparo */}
                <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-3.5 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-black/5">
                    <span className="font-bold text-xs text-[#3A2E1F] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      Em Preparo / Fornada
                    </span>
                    <span className="text-[10px] font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                      {orders.filter((o) => o.status === 'PREPARING').length}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                    {orders
                      .filter((o) => o.status === 'PREPARING')
                      .map((o) => (
                        <div
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          className="p-3 rounded-xl border border-black/10 hover:border-[#B8623F] bg-orange-50/40 cursor-pointer transition-all space-y-2 text-xs"
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-mono font-bold text-[#3A2E1F]">{o.code}</span>
                            <span className="font-bold text-[#B8623F]">R$ {o.total.toFixed(2)}</span>
                          </div>
                          <p className="font-semibold text-[#3A2E1F] truncate">{o.customer_name}</p>
                          <div className="flex gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = o.delivery_type === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'READY';
                                handleAdvanceStatus(o, next, 'Pães assados e embalados com sucesso');
                              }}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                            >
                              {o.delivery_type === 'DELIVERY' ? 'Despachar Entrega' : 'Pronto no Balcão'}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Column 4: Prontos / Entregues */}
                <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-3.5 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-black/5">
                    <span className="font-bold text-xs text-[#3A2E1F] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Prontos & Concluídos
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      {
                        orders.filter(
                          (o) =>
                            o.status === 'READY' ||
                            o.status === 'OUT_FOR_DELIVERY' ||
                            o.status === 'DELIVERED' ||
                            o.status === 'PICKED_UP'
                        ).length
                      }
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                    {orders
                      .filter(
                        (o) =>
                          o.status === 'READY' ||
                          o.status === 'OUT_FOR_DELIVERY' ||
                          o.status === 'DELIVERED' ||
                          o.status === 'PICKED_UP'
                      )
                      .map((o) => (
                        <div
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          className="p-3 rounded-xl border border-black/10 hover:border-[#B8623F] bg-white cursor-pointer transition-all space-y-2 text-xs"
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-mono font-bold text-[#3A2E1F]">{o.code}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-800">
                              {o.status === 'READY'
                                ? 'Pronto no Balcão'
                                : o.status === 'OUT_FOR_DELIVERY'
                                ? 'Em Trânsito'
                                : 'Finalizado'}
                            </span>
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

          {/* TAB 2: CATÁLOGO & ESTOQUE */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#3A2E1F]">
                    Gerenciamento de Produtos & Estoque
                  </h3>
                  <p className="text-xs text-[#7E6C58]">
                    Ajuste preços, estoque em tempo real e produtos em destaque.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF7F0] border-b border-[#3A2E1F]/10 text-[#7E6C58] uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Produto</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Preço Base</th>
                        <th className="p-3">Preço Promo</th>
                        <th className="p-3">Estoque</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3A2E1F]/10">
                      {products.map((p) => {
                        const cat = categories.find((c) => c.id === p.category_id);
                        return (
                          <tr key={p.id} className="hover:bg-[#FAF7F0]/50">
                            <td className="p-3 flex items-center gap-2.5">
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0"
                              />
                              <div>
                                <span className="font-bold text-[#3A2E1F] block">{p.name}</span>
                                <span className="text-[10px] text-[#7E6C58]">{p.unit}</span>
                              </div>
                            </td>
                            <td className="p-3 text-[#7E6C58]">{cat?.name || '-'}</td>
                            <td className="p-3 font-semibold text-[#3A2E1F]">
                              R$ {p.base_price.toFixed(2)}
                            </td>
                            <td className="p-3 text-[#B8623F]">
                              {p.promotional_price ? `R$ ${p.promotional_price.toFixed(2)}` : '-'}
                            </td>
                            <td className="p-3">
                              <span
                                className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                  p.stock_quantity <= 5
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                {p.stock_quantity} un
                              </span>
                            </td>
                            <td className="p-3">
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
                            <td className="p-3 text-right">
                              <button
                                onClick={() => setEditingProduct(p)}
                                className="p-1.5 rounded-lg text-[#3A2E1F] hover:bg-black/5"
                                title="Editar Produto"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
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

          {/* TAB 3: CUPONS & TAXAS */}
          {activeTab === 'coupons' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cupons */}
              <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-5 space-y-4">
                <h3 className="font-serif font-bold text-base text-[#3A2E1F] flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-[#B8623F]" />
                  <span>Cupons Ativos no Pricing Engine</span>
                </h3>
                <div className="space-y-2.5">
                  {coupons.map((cp) => (
                    <div
                      key={cp.id}
                      className="p-3 rounded-xl border border-[#3A2E1F]/15 bg-[#FAF7F0]/40 flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-sm text-[#3A2E1F] block">
                          {cp.code}
                        </span>
                        <span className="text-[11px] text-[#7E6C58]">{cp.description}</span>
                        <span className="block text-[10px] text-[#554432] mt-0.5">
                          Usos: {cp.usage_count}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#B8623F] text-sm block">
                          {cp.discount_type === 'PERCENTAGE'
                            ? `${cp.discount_value}% OFF`
                            : `R$ ${cp.discount_value.toFixed(2)} OFF`}
                        </span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                          Ativo
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Taxas de Entrega */}
              <div className="bg-white border border-[#3A2E1F]/10 rounded-2xl p-5 space-y-4">
                <h3 className="font-serif font-bold text-base text-[#3A2E1F] flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#B8623F]" />
                  <span>Zonas de Entrega & Frete</span>
                </h3>
                <div className="space-y-2.5">
                  {zones.map((zn) => (
                    <div
                      key={zn.id}
                      className="p-3 rounded-xl border border-[#3A2E1F]/15 bg-[#FAF7F0]/40 flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#3A2E1F] block">{zn.name}</span>
                        <span className="text-[11px] text-[#7E6C58]">{zn.neighborhood}</span>
                        <span className="text-[10px] text-[#7E6C58] block mt-0.5">
                          Tempo estimado: {zn.estimated_minutes} min
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-serif font-bold text-sm text-[#3A2E1F]">
                          R$ {zn.fee.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SUPABASE & SQL DDL */}
          {activeTab === 'supabase' && (
            <div className="space-y-6">
              {/* Connection Card */}
              <div className="bg-white border border-[#3A2E1F]/15 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-[#B8623F]">
                      Instância Oficial Supabase
                    </span>
                    <h3 className="font-serif font-bold text-xl text-[#3A2E1F]">
                      https://ropgdbgkjghwdxdglchz.supabase.co
                    </h3>
                    <p className="text-xs text-[#7E6C58] mt-1">
                      Destino de persistência remota para Affeto Pães com PostgreSQL, Auth e Storage.
                    </p>
                  </div>

                  <button
                    id="btn-testar-conexao-supabase"
                    onClick={handleTestSupabase}
                    disabled={supabaseTest.loading}
                    className="px-5 py-2.5 bg-[#3A2E1F] hover:bg-[#554432] text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                  >
                    {supabaseTest.loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Database className="w-3.5 h-3.5" />
                    )}
                    <span>Testar Conexão Supabase</span>
                  </button>
                </div>

                {supabaseTest.tested && (
                  <div
                    className={`p-4 rounded-xl text-xs space-y-1 ${
                      supabaseTest.connected
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {supabaseTest.connected ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      <span>
                        {supabaseTest.connected ? 'Conexão Estabelecida com Sucesso' : 'Diagnóstico de Conexão'}
                      </span>
                    </div>
                    <p>{supabaseTest.message}</p>
                  </div>
                )}
              </div>

              {/* SQL Migration Script Export Card */}
              <div className="bg-white border border-[#3A2E1F]/15 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-base text-[#3A2E1F]">
                      Script DDL Completo PostgreSQL / Supabase
                    </h4>
                    <p className="text-xs text-[#7E6C58]">
                      Criação de todas as 30 tabelas da especificação técnica, tipos enums, triggers e RLS policies.
                    </p>
                  </div>
                  <button
                    id="btn-copiar-sql-supabase"
                    onClick={handleCopySql}
                    className="px-4 py-2 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Script SQL Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar SQL para Supabase</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <pre className="bg-[#1E1B18] text-[#E0CFA0] p-4 rounded-xl text-xs font-mono max-h-80 overflow-y-auto leading-relaxed border border-black/20">
                    {SUPABASE_FULL_SCHEMA_SQL}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CONFIGURAÇÕES DA LOJA */}
          {activeTab === 'settings' && storeSettings && (
            <div className="bg-white border border-[#3A2E1F]/15 rounded-2xl p-6 max-w-2xl space-y-4 shadow-2xs">
              <h3 className="font-serif font-bold text-lg text-[#3A2E1F]">
                Informações da Padaria & Atendimento
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Nome Comercial</label>
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
                  <label className="block font-semibold text-[#554432] mb-1">Chave PIX Oficial</label>
                  <input
                    type="text"
                    value={storeSettings.pix_key}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, pix_key: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#554432] mb-1">Endereço da Loja</label>
                  <input
                    type="text"
                    value={storeSettings.address}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, address: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#554432] mb-1">WhatsApp de Contato</label>
                  <input
                    type="text"
                    value={storeSettings.whatsapp}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, whatsapp: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Tempo Médio de Preparo (min)</label>
                  <input
                    type="number"
                    value={storeSettings.lead_time_minutes}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, lead_time_minutes: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20 bg-[#FAF7F0]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    dataStore.saveStoreSettings(storeSettings);
                    alert('Configurações salvas com sucesso!');
                  }}
                  className="px-5 py-2.5 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ORDER DETAILS MODAL (AUDIT & ITEMS) */}
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

        {/* EDIT PRODUCT MODAL */}
        {editingProduct && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white border border-[#3A2E1F]/15 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-serif font-bold text-lg text-[#3A2E1F]">Editar Produto</h3>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="p-1 rounded-full hover:bg-black/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#554432] mb-1">Nome do Produto</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, name: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#3A2E1F]/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                    <label className="block font-semibold text-[#554432] mb-1">Estoque</label>
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

                <div className="flex items-center gap-3 pt-2">
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
                    <span>Produto Ativo no Cardápio</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-gray-100 text-[#3A2E1F] rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await dataStore.saveProducts(
                      products.map((p) => (p.id === editingProduct.id ? editingProduct : p))
                    );
                    setProducts(await dataStore.getProducts());
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 bg-[#B8623F] text-white rounded-xl text-xs font-semibold"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
