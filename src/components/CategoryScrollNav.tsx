import React from 'react';
import { Category } from '../types';

interface CategoryScrollNavProps {
  categories: Category[];
  activeCategoryId?: string;
  onSelectCategory?: (categoryId: string) => void;
  productsCounts?: Record<string, number>;
}

export const CategoryScrollNav: React.FC<CategoryScrollNavProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
  productsCounts = {},
}) => {
  const handleCategoryClick = (catId: string) => {
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
    const targetElement = document.getElementById(`secao-categoria-${catId}`);
    if (targetElement) {
      const headerOffset = 24;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <nav
      id="navegacao-categorias-scroll"
      className="w-full bg-[#F3ECDD] py-3 border-b border-[#3A2E1F]/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {categories
            .filter((c) => c.active)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((cat) => {
              const count = productsCounts[cat.id] || 0;
              const isActive = activeCategoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  id={`btn-nav-categoria-${cat.id}`}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-[#B8623F] text-white shadow-xs'
                      : 'bg-white hover:bg-[#EADBBA]/60 text-[#3A2E1F] border border-[#3A2E1F]/15 hover:border-[#B8623F]/40'
                  }`}
                >
                  <span>{cat.name}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-white/25 text-white' : 'bg-[#FAF7F0] text-[#7E6C58]'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </nav>
  );
};
