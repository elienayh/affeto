import React, { useState } from 'react';
import {
  ShoppingBag,
  Heart,
  Search,
  Clock,
  MapPin,
  Menu,
  X,
  Phone,
  HelpCircle,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { StoreSettings } from '../types';

interface HeaderProps {
  cartCount: number;
  favoritesCount: number;
  onOpenCart: () => void;
  onOpenFavorites: () => void;
  onOpenOrderLookup: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  storeSettings?: StoreSettings;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  favoritesCount,
  onOpenCart,
  onOpenFavorites,
  onOpenOrderLookup,
  searchQuery,
  onSearchChange,
  storeSettings,
}) => {
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayCityState =
    storeSettings?.city && storeSettings?.state
      ? `${storeSettings.city}-${storeSettings.state}`
      : storeSettings?.address || 'Espera Feliz-MG';
  const pickupAddress =
    storeSettings?.pickup_address ||
    storeSettings?.address ||
    'Rua Principal, 100 - Centro, Espera Feliz - MG';
  const openingHours = storeSettings?.opening_hours || [];

  return (
    <>
      {/* Top utility notification bar */}
      <header className="w-full bg-[#F3ECDD] border-b border-[#3A2E1F]/10 shadow-xs">
        <div className="bg-[#3A2E1F] text-[#F3ECDD] text-xs py-1.5 px-4">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-medium tracking-wide text-[11px] sm:text-xs">
                {displayCityState}
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 text-xs">
              <button
                id="btn-ver-horarios-top"
                onClick={() => setShowHoursModal(true)}
                className="hover:text-[#B7A05E] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Horários &</span> Retirada
              </button>
              <button
                id="btn-rastrear-pedido-top"
                onClick={onOpenOrderLookup}
                className="hover:text-[#B7A05E] transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Rastrear</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between gap-4">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3">
              <a href="#" className="flex items-center gap-3 group">
                {storeSettings?.logo_url ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#B8623F]/50 shadow-xs bg-[#FAF7F0] flex items-center justify-center shrink-0">
                    <img
                      src={storeSettings.logo_url}
                      alt={storeSettings.name || 'Affeto Pães'}
                      className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full border-2 border-[#B8623F]/50 p-0.5 shadow-xs flex items-center justify-center shrink-0 bg-[#FAF7F0]">
                    <div className="w-full h-full bg-[#F3ECDD] rounded-full flex items-center justify-center">
                      <span className="font-serif font-bold text-2xl text-[#3A2E1F] group-hover:scale-105 transition-transform">
                        {storeSettings?.name ? storeSettings.name.charAt(0).toUpperCase() : 'A'}
                      </span>
                    </div>
                  </div>
                )}
                <div>
                  <span className="block font-serif font-bold text-2xl tracking-tight text-[#3A2E1F]">
                    {storeSettings?.name || 'Affeto'}
                  </span>
                  <span className="block text-[11px] uppercase tracking-widest text-[#7E6C58] font-semibold -mt-1">
                    {storeSettings?.city ? `${storeSettings.city} - ${storeSettings.state || 'MG'}` : 'Pães Artesanais'}
                  </span>
                </div>
              </a>
            </div>

            {/* Search Input on Desktop */}
            <div className="hidden md:flex flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7E6C58]" />
                <input
                  id="input-busca-desktop"
                  type="text"
                  placeholder="Buscar pão sourdough, croissant, quiche..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-[#FFFFFF] border border-[#3A2E1F]/15 rounded-full text-[#3A2E1F] placeholder:text-[#7E6C58]/70 focus:outline-none focus:ring-2 focus:ring-[#B8623F] focus:border-transparent transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7E6C58] hover:text-[#3A2E1F]"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Actions / Right navigation */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Favorites Button */}
              <button
                id="btn-header-favoritos"
                onClick={onOpenFavorites}
                className="relative p-2.5 text-[#3A2E1F] hover:bg-[#E6DCB8]/50 rounded-xl transition-colors cursor-pointer"
                title="Ver Favoritos"
              >
                <Heart className="w-5 h-5 text-[#3A2E1F]" />
                {favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#B8623F] text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {favoritesCount}
                  </span>
                )}
              </button>

              {/* Cart Button with Count Badge */}
              <button
                id="btn-header-carrinho"
                onClick={onOpenCart}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md font-medium text-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Cesta</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                  {cartCount}
                </span>
              </button>

              {/* Mobile menu toggle */}
              <button
                id="btn-mobile-menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-[#3A2E1F] md:hidden hover:bg-[#E6DCB8]/40 rounded-xl"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Search input */}
          <div className="mt-3 md:hidden">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7E6C58]" />
              <input
                id="input-busca-mobile"
                type="text"
                placeholder="Buscar pães, doces, cafés..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-[#FFFFFF] border border-[#3A2E1F]/15 rounded-full text-[#3A2E1F] placeholder:text-[#7E6C58]/70 focus:outline-none focus:ring-2 focus:ring-[#B8623F]"
              />
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#3A2E1F]/10 bg-[#F3ECDD] px-4 py-3 space-y-2 text-sm">
            <button
              onClick={() => {
                onOpenOrderLookup();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 py-2 px-3 rounded-lg text-[#3A2E1F] hover:bg-[#E6DCB8]/50 text-left font-medium"
            >
              <Search className="w-4 h-4 text-[#B8623F]" />
              <span>Consultar Meus Pedidos</span>
            </button>
            <button
              onClick={() => {
                setShowHoursModal(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 py-2 px-3 rounded-lg text-[#3A2E1F] hover:bg-[#E6DCB8]/50 text-left font-medium"
            >
              <Clock className="w-4 h-4 text-[#B8623F]" />
              <span>Horários & Fornadas</span>
            </button>
          </div>
        )}
      </header>

      {/* Store Location & Hours Modal */}
      {showHoursModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#FFFFFF] border border-[#3A2E1F]/15 rounded-2xl max-w-md w-full p-6 shadow-xl relative">
            <button
              onClick={() => setShowHoursModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5 text-[#7E6C58]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#B8623F]/10 flex items-center justify-center text-[#B8623F]">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#3A2E1F]">{storeSettings?.name || 'Affeto Pães Artesanais'}</h3>
                <p className="text-xs text-[#7E6C58]">{pickupAddress}</p>
              </div>
            </div>

            <div className="space-y-2 mb-5 border-t border-[#3A2E1F]/10 pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#7E6C58] mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Horários das Fornadas & Atendimento
              </h4>
              <div className="text-xs space-y-1.5">
                {openingHours.map((oh, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-black/5 last:border-0">
                    <span className="font-medium text-[#3A2E1F]">{oh.day}</span>
                    <span className="text-[#7E6C58]">
                      {oh.is_closed ? 'Fechado' : `${oh.open} às ${oh.close}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#F3ECDD]/60 p-3 rounded-xl text-xs space-y-1 text-[#554432] mb-5">
              <p className="font-semibold text-[#3A2E1F]">🥖 Política de Frescor:</p>
              <p>Trabalhamos com fermentação natural lenta (36h). Para grandes encomendas, reserve com pelo menos 24h de antecedência.</p>
            </div>

            <button
              onClick={() => setShowHoursModal(false)}
              className="w-full py-2.5 bg-[#3A2E1F] text-[#F3ECDD] rounded-xl font-medium text-sm hover:bg-[#554432] transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
