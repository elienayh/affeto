import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { ProductCard } from "@/components/ui/ProductCard";
import { getCategoryBySlug, getProductsByCategorySlug } from "@/lib/queries/catalog";

export const revalidate = 60;

export default async function CategoriaPage({
  params,
}: {
  params: { slug: string };
}) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const products = await getProductsByCategorySlug(params.slug);

  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-6">
      <Header />
      <h1 className="mb-4 font-display text-xl text-brown-dark">
        {category.name}
      </h1>

      {products.length === 0 ? (
        <p className="text-sm text-brown-dark/70">
          Nenhum produto ativo nesta categoria no momento.
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
