import type { SupabaseClient } from "@supabase/supabase-js";

export interface RemitoFila { id: string; numero: string; fecha: string; tienePdf: boolean }

export async function listarRemitos(db: SupabaseClient, operacionId: string): Promise<RemitoFila[]> {
  const { data, error } = await db.from("remitos").select("id, punto_venta, numero, fecha, pdf_path").eq("operacion_id", operacionId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id, numero: `${r.punto_venta}-${String(r.numero).padStart(8, "0")}`, fecha: r.fecha as string, tienePdf: !!r.pdf_path,
  }));
}
