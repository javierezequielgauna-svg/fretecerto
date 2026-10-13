import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const num = z.coerce.number();
const fila = z.object({
  id: z.string().uuid(),
  numero: z.string(),
  estado: z.string(),
  modo: z.string(),
  precio: num,
  costo_total: num,
  margen_objetivo: num,
  vigencia_hasta: z.string().nullable(),
  enviada_at: z.string().nullable(),
  created_at: z.string(),
  clientes: z.object({ nombre: z.string(), telefono: z.string().nullable() }).nullable(),
  rutas: z.object({ origen: z.string(), destino: z.string() }).nullable(),
});

export interface CotizacionFila {
  id: string; numero: string; estado: string; modo: string; precio: number; costo: number; margenObjetivo: number;
  vigenciaHasta: string | null; enviadaAt: string | null; creada: string;
  cliente: string; telefono: string | null; origen: string | null; destino: string | null;
}

export async function listarCotizaciones(db: SupabaseClient): Promise<CotizacionFila[]> {
  const { data, error } = await db
    .from("cotizaciones")
    .select("id, numero, estado, modo, precio, costo_total, margen_objetivo, vigencia_hasta, enviada_at, created_at, clientes(nombre, telefono), rutas(origen, destino)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`No se pudieron cargar las cotizaciones: ${error.message}`);
  return z.array(fila).parse(data ?? []).map((f) => ({
    id: f.id, numero: f.numero, estado: f.estado, modo: f.modo, precio: f.precio, costo: f.costo_total, margenObjetivo: f.margen_objetivo,
    vigenciaHasta: f.vigencia_hasta, enviadaAt: f.enviada_at, creada: f.created_at,
    cliente: f.clientes?.nombre ?? "Sin cliente", telefono: f.clientes?.telefono ?? null,
    origen: f.rutas?.origen ?? null, destino: f.rutas?.destino ?? null,
  }));
}

export interface NuevaCotizacion {
  empresaId: string; numero: string; clienteId: string; rutaId: string; modo: string; vuelveVacio: boolean;
  kgReales: number; kgVolumetricos: number; paquetes: number; tarifaUnitaria: number | null; tarifaMinima: number;
  costoTotal: number; margenObjetivo: number; precio: number; detalleCostos: unknown; clausulaIndice: boolean;
  vigenciaHasta: string; estado: "borrador" | "enviada";
}

export async function crearCotizacion(db: SupabaseClient, d: NuevaCotizacion): Promise<string> {
  const { data, error } = await db.from("cotizaciones").insert({
    empresa_id: d.empresaId, numero: d.numero, cliente_id: d.clienteId, ruta_id: d.rutaId, modo: d.modo, vuelve_vacio: d.vuelveVacio,
    kg_reales: d.kgReales, kg_volumetricos: d.kgVolumetricos, paquetes: d.paquetes, tarifa_unitaria: d.tarifaUnitaria, tarifa_minima: d.tarifaMinima,
    costo_total: d.costoTotal, margen_objetivo: d.margenObjetivo, precio: d.precio, detalle_costos: d.detalleCostos, clausula_indice: d.clausulaIndice,
    vigencia_hasta: d.vigenciaHasta, estado: d.estado, enviada_at: d.estado === "enviada" ? new Date().toISOString() : null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function cambiarEstadoCotizacion(db: SupabaseClient, id: string, estado: "aceptada" | "rechazada") {
  const { error } = await db.from("cotizaciones").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
}

export interface CotizacionParaOperacion { id: string; estado: string; clienteId: string | null; rutaId: string | null; km: number; vuelveVacio: boolean; precio: number; costo: number }

export async function obtenerParaOperacion(db: SupabaseClient, id: string): Promise<CotizacionParaOperacion | null> {
  const { data, error } = await db.from("cotizaciones").select("id, estado, cliente_id, ruta_id, vuelve_vacio, precio, costo_total, detalle_costos, rutas(km)").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const r = data.rutas as unknown as { km: number | string } | null;
  const det = data.detalle_costos as { entrada?: { km?: number } } | null;
  return { id: data.id, estado: data.estado, clienteId: data.cliente_id, rutaId: data.ruta_id, vuelveVacio: !!data.vuelve_vacio, km: Number(det?.entrada?.km ?? r?.km ?? 0), precio: Number(data.precio), costo: Number(data.costo_total) };
}
