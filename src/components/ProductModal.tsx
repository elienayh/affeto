import React, { useState, useMemo } from 'react';
import { X, Plus, Minus, Check, Heart, ShieldAlert, ShoppingBag } from 'lucide-react';
import { CartItemOptionSelection, Product } from '../types';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (
    product: Product,
    quantity: number,
    selectedOptions: CartItemOptionSelection[],
    notes: string
  ) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
}) => {
  if (!product) return null;

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  // Map option_id -> value_id
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (product.options) {
      for (const opt of product.options) {
        if (opt.required && opt.values.length > 0) {
          initial[opt.id] = opt.values[0].id;
        }
      }
    }
    return initial;
  });

  const basePrice =
    product.promotional_price && product.promotional_price > 0
      ? product.promotional_price
      : product.base_price;

  // Calculate unit price based on selected options
  const { unitPrice, optionsSelections } = useMemo(() => {
    let modifier = 0;
    const selections: CartItemOptionSelection[] = [];

    if (product.options) {
      for (const opt of product.options) {
        const valId = selectedValues[opt.id];
        if (valId) {
          const val = opt.values.find((v) => v.id === valId);
          if (val) {
            modifier += val.price_modifier;
            selections.push({
              option_id: opt.id,
              option_name: opt.name,
              value_id: val.id,
              value_name: val.name,
              price_modifier: val.price_modifier,
            });
          }
        }
      }
    }

    return {
      unitPrice: basePrice + modifier,
      optionsSelections: selections,
    };
  }, [product, basePrice, selectedValues]);

  const totalPrice = unitPrice * quantity;

  const handleOptionChange = (optionId: string, valueId: string) => {
    setSelectedValues((prev) => ({
      ...prev,
      [optionId]: valueId,
    }));
  };

  const handleConfirm = () => {
    onAddToCart(product, quantity, optionsSelections, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#FFFFFF] border border-[#3A2E1F]/15 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative my-auto animate-fadeIn max-h-[92vh] flex flex-col">
        {/* Header Close button */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            onClick={() => onToggleFavorite(product.id)}
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
              isFavorite ? 'bg-[#B8623F] text-white' : 'bg-white/80 hover:bg-white text-[#3A2E1F]'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            id="btn-fechar-modal-produto"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-[#3A2E1F] flex items-center justify-center backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto flex-1">
          {/* Cover image */}
          <div className="relative aspect-16/10 sm:aspect-16/9 bg-[#FAF7F0] overflow-hidden">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Title and tags */}
            <div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {product.tags?.map((t, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-semibold text-[#B8623F] bg-[#FAF7F0] border border-[#B8623F]/20 px-2 py-0.5 rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <h2 className="font-serif font-bold text-2xl text-[#3A2E1F] leading-tight">
                {product.name}
              </h2>
              <span className="text-xs text-[#7E6C58] block mt-1">{product.unit}</span>
            </div>

            {/* Description */}
            <p className="text-sm text-[#554432] leading-relaxed bg-[#FAF7F0] p-3.5 rounded-2xl border border-[#3A2E1F]/10">
              {product.description}
            </p>

            {/* Allergens warning if present */}
            {product.allergens && product.allergens.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-[#7E6C58]">
                <ShieldAlert className="w-4 h-4 text-[#B7A05E] shrink-0 mt-0.5" />
                <span>
                  <strong>Informações de Alergênicos:</strong> {product.allergens.join(', ')}.
                </span>
              </div>
            )}

            {/* Custom Options (Inteiro vs Fatiado, Coberturas, etc.) */}
            {product.options && product.options.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-[#3A2E1F]/10">
                {product.options.map((opt) => (
                  <div key={opt.id} className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-sm text-[#3A2E1F]">
                        {opt.name} {opt.required && <span className="text-[#B8623F]">*</span>}
                      </h3>
                      <span className="text-[11px] text-[#7E6C58]">
                        {opt.required ? 'Obrigatório' : 'Opcional'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {opt.values.map((val) => {
                        const isSelected = selectedValues[opt.id] === val.id;
                        return (
                          <label
                            key={val.id}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? 'border-[#B8623F] bg-[#B8623F]/5 font-medium text-[#3A2E1F]'
                                : 'border-[#3A2E1F]/15 hover:bg-[#FAF7F0] text-[#554432]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="radio"
                                name={`opt-${opt.id}`}
                                checked={isSelected}
                                onChange={() => handleOptionChange(opt.id, val.id)}
                                className="w-4 h-4 accent-[#B8623F]"
                              />
                              <span>{val.name}</span>
                            </div>
                            {val.price_modifier > 0 && (
                              <span className="text-[#B8623F] font-semibold">
                                + R$ {val.price_modifier.toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Observation Notes */}
            <div className="space-y-1.5 pt-2 border-t border-[#3A2E1F]/10">
              <label htmlFor="input-obs-produto" className="block text-xs font-bold text-[#3A2E1F]">
                Observações Especiais (opcional)
              </label>
              <input
                id="input-obs-produto"
                type="text"
                placeholder="Ex: Fatiar bem fininho, embrulhar para presente..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={120}
                className="w-full text-xs p-3 rounded-xl border border-[#3A2E1F]/15 bg-white text-[#3A2E1F] focus:outline-none focus:ring-2 focus:ring-[#B8623F]"
              />
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer with Quantity and Confirm */}
        <div className="p-4 sm:p-5 bg-[#F9F6F0] border-t border-[#3A2E1F]/10 flex items-center justify-between gap-3">
          {/* Quantity Controls */}
          <div className="flex items-center border border-[#3A2E1F]/20 rounded-xl bg-white p-1">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="p-1.5 rounded-lg text-[#3A2E1F] hover:bg-black/5 disabled:opacity-40"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-bold text-[#3A2E1F] min-w-8 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="p-1.5 rounded-lg text-[#3A2E1F] hover:bg-black/5"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Cart Submit Button */}
          <button
            id="btn-confirmar-adicionar-carrinho"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 bg-[#B8623F] hover:bg-[#994E30] text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-between shadow-md cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" />
              <span>Adicionar à Cesta</span>
            </span>
            <span className="font-bold">
              R$ {totalPrice.toFixed(2).replace('.', ',')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
