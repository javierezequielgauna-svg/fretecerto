"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const datos = z.object({
  empresa: z.string().trim().min(2),
  nombre: z.string().trim().min(2),
});

export async function crearEmpresa(formData: FormData) {
  const d = datos.safeParse({ empresa: formData.get("empresa"), nombre: formData.get("nombre") });
  if (!d.success) redirect("/onboarding?e=datos");
  const supabase = await createClient();
  const { error } = await supabase.rpc("crear_empresa", { p_nombre: d.data.empresa, p_nombre_usuario: d.data.nombre });
  if (error) redirect("/onboarding?e=error");
  redirect("/operaciones");
}
