"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContexto } from "@/lib/contexto";
import { formatoNumero } from "@/lib/numeracion";
import { crearOperacionesRepo } from "@/lib/repos/operaciones";
import { asegurar, asegurarRuta } from "@/lib/repos/maestros";

const txt = z.string().trim();
const esquema = z
  .object({
    clienteId: txt, clienteNuevo: txt,
    origen: txt.min(2, "Falta el origen"), destino: txt.min(2, "Falta el destino"),
    km: z.coerce.number().positive("Poné los km del viaje"),
    choferId: txt, choferNuevo: txt, unidadId: txt, unidadNueva: txt,
    importe: z.coerce.number().positive("Poné el importe a cobrar (sin IVA)"),
    costo: z.coerce.number().min(0, "El costo no puede ser negativo"),
    fecha: txt,
    vuelveVacio: z.string().optional(),
  })
  .refine((d) => d.clienteId || d.clienteNuevo.length >= 2, { message: "Elegí un cliente o escribí uno nuevo", path: ["clienteId"] });

const volver = (msg: string): never => redirect(`/operaciones/nueva?e=${encodeURIComponent(msg)}`);

export async function crearOperacion(formData: FormData) {
  const d = esquema.safeParse(Object.fromEntries(formData));
  if (!d.success) return volver(d.error.issues[0]?.message ?? "Revisá los datos");
  const v = d.data;

  const { supabase, empresaId } = await getContexto();
  const repo = crearOperacionesRepo(supabase);
  let id: string;
  try {
    const clienteId = v.clienteNuevo ? await asegurar(supabase, "clientes", empresaId, v.clienteNuevo) : v.clienteId;
    const rutaId = await asegurarRuta(supabase, empresaId, v.origen, v.destino, v.km);
    const choferId = v.choferNuevo ? await asegurar(supabase, "choferes", empresaId, v.choferNuevo) : v.choferId || null;
    const unidadId = v.unidadNueva ? await asegurar(supabase, "unidades", empresaId, v.unidadNueva) : v.unidadId || null;
    const numero = formatoNumero("FC", await repo.siguienteNumero(empresaId));
    id = await repo.crear({
      empresaId, numero, clienteId, rutaId, choferId, unidadId,
      km: v.km, kmVacios: v.vuelveVacio ? v.km : 0, importe: v.importe, costoEstimado: v.costo, fechaProgramada: v.fecha || null,
    });
  } catch (e) {
    return volver(e instanceof Error ? e.message : "No se pudo crear la operación");
  }
  revalidatePath("/operaciones");
  redirect(`/operaciones/${id}`);
}
