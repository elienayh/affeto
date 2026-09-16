import { Button } from "@/components/ui/Button";
import { CategoryCard } from "@/components/ui/CategoryCard";
import { ProductCard } from "@/components/ui/ProductCard";
import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { getCategories, getFeaturedSections } from "@/lib/queries/catalog";

export const revalidate = 60;

export default async function HomePage() {
  const [categories, { promotions }] = await Promise.all([
    getCategories(),
    getFeaturedSections(),
  ]);

  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-6">
      <Header />

      {categories.length === 0 ? (
        <EmptyCatalogNotice />
      ) : (
        <>
          <section className="mb-6 flex gap-4 overflow-x-auto">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </section>

          {promotions.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 font-display text-lg text-brown-dark">
                Promoções
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {promotions.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <BottomNavigation />
    </main>
  );
}

function EmptyCatalogNotice() {
  return (
    <div className="rounded-soft bg-white p-6 text-center shadow-warm">
      <p className="font-display text-lg text-brown-dark">
        O cardápio ainda não foi cadastrado
      </p>
      <p className="mt-2 text-sm text-brown-dark/70">
        Rode <code>supabase/migrations/0001_init.sql</code> e depois{" "}
        <code>supabase/seed.sql</code> no seu projeto Supabase para ver produtos
        de demonstração.
      </p>
      <Button className="mt-4" disabled>
        Ver cardápio
      </Button>
    </div>
  );
}
