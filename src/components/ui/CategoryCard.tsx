import Link from "next/link";
import type { Category } from "@/lib/types";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/categoria/${category.slug}`}
      className="flex shrink-0 flex-col items-center gap-2"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/20 text-lg font-display text-brown-dark">
        {category.name.charAt(0)}
      </div>
      <span className="text-xs text-brown-dark">{category.name}</span>
    </Link>
  );
}
