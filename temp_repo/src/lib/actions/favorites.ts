"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleFavorite(productId: string, productSlugPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Cliente sem sessão tentando favoritar: seção 20 do prompt-v1 diz para não
    // obrigar cadastro antes de conhecer o catálogo, então só pedimos login
    // no momento da ação, não antes.
    redirect("/entrar");
  }

  const { data: existing } = await supabase
    .from("favorites")
    .select("product_id")
    .eq("customer_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("favorites")
      .delete()
      .eq("customer_id", user.id)
      .eq("product_id", productId);
  } else {
    await supabase
      .from("favorites")
      .insert({ customer_id: user.id, product_id: productId });
  }

  revalidatePath(productSlugPath);
  revalidatePath("/favoritos");
}
