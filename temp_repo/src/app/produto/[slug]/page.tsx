import Image from "next/image";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Button } from "@/components/ui/Button";
import { QuantitySelector } from "@/components/ui/QuantitySelector";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { getProductBySlug } from "@/lib/queries/catalog";
import { isFavorite } from "@/lib/queries/favorites";
import { storagePublicUrl } from "@/lib/storage";

export const revalidate = 60;

export default async function ProdutoPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const favorite = await isFavorite(product.id);
  const cover = product.images[0];
  const price = product.promotional_price ?? product.price;
  const outOfStock =
    product.available_quantity != null && product.available_quantity <= 0;

  return (
    <main className="mx-auto max-w-md px-4 pb-32 pt-6">
      <Header />

      <div className="relative mb-4 aspect-square overflow-hidden rounded-soft bg-cream">
        {cover && (
          <Image
            src={storagePublicUrl(cover.storage_path)}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        )}
      </div>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl text-brown-dark">{product.name}</h1>
          <p className="mt-1 text-lg font-semibold text-terracota">
            {formatPrice(price)}{" "}
            <span className="text-sm font-normal text-brown-dark/60">
              / {product.unit}
            </span>
          </p>
        </div>
        <FavoriteButton
          productId={product.id}
          productPath={`/produto/${product.slug}`}
          initiallyFavorite={favorite}
        />
      </div>

      {product.description && (
        <p className="mb-6 text-sm text-brown-dark/80">{product.description}</p>
      )}

      {product.options.map((option) => (
        <fieldset key={option.id} className="mb-4">
          <legend className="mb-2 text-sm font-medium text-brown-dark">
            {option.name}
          </legend>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => (
              <label
                key={value.id}
                className="cursor-pointer rounded-soft border border-brown-dark/15 px-3 py-2 text-sm has-[:checked]:border-terracota has-[:checked]:bg-terracota/10"
              >
                <input
                  type="radio"
                  name={`option-${option.id}`}
                  value={value.id}
                  defaultChecked={value === option.values[0]}
                  className="sr-only"
                />
                {value.label}
                {value.price_delta > 0 && ` (+${formatPrice(value.price_delta)})`}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="fixed inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-brown-dark/10 bg-white/95 p-4 backdrop-blur">
        <QuantitySelector max={product.available_quantity} />
        <Button className="flex-1" disabled={outOfStock}>
          {outOfStock ? "Esgotado" : "Adicionar"}
        </Button>
      </div>

      <BottomNavigation />
    </main>
  );
}

function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
