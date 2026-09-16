import React from 'react';
import { Sparkles, Calendar, Award, ShieldAlert, ArrowRight } from 'lucide-react';

interface HeroBannerProps {
  onScrollToMenu: () => void;
  onOpenScheduleInfo: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onScrollToMenu, onOpenScheduleInfo }) => {
  return (
    <section className="relative overflow-hidden pt-4 pb-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-[#FAF7F0] via-[#F3ECDD] to-[#EADBBA] border border-[#B7A05E]/25 rounded-3xl p-6 sm:p-10 md:p-12 shadow-sm relative overflow-hidden">
          {/* Subtle warm background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#B7A05E]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#B8623F]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left Column: Headline and Story */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#3A2E1F]/5 border border-[#B7A05E]/40 text-[#3A2E1F] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#B8623F]" />
                <span>Levain vivo de 36h • Farinhas Francesas & Orgânicas</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-bold text-[#3A2E1F] leading-[1.15] tracking-tight">
                O afeto do pão artesanal saído do forno para a sua mesa.
              </h1>

              <p className="text-[#554432] text-sm sm:text-base leading-relaxed max-w-xl">
                Fermentação 100% natural, crosta crocante caramelizada e miolo úmido com aroma inconfundível.
                Peça para hoje ou agende sua fornada para a data e horário que preferir.
              </p>

              {/* CTAs */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  id="btn-hero-fazer-pedido"
                  onClick={onScrollToMenu}
                  className="px-6 py-3 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <span>Explorar Cardápio de Hoje</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  id="btn-hero-agendar-entrega"
                  onClick={onOpenScheduleInfo}
                  className="px-5 py-3 bg-[#FFFFFF] hover:bg-[#F3ECDD] border border-[#3A2E1F]/20 text-[#3A2E1F] rounded-xl font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Calendar className="w-4 h-4 text-[#B7A05E]" />
                  <span>Como Funciona o Agendamento</span>
                </button>
              </div>

              {/* Badges / Commitments */}
              <div className="pt-3 grid grid-cols-3 gap-3 border-t border-[#3A2E1F]/10 max-w-lg">
                <div className="text-center sm:text-left">
                  <span className="block font-serif font-bold text-lg sm:text-xl text-[#3A2E1F]">36 Horas</span>
                  <span className="text-[11px] text-[#7E6C58]">Fermentação Lenta</span>
                </div>
                <div className="text-center sm:text-left">
                  <span className="block font-serif font-bold text-lg sm:text-xl text-[#3A2E1F]">0% Aditivos</span>
                  <span className="text-[11px] text-[#7E6C58]">Puro Trigo & Água</span>
                </div>
                <div className="text-center sm:text-left">
                  <span className="block font-serif font-bold text-lg sm:text-xl text-[#3A2E1F]">Fornada 2x</span>
                  <span className="text-[11px] text-[#7E6C58]">Manhã & Tarde</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md">
                <div className="rounded-2xl overflow-hidden border border-[#3A2E1F]/15 shadow-xl bg-white aspect-4/3 sm:aspect-5/4 relative group">
                  <img
                    src="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1000&q=85"
                    alt="Pão artesanal de fermentação natural Affeto"
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#B8623F] text-[11px] font-bold tracking-wider uppercase mb-1">
                      Fornada das 08h
                    </span>
                    <h2 className="font-serif text-lg font-bold">Pão Campagne com Fermento Natural</h2>
                    <p className="text-xs text-white/90">Casca dourada estaladiça e miolo aveludado</p>
                  </div>
                </div>

                {/* Floating pill badge */}
                <div className="absolute -bottom-3 -left-3 bg-[#FFFFFF] border border-[#B7A05E]/30 rounded-xl p-3 shadow-lg flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#B7A05E]/20 flex items-center justify-center text-[#9A8446]">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#3A2E1F]">Farinha Francesa T65</span>
                    <span className="block text-[10px] text-[#7E6C58]">Moinho tradicional a pedra</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
