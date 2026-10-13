"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContexto } from "@/lib/contexto";
import { mensajeDe } from "@/lib/errores";
import { generarAlertas } from "@/lib/alertas-generar";
import { silenciarAlerta } from "@/lib/repos/alertas";
import * as ctl from "@/lib/repos/controles";

const id = z.string().uuid();
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Poné una fecha válida");
const km = z.coerce.number().min(0, "Los km no pueden ser negativos");
const refrescar = () => {
  revalidatePath("/", "layout"); // actualiza la cantidad de urgentes del menú
};

/** Botón "Actualizar ahora": corre las reglas para tu empresa (sin mail; el mail sale de la tarea programada). */
export async function actualizarAhora() {
  const { supabase, empresaId } = await getContexto();
  let nuevas = 0;
  try {
    nuevas = (await generarAlertas(supabase, empresaId)).nuevas.length;
  } catch (e) {
    return redirect(`/alertas?e=${encodeURIComponent(mensajeDe(e))}`);
  }
  refrescar();
  redirect(`/alertas?n=${nuevas}`);
}

export async function silenciar(formData: FormData) {
  const r = id.safeParse(formData.get("id"));
  if (!r.success) return redirect("/alertas");
  const { supabase } = await getContexto();
  try {
    await silenciarAlerta(supabase, r.data);
  } catch (e) {
    return redirect(`/alertas?e=${encodeURIComponent(mensajeDe(e))}`);
  }
  refrescar();
  redirect("/alertas");
}

/** Corre un cambio en los controles y vuelve a calcular las alertas para que la lista quede al día. */
async function ejecutar(trabajo: (c: Awaited<ReturnType<typeof getContexto>>) => Promise<void>): Promise<never> {
  const c = await getContexto();
  try {
    await trabajo(c);
    await generarAlertas(c.supabase, c.empresaId).catch(() => undefined);
  } catch (e) {
    redirect(`/alertas/controles?e=${encodeURIComponent(mensajeDe(e))}`);
  }
  refrescar();
  revalidatePath("/alertas");
  redirect("/alertas/controles?ok=1");
}

function leer<T extends z.ZodTypeAny>(esquema: T, f: FormData): z.infer<T> {
  const r = esquema.safeParse(Object.fromEntries(f));
  if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Revisá los datos");
  return r.data;
}

export async function crearVencimiento(formData: FormData) {
  return ejecutar(async ({ supabase, empresaId }) => {
    const d = leer(z.object({ tipo: z.enum(["seguro", "vtv", "licencia", "otro"]), sujeto: z.string().regex(/^[uc]:[0-9a-f-]{36}$/, "Elegí la unidad o el chofer"), fecha, telefono: z.string().trim() }), formData);
    const esUnidad = d.sujeto.startsWith("u:");
    await ctl.crearVencimiento(supabase, { empresaId, tipo: d.tipo, unidadId: esUnidad ? d.sujeto.slice(2) : null, choferId: esUnidad ? null : d.sujeto.slice(2), fecha: d.fecha, telefono: d.telefono || null });
  });
}
export async function renovarVencimiento(formData: FormData) {
  return ejecutar(async ({ supabase }) => {
    const d = leer(z.object({ id, fecha }), formData);
    await ctl.renovarVencimiento(supabase, d.id, d.fecha);
  });
}
export async function borrarVencimiento(formData: FormData) {
  return ejecutar(async ({ supabase }) => ctl.borrarVencimiento(supabase, leer(z.object({ id }), formData).id));
}
export async function crearMantenimiento(formData: FormData) {
  return ejecutar(async ({ supabase, empresaId }) => {
    const d = leer(z.object({ unidadId: id, tipo: z.string().trim().min(2, "Poné qué mantenimiento es"), cadaKm: km.gt(0, "Poné cada cuántos km"), ultimoKm: km }), formData);
    await ctl.crearMantenimiento(supabase, { empresaId, unidadId: d.unidadId, tipo: d.tipo, cadaKm: d.cadaKm, ultimoKm: d.ultimoKm });
  });
}
export async function registrarService(formData: FormData) {
  return ejecutar(async ({ supabase }) => {
    const d = leer(z.object({ id, odometro: km }), formData);
    await ctl.registrarService(supabase, d.id, d.odometro);
  });
}
export async function actualizarOdometro(formData: FormData) {
  return ejecutar(async ({ supabase }) => {
    const d = leer(z.object({ unidadId: id, km }), formData);
    await ctl.actualizarOdometro(supabase, d.unidadId, d.km);
  });
}
