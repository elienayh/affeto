import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { ProductCard } from "@/components/ui/ProductCard";
import { createClient } from "@/lib/supabase/server";
import { getFavoriteProducts } from "@/lib/queries/favorites";

export default async function FavoritosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 pb-24 pt-6">
        <Header />
        <p className="text-sm text-brown-dark/70">
          <Link href="/entrar" className="text-terracota underline">
            Entre na sua conta
          </Link>{" "}
          para ver seus favoritos.
        </p>
        <BottomNavigation />
      </main>
    );
  }

  const products = await getFavoriteProducts();

  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-6">
      <Header />
      <h1 className="mb-4 font-display text-xl text-brown-dark">Meus favoritos</h1>

      {products.length === 0 ? (
        <p className="text-sm text-brown-dark/70">
          Você ainda não favoritou nenhum produto.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <BottomNavigation />
    </main>
  );
}
