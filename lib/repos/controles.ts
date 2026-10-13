import type { SupabaseClient } from "@supabase/supabase-js";

export interface VencimientoFila { id: string; tipo: string; sujeto: string; fecha: string }
export interface MantenimientoFila { id: string; tipo: string; unidad: string; unidadId: string; cadaKm: number; ultimoKm: number; proximoKm: number; odometroKm: number }
export interface UnidadOdo { id: string; patente: string; odometroKm: number }
export interface ChoferTel { id: string; nombre: string; telefono: string | null }

type Fila = Record<string, unknown>;
const uno = <T,>(x: unknown): T | null => (Array.isArray(x) ? ((x[0] as T) ?? null) : ((x as T) ?? null));
const fallo = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

export async function listarVencimientos(db: SupabaseClient): Promise<VencimientoFila[]> {
  const { data, error } = await db.from("vencimientos").select("id, tipo, fecha_vencimiento, unidades(patente), choferes(nombre)").order("fecha_vencimiento");
  fallo(error);
  return ((data ?? []) as Fila[]).map((r) => ({
    id: String(r.id), tipo: String(r.tipo), fecha: String(r.fecha_vencimiento),
    sujeto: uno<{ patente: string }>(r.unidades)?.patente ?? uno<{ nombre: string }>(r.choferes)?.nombre ?? "Sin asignar",
  }));
}

export async function listarMantenimientos(db: SupabaseClient): Promise<MantenimientoFila[]> {
  const { data, error } = await db.from("mantenimientos").select("id, unidad_id, tipo, cada_km, ultimo_km, proximo_km, unidades(patente, odometro_km)").order("proximo_km");
  fallo(error);
  return ((data ?? []) as Fila[]).map((r) => {
    const u = uno<{ patente: string; odometro_km: number }>(r.unidades);
    return { id: String(r.id), tipo: String(r.tipo), unidad: u?.patente ?? "unidad", unidadId: String(r.unidad_id), cadaKm: Number(r.cada_km), ultimoKm: Number(r.ultimo_km), proximoKm: Number(r.proximo_km), odometroKm: Number(u?.odometro_km ?? 0) };
  });
}

export async function listarUnidadesOdo(db: SupabaseClient): Promise<UnidadOdo[]> {
  const { data, error } = await db.from("unidades").select("id, patente, odometro_km").eq("activa", true).order("patente");
  fallo(error);
  return (data ?? []).map((u) => ({ id: u.id, patente: u.patente, odometroKm: Number(u.odometro_km) }));
}

export async function listarChoferesTel(db: SupabaseClient): Promise<ChoferTel[]> {
  const { data, error } = await db.from("choferes").select("id, nombre, telefono").eq("activo", true).order("nombre");
  fallo(error);
  return (data ?? []).map((c) => ({ id: c.id, nombre: c.nombre, telefono: c.telefono }));
}

export async function crearVencimiento(db: SupabaseClient, d: { empresaId: string; tipo: string; unidadId: string | null; choferId: string | null; fecha: string; telefono: string | null }) {
  const { error } = await db.from("vencimientos").insert({ empresa_id: d.empresaId, tipo: d.tipo, unidad_id: d.unidadId, chofer_id: d.choferId, fecha_vencimiento: d.fecha, telefono_aviso: d.telefono });
  fallo(error);
}
export async function renovarVencimiento(db: SupabaseClient, id: string, fecha: string) {
  const { error } = await db.from("vencimientos").update({ fecha_vencimiento: fecha }).eq("id", id);
  fallo(error);
}
export async function borrarVencimiento(db: SupabaseClient, id: string) {
  const { error } = await db.from("vencimientos").delete().eq("id", id);
  fallo(error);
}
export async function crearMantenimiento(db: SupabaseClient, d: { empresaId: string; unidadId: string; tipo: string; cadaKm: number; ultimoKm: number }) {
  const { error } = await db.from("mantenimientos").insert({ empresa_id: d.empresaId, unidad_id: d.unidadId, tipo: d.tipo, cada_km: d.cadaKm, ultimo_km: d.ultimoKm });
  fallo(error);
}
/** "Hice el service": el último service pasa a ser el odómetro actual. */
export async function registrarService(db: SupabaseClient, id: string, odometroKm: number) {
  const { error } = await db.from("mantenimientos").update({ ultimo_km: odometroKm }).eq("id", id);
  fallo(error);
}
export async function actualizarOdometro(db: SupabaseClient, unidadId: string, km: number) {
  const { error } = await db.from("unidades").update({ odometro_km: km }).eq("id", unidadId);
  fallo(error);
}
