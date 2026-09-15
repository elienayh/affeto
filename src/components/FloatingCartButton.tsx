import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FloatingCartButtonProps {
  itemsCount?: number;
  itemCount?: number;
  totalAmount?: number;
  subtotal?: number;
  onClick?: () => void;
  onOpenCart?: () => void;
}

export const FloatingCartButton: React.FC<FloatingCartButtonProps> = ({
  itemsCount,
  itemCount,
  totalAmount,
  subtotal,
  onClick,
  onOpenCart,
}) => {
  const count = itemsCount ?? itemCount ?? 0;
  const amount = totalAmount ?? subtotal ?? 0;
  const handleClick = onClick || onOpenCart || (() => {});
  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40">
      <AnimatePresence>
        <motion.button
          id="btn-carrinho-flutuante"
          onClick={handleClick}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="flex items-center gap-3 bg-[#B8623F] hover:bg-[#994E30] text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-xl hover:shadow-2xl border-2 border-[#F3ECDD]/20 cursor-pointer backdrop-blur-xs transition-colors"
          title="Ver sacola e finalizar pedido"
        >
          {/* Bag Icon with Badge */}
          <div className="relative flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
            {count > 0 && (
              <span
                id="badge-carrinho-flutuante"
                className="absolute -top-2 -right-2 bg-[#3A2E1F] text-[#F3ECDD] text-[10px] sm:text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#B8623F] shadow-xs animate-bounce"
              >
                {count}
              </span>
            )}
          </div>

          {/* Cart Text & Price */}
          <div className="text-left leading-tight pr-1">
            <span className="block text-xs uppercase tracking-wider font-semibold opacity-90">
              {count === 0 ? 'Cesta' : 'Finalizar Pedido'}
            </span>
            <span className="block font-serif font-bold text-sm sm:text-base">
              {count === 0
                ? 'Ver Itens'
                : `R$ ${(amount || 0).toFixed(2).replace('.', ',')}`}
            </span>
          </div>

          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </motion.button>
      </AnimatePresence>
    </div>
  );
};
