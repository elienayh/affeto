import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="mb-4 flex items-center justify-between">
      <Link href="/" className="font-display text-2xl text-brown-dark">
        Affeto Pães
      </Link>
      <div className="flex items-center gap-3 text-sm">
        <Link href="/busca" aria-label="Buscar">
          🔍
        </Link>
        <Link href="/carrinho" aria-label="Carrinho">
          🛒
        </Link>
        <Link href={user ? "/conta" : "/entrar"} aria-label="Conta">
          👤
        </Link>
      </div>
    </header>
  );
}
