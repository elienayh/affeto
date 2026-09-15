import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para Client Components.
 * Usa apenas variáveis NEXT_PUBLIC_* — nunca a Service Role Key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
