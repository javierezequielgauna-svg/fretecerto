import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la clave de servicio: se salta RLS y ve a TODAS las empresas.
 * Usalo solo en tareas del servidor (cron). Jamás con NEXT_PUBLIC_ ni desde el navegador.
 */
export function crearAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}
