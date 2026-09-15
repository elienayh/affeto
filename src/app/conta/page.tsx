import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";

export default async function ContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-6">
      <Header />
      <h1 className="mb-1 font-display text-xl text-brown-dark">
        {profile?.full_name || "Minha conta"}
      </h1>
      <p className="mb-6 text-sm text-brown-dark/60">{user.email}</p>

      <nav className="mb-6 divide-y divide-brown-dark/10 rounded-soft bg-white shadow-warm">
        <Link href="/pedidos" className="block px-4 py-3 text-sm">
          Meus pedidos
        </Link>
        <Link href="/favoritos" className="block px-4 py-3 text-sm">
          Meus favoritos
        </Link>
        <Link href="/enderecos" className="block px-4 py-3 text-sm">
          Meus endereços
        </Link>
      </nav>

      <form action={signOut}>
        <Button variant="ghost" type="submit">
          Sair da conta
        </Button>
      </form>

      <BottomNavigation />
    </main>
  );
}
