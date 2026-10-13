"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContexto } from "@/lib/contexto";
import { formatoNumero } from "@/lib/numeracion";
import { mensajeDe } from "@/lib/errores";
import { crearOperacionesRepo } from "@/lib/repos/operaciones";
import { cambiarEstadoCotizacion, obtenerParaOperacion } from "@/lib/repos/cotizaciones";

const idDe = (f: FormData) => z.string().uuid().safeParse(f.get("id"));
const volver = (m: string): never => redirect(`/cotizaciones?e=${encodeURIComponent(m)}`);

/** Convierte una cotización aceptada en una operación (con el importe y el costo cotizados). */
export async function aceptarCotizacion(formData: FormData) {
  const id = idDe(formData);
  if (!id.success) return volver("Cotización inválida");
  const { supabase, empresaId } = await getContexto();
  const repo = crearOperacionesRepo(supabase);

  let opId: string;
  try {
    const c = await obtenerParaOperacion(supabase, id.data);
    if (!c) return volver("No encontramos la cotización");
    if (!["borrador", "enviada"].includes(c.estado)) return volver("Esta cotización ya fue resuelta");
    if (!c.clienteId || !c.rutaId) return volver("A la cotización le falta el cliente o la ruta");
    const numero = formatoNumero("FC", await repo.siguienteNumero(empresaId));
    opId = await repo.crear({
      empresaId, numero, clienteId: c.clienteId, rutaId: c.rutaId, choferId: null, unidadId: null,
      km: c.km, kmVacios: c.vuelveVacio ? c.km : 0, importe: c.precio, costoEstimado: c.costo, fechaProgramada: null,
    });
    await cambiarEstadoCotizacion(supabase, id.data, "aceptada");
  } catch (e) {
    return volver(mensajeDe(e, "No se pudo crear la operación"));
  }
  revalidatePath("/cotizaciones");
  revalidatePath("/operaciones");
  redirect(`/operaciones/${opId}`);
}

export async function rechazarCotizacion(formData: FormData) {
  const id = idDe(formData);
  if (!id.success) return volver("Cotización inválida");
  const { supabase } = await getContexto();
  try {
    await cambiarEstadoCotizacion(supabase, id.data, "rechazada");
  } catch (e) {
    return volver(mensajeDe(e));
  }
  revalidatePath("/cotizaciones");
  redirect("/cotizaciones");
}
