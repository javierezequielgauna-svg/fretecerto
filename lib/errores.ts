/** Saca el mensaje de cualquier error (Error común, error de Supabase o Postgrest). */
export const mensajeDe = (e: unknown, defecto = "Algo salió mal"): string =>
  (e as { message?: string } | null)?.message || defecto;
