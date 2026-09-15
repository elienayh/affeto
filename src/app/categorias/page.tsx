import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { CategoryCard } from "@/components/ui/CategoryCard";
import { getCategories } from "@/lib/queries/catalog";

export const revalidate = 60;

export default async function CategoriasPage() {
  const categories = await getCategories();

  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-6">
      <Header />
      <h1 className="mb-4 font-display text-xl text-brown-dark">Categorias</h1>
      <div className="grid grid-cols-3 gap-4">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
      <BottomNavigation />
    </main>
  );
}
