"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionState {
  error?: string;
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });

  if (error) return { error: "E-mail ou senha inválidos." };

  revalidatePath("/", "layout");
  redirect("/conta");
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const supabase = await createClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const fullName = String(formData.get("full_name") ?? "");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) return { error: "Não foi possível criar a conta. Tente novamente." };

  if (data.user) {
    // profile é criado aqui; numa Fase seguinte isso pode virar um trigger no banco.
    await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
    });
  }

  revalidatePath("/", "layout");
  redirect("/conta");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
