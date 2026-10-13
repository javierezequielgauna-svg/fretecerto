import { ESTADOS, type EstadoOperacion } from "./estados";

/** Filtros de la tabla de operaciones. Viven en la URL: se pueden compartir y andan el botón "Atrás". */
export const ORDENES = ["fecha_desc", "fecha_asc", "numero_asc", "numero_desc", "importe_desc", "importe_asc", "estado_asc", "estado_desc"] as const;
export type Orden = (typeof ORDENES)[number];
export type FiltroEstado = EstadoOperacion | "curso"; // "curso" = en carga + en tránsito
export const POR_PAGINA = 10;

export interface Filtros {
  estado?: FiltroEstado;
  q: string;
  o: Orden;
  pag: number;
}
type Params = Record<string, string | string[] | undefined>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Saca los caracteres que rompen la sintaxis de búsqueda de PostgREST. */
export const sanitizarBusqueda = (q: string): string => q.replace(/[%,()*\\"'_]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

export function leerFiltros(sp: Params): Filtros {
  const e = uno(sp.estado) ?? "";
  const o = uno(sp.o) ?? "";
  const pag = Number.parseInt(uno(sp.pag) ?? "1", 10);
  return {
    estado: e === "curso" || (ESTADOS as readonly string[]).includes(e) ? (e as FiltroEstado) : undefined,
    q: sanitizarBusqueda(uno(sp.q) ?? ""),
    o: (ORDENES as readonly string[]).includes(o) ? (o as Orden) : "fecha_desc",
    pag: Number.isFinite(pag) && pag > 0 ? pag : 1,
  };
}

/** Arma la URL aplicando cambios sobre los filtros actuales (usá pag: 1 al cambiar filtros). */
export function urlOperaciones(f: Filtros, cambios: Partial<Filtros> = {}): string {
  const n = { ...f, ...cambios };
  const p = new URLSearchParams();
  if (n.estado) p.set("estado", n.estado);
  if (n.q) p.set("q", n.q);
  if (n.o !== "fecha_desc") p.set("o", n.o);
  if (n.pag > 1) p.set("pag", String(n.pag));
  const s = p.toString();
  return s ? `/operaciones?${s}` : "/operaciones";
}

const COLUMNAS = { fecha: "created_at", numero: "numero", importe: "importe", estado: "estado" } as const;
export function columnaOrden(o: Orden): { column: string; ascending: boolean } {
  const [campo, dir] = o.split("_") as [keyof typeof COLUMNAS, string];
  return { column: COLUMNAS[campo], ascending: dir === "asc" };
}
