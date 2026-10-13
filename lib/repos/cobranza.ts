import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const num = z.coerce.number();
const fila = z.object({
  cliente_id: z.string().uuid(),
  nombre: z.string(),
  cobradas: num,
  dias_prom_cobro: num.nullable(),
  sin_facturar: num,
  por_cobrar: num,
  puntaje: num,
});

export interface CobranzaCliente {
  clienteId: string;
  nombre: string;
  cobradas: number;
  diasPromCobro: number | null;
  sinFacturar: number;
  porCobrar: number;
  puntaje: number;
}

/** Lee la vista v_cobranza_cliente (respeta RLS: cada empresa ve solo lo suyo). */
export async function cobranzaPorCliente(db: SupabaseClient): Promise<CobranzaCliente[]> {
  const { data, error } = await db.from("v_cobranza_cliente").select("*").order("por_cobrar", { ascending: false });
  if (error) throw new Error(`No se pudo cargar la cobranza: ${error.message}`);
  return z.array(fila).parse(data ?? []).map((f) => ({
    clienteId: f.cliente_id,
    nombre: f.nombre,
    cobradas: f.cobradas,
    diasPromCobro: f.dias_prom_cobro,
    sinFacturar: f.sin_facturar,
    porCobrar: f.por_cobrar,
    puntaje: f.puntaje,
  }));
}
