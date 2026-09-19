import React, { useState } from 'react';
import {
  Search,
  Filter,
  X,
  Calendar,
  Truck,
  Store,
  DollarSign,
  Package,
  Layers,
  ArrowUpDown,
  Check,
  ChevronDown,
} from 'lucide-react';
import { Product } from '../../types';
import {
  OrderFilterState,
  OrderSortOption,
  OperationalStage,
} from '../../utils/orderManagementUtils';

interface OrderFiltersProps {
  filters: OrderFilterState;
  onFilterChange: (filters: OrderFilterState) => void;
  onResetFilters: () => void;
  sortOption: OrderSortOption;
  onSortChange: (sort: OrderSortOption) => void;
  viewMode: 'kanban' | 'list';
  onViewModeChange: (mode: 'kanban' | 'list') => void;
  availableProducts: Product[];
  availableLocations: string[];
  availableCustomers: string[];
  totalOrdersCount: number;
  filteredOrdersCount: number;
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
  availableProducts,
  availableLocations,
  availableCustomers,
  totalOrdersCount,
  filteredOrdersCount,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calcula quantos filtros ativos
  let activeFilterCount = 0;
  if (filters.search) activeFilterCount++;
  if (filters.operationalStage !== 'TODOS') activeFilterCount++;
  if (filters.paymentStatus !== 'TODOS') activeFilterCount++;
  if (filters.dateFilter !== 'TODOS') activeFilterCount++;
  if (filters.deliveryType !== 'TODOS') activeFilterCount++;
  if (filters.location && filters.location !== 'TODOS') activeFilterCount++;
  if (filters.customerName && filters.customerName !== 'TODOS') activeFilterCount++;
  if (filters.productId && filters.productId !== 'TODOS') activeFilterCount++;

  return (
    <div className="bg-white border border-[#3A2E1F]/15 rounded-2xl p-4 shadow-xs space-y-3 text-xs">
      {/* 1. BARRA SUPERIOR: BUSCA RÁPIDA + BOTÕES DE VISUALIZAÇÃO E ORDENAÇÃO */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Campo de Busca Universal */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7E6C58] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="input-busca-pedidos"
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            placeholder="Buscar por nº, cliente, telefone, endereço, produto ou observação..."
            className="w-full pl-9 pr-8 py-2.5 bg-[#FAF7F0] border border-[#3A2E1F]/15 rounded-xl text-xs text-[#3A2E1F] placeholder:text-[#7E6C58] focus:outline-none focus:border-[#B8623F] focus:bg-white transition-all"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ ...filters, search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7E6C58] hover:text-[#3A2E1F] p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Controles da Direita: Ordenação e Toggle Kanban / Lista */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Ordenação */}
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as OrderSortOption)}
              className="bg-[#FAF7F0] border border-[#3A2E1F]/15 rounded-xl px-3 py-2 text-xs font-semibold text-[#3A2E1F] focus:outline-none focus:border-[#B8623F] cursor-pointer"
            >
              <option value="DELIVERY_DATE_ASC">📅 Data de Entrega (Mais Próxima)</option>
              <option value="DELIVERY_DATE_DESC">📅 Data de Entrega (Mais Distante)</option>
              <option value="OPERATIONAL_PRIORITY">⚡ Prioridade Operacional</option>
              <option value="ORDER_DATE_DESC">🕒 Pedido Mais Recente</option>
              <option value="TOTAL_DESC">💰 Maior Valor</option>
            </select>
          </div>

          {/* Toggle Modo Kanban / Lista */}
          <div className="bg-[#FAF7F0] p-1 border border-[#3A2E1F]/15 rounded-xl flex items-center">
            <button
              type="button"
              onClick={() => onViewModeChange('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-[#B8623F] shadow-xs'
                  : 'text-[#7E6C58] hover:text-[#3A2E1F]'
              }`}
            >
              Kanban
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-[#B8623F] shadow-xs'
                  : 'text-[#7E6C58] hover:text-[#3A2E1F]'
              }`}
            >
              Lista
            </button>
          </div>

          {/* Botão de Filtros Avançados */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 font-semibold text-xs cursor-pointer transition-all ${
              activeFilterCount > 0 || showAdvanced
                ? 'bg-[#FAF7F0] border-[#B8623F] text-[#B8623F]'
                : 'border-[#3A2E1F]/15 text-[#554432] hover:bg-[#FAF7F0]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
            {activeFilterCount > 0 && (
              <span className="bg-[#B8623F] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. BARRA DE ATALHOS RÁPIDOS DE DATA (HOJE, AMANHÃ, PRÓXIMOS DIAS) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-bold text-[#7E6C58] shrink-0 mr-1 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-[#B8623F]" />
          <span>Entrega:</span>
        </span>

        {[
          { key: 'TODOS', label: 'Todas as Datas' },
          { key: 'HOJE', label: '🔥 HOJE' },
          { key: 'AMANHA', label: '⚡ AMANHÃ' },
          { key: 'PROXIMOS_7_DIAS', label: 'Próximos 7 Dias' },
          { key: 'PROXIMA_SEMANA', label: 'Próxima Semana' },
          { key: 'ESTE_MES', label: 'Este Mês' },
        ].map((item) => {
          const isSelected = filters.dateFilter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                onFilterChange({
                  ...filters,
                  dateFilter: isSelected && item.key !== 'TODOS' ? 'TODOS' : (item.key as any),
                })
              }
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap cursor-pointer transition-all border ${
                isSelected
                  ? 'bg-[#B8623F] text-white border-[#B8623F] shadow-xs'
                  : 'bg-[#FAF7F0] text-[#554432] border-[#3A2E1F]/10 hover:border-[#B8623F]/40'
              }`}
            >
              {item.label}
            </button>
          );
        })}

        {/* Separador */}
        <div className="h-4 w-px bg-stone-300 mx-1 shrink-0" />

        {/* Atalhos Rápidos de Tipo de Entrega */}
        {[
          { key: 'TODOS', label: 'Todos' },
          { key: 'DELIVERY', label: '🚚 Entrega' },
          { key: 'PICKUP', label: '🏬 Retirada' },
        ].map((item) => {
          const isSelected = filters.deliveryType === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                onFilterChange({
                  ...filters,
                  deliveryType: isSelected && item.key !== 'TODOS' ? 'TODOS' : (item.key as any),
                })
              }
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] whitespace-nowrap cursor-pointer transition-all border ${
                isSelected
                  ? 'bg-stone-800 text-white border-stone-800 shadow-xs'
                  : 'bg-[#FAF7F0] text-[#554432] border-[#3A2E1F]/10 hover:border-[#3A2E1F]/30'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* 3. PAINEL DE FILTROS AVANÇADOS COMBINÁVEIS (EXPANSÍVEL) */}
      {showAdvanced && (
        <div className="pt-3 border-t border-[#3A2E1F]/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#FAF7F0]/50 p-3 rounded-xl">
          {/* Filtro: Estágio Operacional */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#7E6C58] uppercase">Estágio Operacional</label>
            <select
              value={filters.operationalStage}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  operationalStage: e.target.value as OperationalStage | 'TODOS',
                })
              }
              className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-2.5 py-1.5 text-xs text-[#3A2E1F] font-medium focus:outline-none focus:border-[#B8623F]"
            >
              <option value="TODOS">Todos os estágios</option>
              <option value="AGUARDANDO_PREPARO">Aguardando preparo</option>
              <option value="EM_PREPARO">Em preparo</option>
              <option value="PRONTO">Pronto</option>
              <option value="EM_ROTA">Em rota</option>
              <option value="ENTREGUE">Entregue</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          {/* Filtro: Pagamento */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#7E6C58] uppercase">Pagamento</label>
            <select
              value={filters.paymentStatus}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  paymentStatus: e.target.value as any,
                })
              }
              className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-2.5 py-1.5 text-xs text-[#3A2E1F] font-medium focus:outline-none focus:border-[#B8623F]"
            >
              <option value="TODOS">Todos os status</option>
              <option value="APPROVED">🟢 Pago / Aprovado</option>
              <option value="PENDING">🟠 Pendente</option>
              <option value="CASH_ON_DELIVERY">💰 Pagamento na Entrega</option>
              <option value="CANCELLED">🔴 Cancelado</option>
              <option value="REFUNDED">⚪ Estornado</option>
            </select>
          </div>

          {/* Filtro: Localização / Bairro */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#7E6C58] uppercase">Bairro / Local</label>
            <select
              value={filters.location}
              onChange={(e) => onFilterChange({ ...filters, location: e.target.value })}
              className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-2.5 py-1.5 text-xs text-[#3A2E1F] font-medium focus:outline-none focus:border-[#B8623F]"
            >
              <option value="TODOS">Todos os locais</option>
              {availableLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro: Produto específico */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#7E6C58] uppercase">Produto no Pedido</label>
            <select
              value={filters.productId}
              onChange={(e) => onFilterChange({ ...filters, productId: e.target.value })}
              className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-2.5 py-1.5 text-xs text-[#3A2E1F] font-medium focus:outline-none focus:border-[#B8623F]"
            >
              <option value="TODOS">Todos os produtos</option>
              {availableProducts.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Customizado de Data caso selecionado */}
          {filters.dateFilter === 'CUSTOM' && (
            <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-bold text-[#7E6C58] block">Data Inicial</label>
                <input
                  type="date"
                  value={filters.customDateStart || ''}
                  onChange={(e) =>
                    onFilterChange({ ...filters, customDateStart: e.target.value })
                  }
                  className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-2.5 py-1.5 text-xs text-[#3A2E1F]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#7E6C58] block">Data Final</label>
                <input
                  type="date"
                  value={filters.customDateEnd || ''}
                  onChange={(e) =>
                    onFilterChange({ ...filters, customDateEnd: e.target.value })
                  }
                  className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-2.5 py-1.5 text-xs text-[#3A2E1F]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. RODAPÉ DE RESUMO: CONTAGEM DE PEDIDOS FILTRADOS E LIMPAR FILTROS */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#3A2E1F]/5">
        <div className="text-[#7E6C58]">
          Mostrando <strong className="text-[#3A2E1F]">{filteredOrdersCount}</strong> de{' '}
          <strong>{totalOrdersCount}</strong> pedidos
          {activeFilterCount > 0 && <span className="text-[#B8623F] font-semibold"> (filtros aplicados)</span>}
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs text-[#B8623F] hover:text-[#994E30] font-bold flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpar todos os filtros</span>
          </button>
        )}
      </div>
    </div>
  );
};
