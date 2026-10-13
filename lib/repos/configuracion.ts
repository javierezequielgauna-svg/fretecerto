import type { SupabaseClient } from "@supabase/supabase-js";

export interface Empresa { id: string; nombre: string; cuit: string | null; domicilio: string | null; puntoVenta: string; objetivoMargen: number }
export interface Parametros { precioGasoil: number; viaticoDia: number; iibbPct: number; indiceCostos: number | null }
export interface UnidadCosto { id: string; patente: string; consumoL100: number; capacidadKg: number; amortizacionKm: number; cubiertasKm: number; mantenimientoKm: number }
export interface ChoferCosto { id: string; nombre: string; costoDia: number }
export interface ClienteTel { id: string; nombre: string; telefono: string | null }

const n = (v: unknown) => Number(v ?? 0);
const fallo = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

export async function obtenerEmpresa(db: SupabaseClient, id: string): Promise<Empresa> {
  const { data, error } = await db.from("empresas").select("id, nombre, cuit, domicilio, punto_venta, objetivo_margen").eq("id", id).single();
  fallo(error);
  return { id: data!.id, nombre: data!.nombre, cuit: data!.cuit, domicilio: data!.domicilio, puntoVenta: data!.punto_venta, objetivoMargen: n(data!.objetivo_margen) };
}

/** Los parámetros vigentes más recientes; ceros si todavía no se cargaron. */
export async function obtenerParametros(db: SupabaseClient): Promise<Parametros> {
  const { data, error } = await db.from("parametros_costos").select("precio_gasoil, viatico_dia, iibb_pct, indice_costos").order("vigente_desde", { ascending: false }).limit(1);
  fallo(error);
  const p = data?.[0];
  return { precioGasoil: n(p?.precio_gasoil), viaticoDia: n(p?.viatico_dia), iibbPct: n(p?.iibb_pct), indiceCostos: p?.indice_costos == null ? null : n(p.indice_costos) };
}

export async function listarUnidadesCosto(db: SupabaseClient): Promise<UnidadCosto[]> {
  const { data, error } = await db.from("unidades").select("id, patente, consumo_l_100km, capacidad_kg, amortizacion_km, cubiertas_km, mantenimiento_km").eq("activa", true).order("patente");
  fallo(error);
  return (data ?? []).map((u) => ({
    id: u.id, patente: u.patente, consumoL100: n(u.consumo_l_100km), capacidadKg: n(u.capacidad_kg),
    amortizacionKm: n(u.amortizacion_km), cubiertasKm: n(u.cubiertas_km), mantenimientoKm: n(u.mantenimiento_km),
  }));
}

export async function listarChoferesCosto(db: SupabaseClient): Promise<ChoferCosto[]> {
  const { data, error } = await db.from("choferes").select("id, nombre, costo_dia").eq("activo", true).order("nombre");
  fallo(error);
  return (data ?? []).map((c) => ({ id: c.id, nombre: c.nombre, costoDia: n(c.costo_dia) }));
}

export async function listarClientesTel(db: SupabaseClient): Promise<ClienteTel[]> {
  const { data, error } = await db.from("clientes").select("id, nombre, telefono").order("nombre");
  fallo(error);
  return (data ?? []).map((c) => ({ id: c.id, nombre: c.nombre, telefono: c.telefono }));
}

export async function guardarEmpresa(db: SupabaseClient, id: string, d: { cuit: string; domicilio: string; puntoVenta: string; objetivoMargen: number }) {
  const { data, error } = await db.from("empresas").update({ cuit: d.cuit || null, domicilio: d.domicilio || null, punto_venta: d.puntoVenta, objetivo_margen: d.objetivoMargen }).eq("id", id).select("id");
  fallo(error);
  // RLS no da error cuando no te deja actualizar: simplemente no toca ninguna fila
  if (!data?.length) throw new Error("Solo el dueño puede cambiar los datos de la empresa");
}

/** Un registro por día: si cargás dos veces el mismo día, se pisa el del día. */
export async function guardarParametros(db: SupabaseClient, empresaId: string, p: Parametros) {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
  const { error } = await db.from("parametros_costos").upsert(
    { empresa_id: empresaId, vigente_desde: hoy, precio_gasoil: p.precioGasoil, viatico_dia: p.viaticoDia, iibb_pct: p.iibbPct, indice_costos: p.indiceCostos },
    { onConflict: "empresa_id,vigente_desde" },
  );
  fallo(error);
}

export async function guardarUnidad(db: SupabaseClient, id: string, d: Omit<UnidadCosto, "id" | "patente">) {
  const { error } = await db.from("unidades").update({
    consumo_l_100km: d.consumoL100, capacidad_kg: d.capacidadKg || null, amortizacion_km: d.amortizacionKm, cubiertas_km: d.cubiertasKm, mantenimiento_km: d.mantenimientoKm,
  }).eq("id", id);
  fallo(error);
}

export async function guardarChofer(db: SupabaseClient, id: string, costoDia: number) {
  const { error } = await db.from("choferes").update({ costo_dia: costoDia }).eq("id", id);
  fallo(error);
}

export interface ChoferAcceso { id: string; nombre: string; telefono: string | null; tieneAcceso: boolean }
export async function listarChoferesAcceso(db: SupabaseClient): Promise<ChoferAcceso[]> {
  const { data, error } = await db.from("choferes").select("id, nombre, telefono, user_id").eq("activo", true).order("nombre");
  fallo(error);
  return (data ?? []).map((c) => ({ id: c.id, nombre: c.nombre, telefono: c.telefono, tieneAcceso: !!c.user_id }));
}
