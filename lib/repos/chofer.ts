import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const num = z.coerce.number();
const fila = z.object({
  id: z.string().uuid(),
  numero: z.string(),
  estado: z.enum(["pendiente", "en_carga", "en_transito", "entregada"]),
  eta: z.string().nullable(),
  kg: num,
  paquetes: num,
  origen: z.string().nullable(),
  destino: z.string().nullable(),
  patente: z.string().nullable(),
  cliente: z.string().nullable(),
  fecha_programada: z.string().nullable(),
  conformado: z.boolean(),
});
export type MiOperacion = z.infer<typeof fila>;

const COLS = "id, numero, estado, eta, kg, paquetes, origen, destino, patente, cliente, fecha_programada, conformado";

/** Solo lo del chofer logueado, y sin importes ni costos: la vista v_mis_operaciones lo garantiza desde la base. */
export async function listarMisOperaciones(db: SupabaseClient): Promise<MiOperacion[]> {
  const { data, error } = await db.from("v_mis_operaciones").select(COLS).order("fecha_programada", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`No se pudieron cargar tus viajes: ${error.message}`);
  return z.array(fila).parse(data ?? []);
}

export async function obtenerMiOperacion(db: SupabaseClient, id: string): Promise<MiOperacion | null> {
  const { data, error } = await db.from("v_mis_operaciones").select(COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fila.parse(data) : null;
}
