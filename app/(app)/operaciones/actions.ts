"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContexto } from "@/lib/contexto";
import { ESTADOS } from "@/lib/estados";
import { crearOperacionesRepo } from "@/lib/repos/operaciones";

export type Resultado = { ok: true } | { ok: false; error: string };

const datos = z.object({ id: z.string().uuid(), estado: z.enum(ESTADOS) });

/** Pasa la operación al estado pedido. La base rechaza saltos de orden y permisos que no correspondan. */
export async function avanzarEstado(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const d = datos.safeParse({ id: formData.get("id"), estado: formData.get("estado") });
  if (!d.success) return { ok: false, error: "Datos inválidos" };
  const { supabase } = await getContexto();
  try {
    await crearOperacionesRepo(supabase).avanzar(d.data.id, d.data.estado);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo cambiar el estado" };
  }
  revalidatePath("/operaciones");
  revalidatePath("/cobranza");
  revalidatePath("/chofer", "layout");
  return { ok: true };
}

const costoReal = z.object({ id: z.string().uuid(), costo: z.coerce.number().min(0, "El costo no puede ser negativo") });

/** Carga el costo real del viaje; el margen y la rentabilidad pasan a usarlo en lugar del estimado. */
export async function guardarCostoReal(formData: FormData) {
  const d = costoReal.safeParse(Object.fromEntries(formData));
  if (!d.success) return redirect("/operaciones");
  const { supabase } = await getContexto();
  try {
    await crearOperacionesRepo(supabase).guardarCostoReal(d.data.id, d.data.costo);
  } catch (e) {
    return redirect(`/operaciones/${d.data.id}?e=${encodeURIComponent(e instanceof Error ? e.message : "No se pudo guardar")}`);
  }
  revalidatePath("/operaciones");
  revalidatePath("/rentabilidad");
  redirect(`/operaciones/${d.data.id}`);
}
