import { createClient } from "@/lib/supabase/server";

/** Para route handlers: devuelve el usuario y su empresa, o null (responder 401). */
export async function usuarioApi() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("miembros").select("empresa_id").eq("user_id", user.id).maybeSingle();
  if (!data) return null;
  return { supabase, userId: user.id, empresaId: data.empresa_id as string };
}
