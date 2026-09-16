import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { ProductCard } from "@/components/ui/ProductCard";
import { searchProducts } from "@/lib/queries/catalog";

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const term = searchParams.q?.trim() ?? "";
  const products = term.length > 0 ? await searchProducts(term) : [];

  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-6">
      <Header />

      <form className="mb-4" action="/busca">
        <input
          type="search"
          name="q"
          defaultValue={term}
          placeholder="Buscar pães, bolos, salgados..."
          className="w-full rounded-soft border border-brown-dark/15 bg-white px-4 py-3 text-sm"
        />
      </form>

      {term.length === 0 ? (
        <p className="text-sm text-brown-dark/60">Digite algo para buscar.</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-brown-dark/60">
          Nada encontrado para &ldquo;{term}&rdquo;.
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
