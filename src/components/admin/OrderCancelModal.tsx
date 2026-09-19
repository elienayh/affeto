import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Order } from '../../types';

interface OrderCancelModalProps {
  order: Order | null;
  onClose: () => void;
  onConfirm: (order: Order, reason: string) => Promise<void>;
}

export const OrderCancelModal: React.FC<OrderCancelModalProps> = ({
  order,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('Cancelado a pedido do cliente');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!order) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm(order, reason.trim() || 'Pedido cancelado pelo administrador');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-[#3A2E1F]/15 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                Atenção
              </span>
              <h3 className="font-serif font-bold text-xl text-[#3A2E1F]">
                Cancelar Pedido {order.code}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 text-[#7E6C58]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
          <p className="font-semibold">
            Tem certeza de que deseja cancelar a operação deste pedido?
          </p>
          <p className="text-[11px] text-rose-800 leading-relaxed">
            O status operacional será alterado para <strong>CANCELADO</strong>. O status financeiro atual ({order.payment_status}) será preservado no registro para controle contábil.
          </p>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-[#3A2E1F] block mb-1">
              Motivo do Cancelamento:
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo do cancelamento..."
              className="w-full bg-[#FAF7F0] border border-[#3A2E1F]/15 rounded-xl p-3 text-xs text-[#3A2E1F] focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#3A2E1F] rounded-xl font-semibold cursor-pointer"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
