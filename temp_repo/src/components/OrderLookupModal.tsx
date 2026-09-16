import React, { useState } from 'react';
import { X, Search, AlertCircle, ArrowRight } from 'lucide-react';
import { orderService } from '../services/orderService';
import { Order } from '../types';

interface OrderLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (order: Order) => void;
}

export const OrderLookupModal: React.FC<OrderLookupModalProps> = ({
  isOpen,
  onClose,
  onSelectOrder,
}) => {
  if (!isOpen) return null;

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const order = await orderService.getOrderByCode(code.trim());
      if (!order) {
        setError(`Nenhum pedido encontrado com o código "${code.trim()}". Verifique o número digitado.`);
        setLoading(false);
        return;
      }
      onSelectOrder(order);
      onClose();
    } catch {
      setError('Erro ao buscar pedido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white border border-[#3A2E1F]/15 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative my-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-xl text-[#3A2E1F]">Consultar Meu Pedido</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-[#7E6C58]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#554432] leading-relaxed">
          Digite o código recebido no momento da compra (exemplo: <strong>#AFF-2026-0001</strong>).
        </p>

        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7E6C58]" />
            <input
              type="text"
              required
              placeholder="#AFF-2026-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono uppercase bg-[#FAF7F0] border border-[#3A2E1F]/20 rounded-xl text-[#3A2E1F] focus:outline-none focus:ring-2 focus:ring-[#B8623F]"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#B8623F] hover:bg-[#994E30] text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>Rastrear Pedido</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
