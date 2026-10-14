import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente de Supabase para Server Components, Server Actions y Route Handlers. */
export async function createClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(lista: { name: string; value: string; options?: any }[]) {
        try {
          lista.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Desde un Server Component no se pueden escribir cookies: el middleware ya refresca la sesión.
        }
      },
    },
  });
}
