import type { SupabaseClient } from "@supabase/supabase-js";
import type { Severidad, TipoAlerta } from "@/lib/alertas";

export interface AlertaFila {
  id: string; tipo: TipoAlerta; severidad: Severidad; mensaje: string; mensajeWa: string | null; telefono: string | null; generada: string; mailEnviado: boolean;
}

export async function listarAbiertas(db: SupabaseClient): Promise<AlertaFila[]> {
  const { data, error } = await db.from("alertas").select("id, tipo, severidad, mensaje, mensaje_wa, telefono, generada_at, notificada_at").is("resuelta_at", null).order("generada_at", { ascending: false }).limit(200);
  if (error) throw new Error(`No se pudieron cargar las alertas: ${error.message}`);
  return (data ?? []).map((a) => ({
    id: a.id, tipo: a.tipo, severidad: a.severidad, mensaje: a.mensaje, mensajeWa: a.mensaje_wa, telefono: a.telefono, generada: a.generada_at, mailEnviado: !!a.notificada_at,
  }));
}

export async function contarUrgentes(db: SupabaseClient, empresaId: string): Promise<number> {
  const { count } = await db.from("alertas").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId).eq("severidad", "urgente").is("resuelta_at", null);
  return count ?? 0;
}

export async function silenciarAlerta(db: SupabaseClient, id: string) {
  const { error } = await db.from("alertas").update({ resuelta_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}
