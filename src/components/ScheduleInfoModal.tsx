import React from 'react';
import { X, Clock, Flame, Calendar, Sparkles, CheckCircle2 } from 'lucide-react';
import { StoreSettings } from '../types';

interface ScheduleInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeSettings?: StoreSettings;
}

export const ScheduleInfoModal: React.FC<ScheduleInfoModalProps> = ({ isOpen, onClose, storeSettings }) => {
  if (!isOpen) return null;

  const freshBatchInfo =
    storeSettings?.fresh_batch_hours ||
    'Fornadas frescas diárias saindo às 08h00 e às 15h00.';

  const openingHours = storeSettings?.opening_hours || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white border border-[#3A2E1F]/15 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative my-auto p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#3A2E1F]/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#B8623F]/10 text-[#B8623F] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-bold text-xl text-[#3A2E1F]">Como Funciona o Agendamento</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-[#7E6C58]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs text-[#554432] leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#B7A05E]/25 space-y-1.5">
            <h4 className="font-bold text-[#3A2E1F] flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#B8623F]" />
              Fermentação Natural Lenta (36h)
            </h4>
            <p>
              Nosso levain (fermento biológico vivo) repousa por 36 horas em temperatura controlada para atingir acidez, alveolagem e digestibilidade perfeitas. Por isso, organizamos nossas fornadas em janelas horárias específicas.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-[#3A2E1F] uppercase text-[11px] tracking-wider">
              Horários das Fornadas Diárias
            </h4>
            <div className="p-3 rounded-xl bg-[#F3ECDD]/40 border border-[#3A2E1F]/10 space-y-1.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[#3A2E1F]">
                  <strong>Programação Oficial: </strong>
                  {freshBatchInfo}
                </div>
              </div>
            </div>
          </div>

          {openingHours.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="font-bold text-[#3A2E1F] uppercase text-[11px] tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#B8623F]" />
                Horários de Funcionamento & Balcão
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                {openingHours.map((h, i) => (
                  <div key={i} className="flex justify-between py-1 px-2.5 rounded-lg bg-[#FAF7F0] border border-[#3A2E1F]/5">
                    <span className="font-medium text-[#554432]">{h.day}</span>
                    <span className={h.is_closed ? 'text-red-500 font-medium' : 'text-[#3A2E1F] font-semibold'}>
                      {h.is_closed ? 'Fechado' : `${h.open} - ${h.close}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-[#F3ECDD]/60 rounded-xl border border-[#3A2E1F]/10">
            <span className="font-bold text-[#3A2E1F] block mb-0.5">Dica de Encomenda:</span>
            <span>
              Você pode fazer seu pedido agora para entrega ou retirada hoje mesmo, ou selecionar uma data futura (ideal para café em família no fim de semana ou eventos).
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#3A2E1F] hover:bg-[#554432] text-[#F3ECDD] font-semibold text-xs rounded-xl transition-colors cursor-pointer"
        >
          Entendido, Quero Escolher meus Pães
        </button>
      </div>
    </div>
  );
};
