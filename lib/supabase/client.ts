import { createBrowserClient } from "@supabase/ssr";

/** Cliente de Supabase para componentes del navegador ("use client"). */
export const createClient = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
