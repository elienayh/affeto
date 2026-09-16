import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/BottomNavigation";

export default function CarrinhoPage() {
  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-6">
      <Header />
      <h1 className="mb-2 font-display text-xl text-brown-dark">Carrinho</h1>
      <p className="text-sm text-brown-dark/70">
        O carrinho persistente chega na Fase 3 (ver prompt-v2.md, seção 7).
      </p>
      <BottomNavigation />
    </main>
  );
}
