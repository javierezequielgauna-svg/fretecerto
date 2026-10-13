import type { SupabaseClient } from "@supabase/supabase-js";

export interface Opcion {
  id: string;
  etiqueta: string;
}
export interface Maestros {
  clientes: Opcion[];
  choferes: Opcion[];
  unidades: Opcion[];
}

/** Listas para los desplegables de "Nueva operación". */
export async function listarMaestros(db: SupabaseClient): Promise<Maestros> {
  const [c, ch, u] = await Promise.all([
    db.from("clientes").select("id, nombre").order("nombre"),
    db.from("choferes").select("id, nombre").eq("activo", true).order("nombre"),
    db.from("unidades").select("id, patente").eq("activa", true).order("patente"),
  ]);
  const err = c.error ?? ch.error ?? u.error;
  if (err) throw new Error(err.message);
  return {
    clientes: (c.data ?? []).map((x) => ({ id: x.id as string, etiqueta: x.nombre as string })),
    choferes: (ch.data ?? []).map((x) => ({ id: x.id as string, etiqueta: x.nombre as string })),
    unidades: (u.data ?? []).map((x) => ({ id: x.id as string, etiqueta: x.patente as string })),
  };
}

type Tabla = "clientes" | "choferes" | "unidades";

/** Devuelve el id del registro con ese nombre/patente; si no existe, lo crea. */
export async function asegurar(db: SupabaseClient, tabla: Tabla, empresaId: string, valor: string): Promise<string> {
  const campo = tabla === "unidades" ? "patente" : "nombre";
  const v = tabla === "unidades" ? valor.trim().toUpperCase() : valor.trim();
  const { data: ya } = await db.from(tabla).select("id").eq("empresa_id", empresaId).eq(campo, v).limit(1);
  if (ya && ya[0]) return ya[0].id as string;
  const { data, error } = await db.from(tabla).insert({ empresa_id: empresaId, [campo]: v }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

/** Ruta por origen y destino. Si ya existe se reutiliza tal cual (así no se pierde la caché de Google). */
export async function asegurarRuta(db: SupabaseClient, empresaId: string, origen: string, destino: string, km: number): Promise<string> {
  const o = origen.trim();
  const d = destino.trim();
  const { data: ya } = await db.from("rutas").select("id").eq("empresa_id", empresaId).eq("origen", o).eq("destino", d).limit(1);
  if (ya && ya[0]) return ya[0].id as string;
  const { data, error } = await db.from("rutas").insert({ empresa_id: empresaId, origen: o, destino: d, km, fuente: "manual" }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}
