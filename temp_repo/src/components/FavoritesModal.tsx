import React from 'react';
import { X, Heart, Trash2, Plus, ShoppingBag } from 'lucide-react';
import { Product } from '../types';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: Product[];
  onRemoveFavorite: (id: string) => void;
  onQuickAdd: (product: Product) => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
  onQuickAdd,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white border border-[#3A2E1F]/15 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative my-auto p-6 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-2 border-b border-[#3A2E1F]/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#B8623F]/10 text-[#B8623F] flex items-center justify-center">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <h3 className="font-serif font-bold text-xl text-[#3A2E1F]">Seus Pães Favoritos</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-[#7E6C58]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {favorites.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#7E6C58]">
            <Heart className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p>Você ainda não favoritou nenhum produto.</p>
            <p className="mt-1">Toque no ícone de coração nos produtos para salvar aqui!</p>
          </div>
        ) : (
          <div className="overflow-y-auto divide-y divide-[#3A2E1F]/10 flex-1 pr-1">
            {favorites.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-12 h-12 rounded-xl object-cover bg-gray-100 shrink-0"
                  />
                  <div>
                    <h4 className="font-bold text-xs text-[#3A2E1F]">{p.name}</h4>
                    <span className="font-serif font-bold text-xs text-[#B8623F]">
                      R$ {p.base_price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onQuickAdd(p)}
                    className="px-3 py-1.5 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                  <button
                    onClick={() => onRemoveFavorite(p.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
