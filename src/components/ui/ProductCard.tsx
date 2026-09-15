import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { storagePublicUrl } from "@/lib/storage";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const cover = product.images[0];
  const price = product.promotional_price ?? product.price;
  const hasPromo = product.promotional_price != null;

  return (
    <Link href={`/produto/${product.slug}`}>
      <Card className="overflow-hidden">
        <div className="relative aspect-square bg-cream">
          {cover && (
            <Image
              src={storagePublicUrl(cover.storage_path)}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          )}
        </div>
        <div className="p-3">
          <p className="line-clamp-1 font-medium text-brown-dark">{product.name}</p>
          <p className="text-sm text-brown-dark/70">
            {hasPromo && (
              <span className="mr-1 line-through opacity-60">
                {formatPrice(product.price)}
              </span>
            )}
            <span className="font-semibold text-terracota">
              {formatPrice(price)}
            </span>
            <span className="text-xs"> / {product.unit}</span>
          </p>
        </div>
      </Card>
    </Link>
  );
}

function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
