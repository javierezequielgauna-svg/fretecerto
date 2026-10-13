import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { diaISO } from "@/lib/calc/fechas";
import type { FilaRentabilidad } from "@/lib/rentabilidad";

export type Dimension = "ruta" | "cliente" | "chofer" | "unidad";

const num = z.coerce.number();
const fila = z.object({
  clave: z.string().nullable(),
  nombre: z.string().nullable(),
  viajes: num,
  ingresos: num,
  costos: num,
  margen: num.nullable(),
  costo_km: num.nullable(),
  pct_vacio: num.nullable(),
  pct_a_tiempo: num.nullable(),
});

/** Llama a la función rentabilidad() de la base (respeta RLS). `dias` = null es "todo el historial". */
export async function obtenerRentabilidad(db: SupabaseClient, dim: Dimension, dias: number | null): Promise<FilaRentabilidad[]> {
  const desde = dias ? diaISO(new Date(Date.now() - dias * 86_400_000)) : null;
  const { data, error } = await db.rpc("rentabilidad", { p_dim: dim, p_desde: desde });
  if (error) throw new Error(`No se pudo calcular la rentabilidad: ${error.message}`);
  return z.array(fila).parse(data ?? []).map((f) => ({
    clave: f.clave, nombre: f.nombre ?? "Sin asignar", viajes: f.viajes, ingresos: f.ingresos, costos: f.costos,
    margen: f.margen, costoKm: f.costo_km, pctVacio: f.pct_vacio, pctATiempo: f.pct_a_tiempo,
  }));
}
