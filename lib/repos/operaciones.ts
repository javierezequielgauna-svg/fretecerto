import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ESTADOS, type EstadoOperacion } from "@/lib/estados";
import { POR_PAGINA, columnaOrden, type Filtros } from "@/lib/filtros";
import type { OpResumen } from "@/lib/calc/resumen";

/**
 * Repositorio de operaciones. La UI usa solo esta interfaz; las filas se validan con Zod.
 * El orden de los estados lo valida la base (trigger), acá solo se pide el cambio.
 */
const SELECT_FILA =
  "id, numero, estado, importe, costo_estimado, costo_real, eta, created_at, fecha_vencimiento_cobro, remito_conformado_path, clientes(nombre), rutas(origen, destino)";

const SELECT_DETALLE =
  SELECT_FILA.replace("clientes(nombre)", "clientes(nombre, telefono), choferes(nombre), unidades(patente)") +
  ", km, kg, paquetes, fecha_programada, entregada_at, facturada_at, cobrada_at, facturable_at, token_seguimiento";

const num = z.coerce.number();
const filaDb = z.object({
  id: z.string().uuid(),
  numero: z.string(),
  estado: z.enum(ESTADOS),
  importe: num,
  costo_estimado: num,
  costo_real: num.nullable(),
  eta: z.string().nullable(),
  created_at: z.string(),
  fecha_vencimiento_cobro: z.string().nullable(),
  remito_conformado_path: z.string().nullable(),
  clientes: z.object({ nombre: z.string() }).nullable(),
  rutas: z.object({ origen: z.string(), destino: z.string() }).nullable(),
});

export interface OperacionFila {
  id: string;
  numero: string;
  estado: EstadoOperacion;
  importe: number;
  costo: number; // real si existe, si no el estimado
  eta: string | null;
  creada: string;
  vencimientoCobro: string | null;
  conformado: boolean;
  cliente: string;
  origen: string | null;
  destino: string | null;
}

const aFila = (f: z.infer<typeof filaDb>): OperacionFila => ({
  id: f.id,
  numero: f.numero,
  estado: f.estado,
  importe: f.importe,
  costo: f.costo_real ?? f.costo_estimado,
  eta: f.eta,
  creada: f.created_at,
  vencimientoCobro: f.fecha_vencimiento_cobro,
  conformado: !!f.remito_conformado_path,
  cliente: f.clientes?.nombre ?? "Sin cliente",
  origen: f.rutas?.origen ?? null,
  destino: f.rutas?.destino ?? null,
});

const detalleDb = filaDb.extend({
  km: num,
  kg: num,
  paquetes: z.coerce.number(),
  fecha_programada: z.string().nullable(),
  entregada_at: z.string().nullable(),
  facturada_at: z.string().nullable(),
  cobrada_at: z.string().nullable(),
  facturable_at: z.string().nullable(),
  token_seguimiento: z.string().uuid(),
  clientes: z.object({ nombre: z.string(), telefono: z.string().nullable() }).nullable(),
  choferes: z.object({ nombre: z.string() }).nullable(),
  unidades: z.object({ patente: z.string() }).nullable(),
});

export interface OperacionDetalle extends OperacionFila {
  km: number;
  kg: number;
  paquetes: number;
  fechaProgramada: string | null;
  entregadaAt: string | null;
  facturadaAt: string | null;
  cobradaAt: string | null;
  facturableAt: string | null;
  token: string;
  costoReal: number | null;
  telefonoCliente: string | null;
  chofer: string | null;
  patente: string | null;
}

export interface EventoOperacion {
  estado: EstadoOperacion;
  at: string;
}

export interface NuevaOperacion {
  empresaId: string;
  numero: string;
  clienteId: string;
  rutaId: string;
  choferId: string | null;
  unidadId: string | null;
  km: number;
  kmVacios?: number; // retorno sin carga
  importe: number;
  costoEstimado: number;
  fechaProgramada: string | null;
}

export interface OperacionesRepo {
  listarPagina(f: Filtros): Promise<{ filas: OperacionFila[]; total: number }>;
  resumenBase(): Promise<OpResumen[]>;
  obtener(id: string): Promise<OperacionDetalle | null>;
  eventos(id: string): Promise<EventoOperacion[]>;
  avanzar(id: string, estado: EstadoOperacion): Promise<void>;
  /** Costo real del viaje (reemplaza al estimado en el margen y la rentabilidad). */
  guardarCostoReal(id: string, costo: number): Promise<void>;
  siguienteNumero(empresaId: string): Promise<number>;
  crear(d: NuevaOperacion): Promise<string>;
}

export function crearOperacionesRepo(db: SupabaseClient): OperacionesRepo {
  return {
    async listarPagina(f) {
      let q = db.from("operaciones").select(SELECT_FILA, { count: "exact" });
      if (f.estado === "curso") q = q.in("estado", ["en_carga", "en_transito"]);
      else if (f.estado) q = q.eq("estado", f.estado);

      if (f.q) {
        // Busca por número de operación o por nombre de cliente
        const { data: cl } = await db.from("clientes").select("id").ilike("nombre", `%${f.q}%`).limit(50);
        const ids = (cl ?? []).map((c) => c.id as string);
        const partes = [`numero.ilike.%${f.q}%`];
        if (ids.length) partes.push(`cliente_id.in.(${ids.join(",")})`);
        q = q.or(partes.join(","));
      }

      const { column, ascending } = columnaOrden(f.o);
      const desde = (f.pag - 1) * POR_PAGINA;
      q = q.order(column, { ascending }).order("created_at", { ascending: false }).range(desde, desde + POR_PAGINA - 1);

      const { data, error, count } = await q;
      if (error) throw new Error(`No se pudieron cargar las operaciones: ${error.message}`);
      return { filas: z.array(filaDb).parse(data ?? []).map(aFila), total: count ?? 0 };
    },

    async resumenBase() {
      const { data, error } = await db
        .from("operaciones")
        .select("estado, importe, costo_estimado, costo_real, entregada_at, fecha_vencimiento_cobro")
        .neq("estado", "cancelada")
        .limit(5000);
      if (error) throw new Error(`No se pudo calcular el resumen: ${error.message}`);
      return (data ?? []).map((r) => ({
        estado: r.estado as string,
        importe: Number(r.importe),
        costo: Number(r.costo_real ?? r.costo_estimado),
        entregadaAt: (r.entregada_at as string | null) ?? null,
        vencimientoCobro: (r.fecha_vencimiento_cobro as string | null) ?? null,
      }));
    },

    async obtener(id) {
      const { data, error } = await db.from("operaciones").select(SELECT_DETALLE).eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const f = detalleDb.parse(data);
      return {
        ...aFila(f),
        km: f.km,
        kg: f.kg,
        paquetes: f.paquetes,
        fechaProgramada: f.fecha_programada,
        entregadaAt: f.entregada_at,
        facturadaAt: f.facturada_at,
        cobradaAt: f.cobrada_at,
        facturableAt: f.facturable_at,
        token: f.token_seguimiento,
        costoReal: f.costo_real,
        telefonoCliente: f.clientes?.telefono ?? null,
        chofer: f.choferes?.nombre ?? null,
        patente: f.unidades?.patente ?? null,
      };
    },

    async eventos(id) {
      const { data, error } = await db.from("eventos_operacion").select("estado, at").eq("operacion_id", id).order("at");
      if (error) throw new Error(error.message);
      return z.array(z.object({ estado: z.enum(ESTADOS), at: z.string() })).parse(data ?? []);
    },

    async avanzar(id, estado) {
      const { error } = await db.rpc("avanzar_operacion", { p_op: id, p_estado: estado });
      if (error) throw new Error(error.message);
    },

    async guardarCostoReal(id, costo) {
      const { data, error } = await db.from("operaciones").update({ costo_real: costo }).eq("id", id).select("id");
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error("No se pudo guardar: no tenés permiso o la operación no existe");
    },

    async siguienteNumero(empresaId) {
      const { data, error } = await db.rpc("siguiente_numero", { p_empresa: empresaId, p_clave: "operacion" });
      if (error) throw new Error(error.message);
      return Number(data);
    },

    async crear(d) {
      const { data, error } = await db
        .from("operaciones")
        .insert({
          empresa_id: d.empresaId,
          numero: d.numero,
          cliente_id: d.clienteId,
          ruta_id: d.rutaId,
          chofer_id: d.choferId,
          unidad_id: d.unidadId,
          km: d.km,
          km_vacios: d.kmVacios ?? 0,
          importe: d.importe,
          costo_estimado: d.costoEstimado,
          fecha_programada: d.fechaProgramada,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
  };
}
