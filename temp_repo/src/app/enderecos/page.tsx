import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/BottomNavigation";

export default function EnderecosPage() {
  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-6">
      <Header />
      <h1 className="mb-2 font-display text-xl text-brown-dark">Meus endereços</h1>
      <p className="text-sm text-brown-dark/70">
        Chega na Fase 3, junto com entrega/retirada.
      </p>
      <BottomNavigation />
    </main>
  );
}
