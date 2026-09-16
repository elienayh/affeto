import React from 'react';
import { Category } from '../types';
import { Sparkles, UtensilsCrossed, Coffee, Cookie, Cake, Gift, Flame } from 'lucide-react';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  productsCounts?: Record<string, number>;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  productsCounts = {},
}) => {
  const getCategoryIcon = (slug: string) => {
    if (slug.includes('paes')) return <Flame className="w-4 h-4" />;
    if (slug.includes('croissant') || slug.includes('folhado')) return <UtensilsCrossed className="w-4 h-4" />;
    if (slug.includes('bolo') || slug.includes('doce')) return <Cake className="w-4 h-4" />;
    if (slug.includes('salgado') || slug.includes('quiche')) return <Cookie className="w-4 h-4" />;
    if (slug.includes('cafe') || slug.includes('bebida')) return <Coffee className="w-4 h-4" />;
    if (slug.includes('cesta') || slug.includes('combo')) return <Gift className="w-4 h-4" />;
    return <Sparkles className="w-4 h-4" />;
  };

  const totalAll = Object.values(productsCounts).reduce((a: number, b: number) => a + b, 0);

  return (
    <div className="py-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
        {/* All Products pill */}
        <button
          id="cat-pill-all"
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer shadow-2xs ${
            selectedCategoryId === 'all'
              ? 'bg-[#3A2E1F] text-[#F3ECDD] shadow-xs'
              : 'bg-[#FFFFFF] text-[#554432] hover:bg-[#FAF7F0] border border-[#3A2E1F]/15'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Todos os Itens</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              selectedCategoryId === 'all' ? 'bg-[#F3ECDD]/20 text-white' : 'bg-[#3A2E1F]/10 text-[#7E6C58]'
            }`}
          >
            {totalAll}
          </span>
        </button>

        {/* Category list pills */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const count = productsCounts[cat.id] || 0;

          return (
            <button
              key={cat.id}
              id={`cat-pill-${cat.slug}`}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer shadow-2xs ${
                isSelected
                  ? 'bg-[#3A2E1F] text-[#F3ECDD] shadow-xs'
                  : 'bg-[#FFFFFF] text-[#554432] hover:bg-[#FAF7F0] border border-[#3A2E1F]/15'
              }`}
            >
              <span className={isSelected ? 'text-[#B7A05E]' : 'text-[#B8623F]'}>
                {getCategoryIcon(cat.slug)}
              </span>
              <span>{cat.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isSelected ? 'bg-[#F3ECDD]/20 text-white' : 'bg-[#3A2E1F]/10 text-[#7E6C58]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
