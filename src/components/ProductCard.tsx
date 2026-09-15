import React from 'react';
import { Heart, Plus, Check, AlertCircle, Sparkles } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  isInCart?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorite,
  onToggleFavorite,
  onSelectProduct,
  onQuickAdd,
  isInCart,
}) => {
  const hasPromo = product.promotional_price && product.promotional_price > 0 && product.promotional_price < product.base_price;
  const currentPrice = hasPromo ? product.promotional_price! : product.base_price;
  const hasOptions = product.options && product.options.length > 0;
  const isOutOfStock = product.track_stock && product.stock_quantity <= 0;

  return (
    <div
      id={`card-produto-${product.id}`}
      className="bg-[#FFFFFF] border border-[#3A2E1F]/15 rounded-2xl overflow-hidden hover:border-[#B7A05E]/60 transition-all duration-300 flex flex-col group shadow-xs hover:shadow-md"
    >
      {/* Product Image Area */}
      <div className="relative aspect-4/3 w-full bg-[#FAF7F0] overflow-hidden cursor-pointer" onClick={() => onSelectProduct(product)}>
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {hasPromo && (
            <span className="bg-[#B8623F] text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs">
              Oferta
            </span>
          )}
          {product.is_featured && !hasPromo && (
            <span className="bg-[#B7A05E] text-[#3A2E1F] text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Destaque
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          id={`btn-fav-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer ${
            isFavorite
              ? 'bg-[#B8623F] text-white'
              : 'bg-white/80 hover:bg-white text-[#3A2E1F]'
          }`}
          title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Stock / Warning notice */}
        {product.track_stock && product.stock_quantity > 0 && product.stock_quantity <= 5 && (
          <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] py-1 px-2 rounded-lg flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-[#EADBBA]" />
            <span>Apenas {product.stock_quantity} unidades restantes</span>
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center text-white font-bold text-sm">
            Esgotado por hoje
          </div>
        )}
      </div>

      {/* Product Content Details */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {product.tags.slice(0, 2).map((t, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-medium text-[#7E6C58] bg-[#FAF7F0] px-2 py-0.5 rounded-md border border-[#3A2E1F]/10"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h3
            onClick={() => onSelectProduct(product)}
            className="font-serif font-bold text-base sm:text-lg text-[#3A2E1F] leading-snug hover:text-[#B8623F] cursor-pointer transition-colors"
          >
            {product.name}
          </h3>

          {/* Description */}
          <p className="text-xs text-[#7E6C58] mt-1.5 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price & Action Row */}
        <div className="mt-4 pt-3 border-t border-[#3A2E1F]/10 flex items-center justify-between gap-2">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-[#7E6C58]">
              {product.unit}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif font-bold text-lg sm:text-xl text-[#3A2E1F]">
                R$ {currentPrice.toFixed(2).replace('.', ',')}
              </span>
              {hasPromo && (
                <span className="text-xs text-[#7E6C58] line-through">
                  R$ {product.base_price.toFixed(2).replace('.', ',')}
                </span>
              )}
            </div>
          </div>

          <div>
            {isOutOfStock ? (
              <button
                disabled
                className="px-3 py-2 bg-gray-200 text-gray-500 rounded-xl text-xs font-semibold cursor-not-allowed"
              >
                Esgotado
              </button>
            ) : hasOptions ? (
              <button
                id={`btn-opcoes-${product.id}`}
                onClick={() => onSelectProduct(product)}
                className="px-3.5 py-2 bg-[#F3ECDD] hover:bg-[#E6DCB8] text-[#3A2E1F] border border-[#3A2E1F]/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Personalizar</span>
              </button>
            ) : (
              <button
                id={`btn-adicionar-${product.id}`}
                onClick={() => onQuickAdd(product)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  isInCart
                    ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                    : 'bg-[#B8623F] hover:bg-[#994E30] text-white hover:shadow-xs'
                }`}
              >
                {isInCart ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Adicionado</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
