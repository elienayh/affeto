import Link from "next/link";

const items = [
  { href: "/", label: "Início" },
  { href: "/categorias", label: "Categorias" },
  { href: "/carrinho", label: "Carrinho" },
  { href: "/conta", label: "Conta" },
];

export function BottomNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-brown-dark/10 bg-cream/95 py-2 backdrop-blur md:hidden">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="px-3 py-1 text-sm text-brown-dark"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
