import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Cliente Supabase para uso em Server Components / Server Actions / Route Handlers,
 * autenticado como o usuário da sessão (respeita RLS).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado a partir de um Server Component sem permissão de escrita;
            // seguro ignorar quando há middleware renovando a sessão.
          }
        },
      },
    }
  );
}

/**
 * Cliente "admin", com a Service Role Key. Ignora RLS.
 * Só pode ser importado por código que roda no servidor
 * (Route Handlers, Server Actions, jobs) — nunca em Client Components.
 * Usado, por exemplo, pelo webhook do Mercado Pago (seção 5.4 do prompt-v2).
 */
export function createAdminClient() {
  const { createClient: createSupabaseClient } = require("@supabase/supabase-js");
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
