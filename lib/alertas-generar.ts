import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularAlertas, claveAlerta, type EntradaAlertas } from "./alertas";

/**
 * Lee los datos de una empresa, calcula qué alertas corresponden hoy, guarda las nuevas y cierra las que ya no aplican.
 * Sirve con la clave de servicio (cron) o con la sesión de una persona (botón "Actualizar ahora"): RLS acota a su empresa.
 */
type Fila = Record<string, unknown>;
const uno = <T,>(x: unknown): T | null => (Array.isArray(x) ? ((x[0] as T) ?? null) : ((x as T) ?? null));
const s = (x: unknown) => (x == null ? null : String(x));

export interface AlertaGuardada { id: string; tipo: string; severidad: string; mensaje: string }

async function leerEntrada(db: SupabaseClient, empresaId: string): Promise<EntradaAlertas> {
  const [v, c, o, m] = await Promise.all([
    db.from("vencimientos").select("id, tipo, fecha_vencimiento, avisar_dias, telefono_aviso, unidades(patente), choferes(nombre, telefono)").eq("empresa_id", empresaId),
    db.from("cotizaciones").select("id, numero, enviada_at, vigencia_hasta, clientes(nombre, telefono)").eq("empresa_id", empresaId).eq("estado", "enviada"),
    db.from("operaciones").select("id, numero, estado, eta, entregada_at, remito_conformado_path, fecha_vencimiento_cobro, importe, clientes(nombre, telefono), choferes(nombre, telefono)").eq("empresa_id", empresaId).in("estado", ["en_carga", "en_transito", "entregada", "facturada"]),
    db.from("mantenimientos").select("id, tipo, proximo_km, unidades(patente, odometro_km)").eq("empresa_id", empresaId),
  ]);
  const err = v.error ?? c.error ?? o.error ?? m.error;
  if (err) throw new Error(err.message);

  return {
    vencimientos: ((v.data ?? []) as Fila[]).map((r) => {
      const u = uno<{ patente: string }>(r.unidades);
      const ch = uno<{ nombre: string; telefono: string | null }>(r.choferes);
      return {
        id: String(r.id), tipo: r.tipo as "seguro" | "vtv" | "licencia" | "otro", sujeto: u?.patente ?? ch?.nombre ?? "sin asignar",
        fecha: String(r.fecha_vencimiento), avisarDias: (r.avisar_dias as number[] | null) ?? [30, 7, 1], telefono: s(r.telefono_aviso) ?? ch?.telefono ?? null,
      };
    }),
    cotizaciones: ((c.data ?? []) as Fila[]).map((r) => {
      const cl = uno<{ nombre: string; telefono: string | null }>(r.clientes);
      return { id: String(r.id), numero: String(r.numero), cliente: cl?.nombre ?? "Sin cliente", telefono: cl?.telefono ?? null, enviadaAt: s(r.enviada_at), vigenciaHasta: s(r.vigencia_hasta) };
    }),
    operaciones: ((o.data ?? []) as Fila[]).map((r) => {
      const cl = uno<{ nombre: string; telefono: string | null }>(r.clientes);
      const ch = uno<{ nombre: string; telefono: string | null }>(r.choferes);
      return {
        id: String(r.id), numero: String(r.numero), estado: String(r.estado), eta: s(r.eta), entregadaAt: s(r.entregada_at), conformado: !!r.remito_conformado_path,
        vencimientoCobro: s(r.fecha_vencimiento_cobro), importe: Number(r.importe), cliente: cl?.nombre ?? "Sin cliente", telefonoCliente: cl?.telefono ?? null,
        chofer: ch?.nombre ?? null, telefonoChofer: ch?.telefono ?? null,
      };
    }),
    mantenimientos: ((m.data ?? []) as Fila[]).map((r) => {
      const u = uno<{ patente: string; odometro_km: number }>(r.unidades);
      return { id: String(r.id), tipo: String(r.tipo), unidad: u?.patente ?? "unidad", proximoKm: Number(r.proximo_km), odometroKm: Number(u?.odometro_km ?? 0) };
    }),
  };
}

export async function generarAlertas(db: SupabaseClient, empresaId: string, ahora: Date = new Date()): Promise<{ nuevas: AlertaGuardada[]; resueltas: number; activas: number }> {
  const activas = calcularAlertas(await leerEntrada(db, empresaId), ahora);

  // 1) Guardar las nuevas. Con ignoreDuplicates solo vuelven las filas realmente insertadas.
  let nuevas: AlertaGuardada[] = [];
  if (activas.length) {
    const { data, error } = await db
      .from("alertas")
      .upsert(
        activas.map((a) => ({ empresa_id: empresaId, tipo: a.tipo, severidad: a.severidad, ref_id: a.refId, dedupe_key: a.dedupeKey, mensaje: a.mensaje, mensaje_wa: a.mensajeWa, telefono: a.telefono })),
        { onConflict: "empresa_id,tipo,ref_id,dedupe_key", ignoreDuplicates: true },
      )
      .select("id, tipo, severidad, mensaje");
    if (error) throw new Error(error.message);
    nuevas = (data ?? []) as AlertaGuardada[];
  }

  // 2) Cerrar las abiertas cuya condición ya no se da (renovaron el seguro, se facturó la entrega, cambió el umbral…)
  const vigentes = new Set(activas.map(claveAlerta));
  const { data: abiertas, error: eAb } = await db.from("alertas").select("id, tipo, ref_id, dedupe_key").eq("empresa_id", empresaId).is("resuelta_at", null);
  if (eAb) throw new Error(eAb.message);
  const obsoletas = (abiertas ?? []).filter((a) => !vigentes.has(claveAlerta({ tipo: a.tipo, refId: a.ref_id, dedupeKey: a.dedupe_key }))).map((a) => a.id as string);
  if (obsoletas.length) {
    const { error } = await db.from("alertas").update({ resuelta_at: new Date().toISOString() }).in("id", obsoletas);
    if (error) throw new Error(error.message);
  }
  return { nuevas, resueltas: obsoletas.length, activas: activas.length };
}
