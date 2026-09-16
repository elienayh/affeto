"use client";

import { toggleFavorite } from "@/lib/actions/favorites";

export function FavoriteButton({
  productId,
  productPath,
  initiallyFavorite,
}: {
  productId: string;
  productPath: string;
  initiallyFavorite: boolean;
}) {
  return (
    <form
      action={async () => {
        await toggleFavorite(productId, productPath);
      }}
    >
      <button
        type="submit"
        aria-label="Favoritar"
        className="text-2xl"
        title={initiallyFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        {initiallyFavorite ? "♥" : "♡"}
      </button>
    </form>
  );
}
