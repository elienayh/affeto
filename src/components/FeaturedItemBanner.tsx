import React from 'react';
import { Sparkles, Plus, Check, Calendar, ArrowRight } from 'lucide-react';
import { getNextAvailableBatch } from '../lib/batchScheduler';
import { Order, Product } from '../types';

interface FeaturedItemBannerProps {
  product: Product;
  orders?: Order[];
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  isInCart?: boolean;
}

export const FeaturedItemBanner: React.FC<FeaturedItemBannerProps> = ({
  product,
  orders = [],
  onSelectProduct,
  onQuickAdd,
  isInCart,
}) => {
  const hasPromo =
    product.promotional_price &&
    product.promotional_price > 0 &&
    product.promotional_price < product.base_price;
  const currentPrice = hasPromo ? product.promotional_price! : product.base_price;

  const nextBatch = product.schedule_config?.is_scheduled_only
    ? getNextAvailableBatch(product, orders)
    : null;

  return (
    <section id="item-em-destaque" className="my-6">
      <div className="bg-gradient-to-br from-[#FAF7F0] via-[#F3ECDD] to-[#EADBBA]/60 border border-[#B7A05E]/30 rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
          {/* Visual Container */}
          <div
            className="w-full md:w-5/12 aspect-4/3 sm:aspect-16/10 rounded-2xl overflow-hidden relative shadow-md bg-[#FAF7F0] cursor-pointer group"
            onClick={() => onSelectProduct(product)}
          >
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-3 left-3 bg-[#B8623F] text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Destaque Especial da Casa</span>
            </div>
          </div>

          {/* Product Details */}
          <div className="w-full md:w-7/12 space-y-3.5 flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-[#7E6C58] font-bold">
                {product.unit}
              </span>
              {product.tags?.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-medium text-[#3A2E1F] bg-white/70 px-2.5 py-0.5 rounded-md border border-[#3A2E1F]/10"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h2
              onClick={() => onSelectProduct(product)}
              className="font-serif font-bold text-2xl sm:text-3xl text-[#3A2E1F] hover:text-[#B8623F] transition-colors cursor-pointer leading-tight"
            >
              {product.name}
            </h2>

            <p className="text-[#554432] text-xs sm:text-sm leading-relaxed max-w-xl">
              {product.description}
            </p>

            {/* Special batch schedule badge if applicable */}
            {product.schedule_config?.is_scheduled_only && (
              <div className="p-3 bg-white/80 rounded-2xl border border-[#B7A05E]/40 text-xs text-[#3A2E1F] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#B8623F]" />
                  <span className="font-semibold">{product.schedule_config.days_label}</span>
                </div>
                {nextBatch && (
                  <span className="font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                    Próxima saída: {nextBatch.formattedDate} ({nextBatch.remainingSlots} vagas)
                  </span>
                )}
              </div>
            )}

            {/* Price and Add button */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <div className="flex items-baseline gap-2">
                <span className="font-serif font-bold text-2xl sm:text-3xl text-[#3A2E1F]">
                  R$ {currentPrice.toFixed(2).replace('.', ',')}
                </span>
                {hasPromo && (
                  <span className="text-sm text-[#7E6C58] line-through">
                    R$ {product.base_price.toFixed(2).replace('.', ',')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  id="btn-adicionar-destaque"
                  onClick={() => onQuickAdd(product)}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md ${
                    isInCart
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'bg-[#B8623F] hover:bg-[#994E30] text-white'
                  }`}
                >
                  {isInCart ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Adicionado à Cesta</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Adicionar à Cesta</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onSelectProduct(product)}
                  className="px-4 py-2.5 bg-white hover:bg-[#FAF7F0] text-[#3A2E1F] border border-[#3A2E1F]/20 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  Detalhes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
