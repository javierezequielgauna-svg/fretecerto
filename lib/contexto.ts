import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Rol = "dueno" | "despachante" | "administrativo" | "chofer";

/** Quién es el usuario y a qué empresa pertenece. `cache` evita repetir la consulta dentro de un mismo pedido. */
export const getContexto = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("miembros")
    .select("empresa_id, nombre, rol, empresas(nombre, objetivo_margen)")
    .eq("user_id", user.id)
    .maybeSingle();
  const m = data as unknown as {
    empresa_id: string; nombre: string; rol: Rol; empresas: { nombre: string; objetivo_margen: number | string } | null;
  } | null;
  if (!m) redirect("/onboarding");

  return {
    supabase,
    empresaId: m.empresa_id,
    nombre: m.nombre,
    rol: m.rol,
    empresa: m.empresas?.nombre ?? "FreteCerto",
    objetivoMargen: Number(m.empresas?.objetivo_margen ?? 0.3),
  };
});
