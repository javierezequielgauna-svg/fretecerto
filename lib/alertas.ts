import { diaISO, diasEntre } from "./calc/fechas";
import { estadoVisible } from "./cotizaciones";
import { ars, fechaAR, plural } from "./format";

/**
 * Reglas de las alertas: funciones puras. Reciben datos ya leídos y devuelven las alertas que hoy corresponden.
 * Cada alerta lleva una `dedupeKey` que cambia cuando cambia el umbral (por ejemplo "vence en 7 días" -> "vence en 1 día"),
 * así avisa una sola vez por umbral y no todos los días.
 */
export type TipoAlerta = "vencimiento" | "cotizacion" | "demora" | "sin_facturar" | "factura_vencida" | "service";
export type Severidad = "info" | "atencion" | "urgente";

export interface AlertaCalculada {
  tipo: TipoAlerta;
  severidad: Severidad;
  refId: string;
  dedupeKey: string;
  mensaje: string;
  mensajeWa: string | null;
  telefono: string | null;
}

export interface VencimientoIn { id: string; tipo: "seguro" | "vtv" | "licencia" | "otro"; sujeto: string; fecha: string; avisarDias: number[]; telefono: string | null }
export interface CotizacionIn { id: string; numero: string; cliente: string; telefono: string | null; enviadaAt: string | null; vigenciaHasta: string | null }
export interface OperacionIn {
  id: string; numero: string; estado: string; eta: string | null; entregadaAt: string | null; conformado: boolean;
  vencimientoCobro: string | null; importe: number; cliente: string; telefonoCliente: string | null; chofer: string | null; telefonoChofer: string | null;
}
export interface MantenimientoIn { id: string; tipo: string; unidad: string; proximoKm: number; odometroKm: number }
export interface EntradaAlertas { vencimientos: VencimientoIn[]; cotizaciones: CotizacionIn[]; operaciones: OperacionIn[]; mantenimientos: MantenimientoIn[] }

const ETIQUETA = { seguro: "El seguro", vtv: "La VTV", licencia: "La licencia de conducir", otro: "El vencimiento" } as const;
const km = (n: number) => new Intl.NumberFormat("es-AR").format(Math.round(n));
const duracion = (min: number) => (min < 90 ? `${Math.round(min)} min` : `${(Math.round(min / 6) / 10).toLocaleString("es-AR")} h`);

/** El umbral más chico que ya se alcanzó (con 25 días y avisos [30, 7, 1] da 30). null si todavía no toca avisar. */
export function umbralAlcanzado(dias: number, avisar: number[]): number | null {
  for (const t of [...avisar].sort((a, b) => a - b)) if (dias <= t) return t;
  return null;
}

export function alertasVencimientos(lista: VencimientoIn[], hoy: string): AlertaCalculada[] {
  const out: AlertaCalculada[] = [];
  for (const v of lista) {
    const dias = diasEntre(hoy, v.fecha);
    const t = dias < 0 ? 0 : umbralAlcanzado(dias, v.avisarDias);
    if (t === null) continue;
    const cuando = dias < 0 ? `venció hace ${plural(-dias, "día", "días")}` : dias === 0 ? "vence hoy" : `vence en ${plural(dias, "día", "días")}`;
    const fecha = fechaAR(v.fecha);
    out.push({
      tipo: "vencimiento",
      severidad: dias < 0 || t <= 7 ? "urgente" : "atencion",
      refId: v.id,
      dedupeKey: dias < 0 ? `${v.fecha}:vencido` : `${v.fecha}:${t}`,
      mensaje: `${ETIQUETA[v.tipo]} de ${v.sujeto} ${cuando} (${fecha}).`,
      mensajeWa: `Hola! Te aviso que ${ETIQUETA[v.tipo].toLowerCase()} de ${v.sujeto} ${dias < 0 ? "venció" : "vence"} el ${fecha}. Por favor renovalo cuanto antes. Gracias!`,
      telefono: v.telefono,
    });
  }
  return out;
}

export function alertasCotizaciones(lista: CotizacionIn[], ahora: Date): AlertaCalculada[] {
  const out: AlertaCalculada[] = [];
  for (const c of lista) {
    const v = estadoVisible({ estado: "enviada", enviadaAt: c.enviadaAt, vigenciaHasta: c.vigenciaHasta }, ahora);
    const wa = `Hola! Quería saber si pudiste revisar la cotización ${c.numero} que te enviamos${c.enviadaAt ? ` el ${fechaAR(c.enviadaAt)}` : ""}. Quedo atento. Gracias!`;
    if (v.estado === "sin_respuesta") {
      out.push({
        tipo: "cotizacion", severidad: v.urgencia === "bad" ? "urgente" : "atencion", refId: c.id, dedupeKey: v.dias >= 7 ? "sr:7" : "sr:3",
        mensaje: `${c.numero} (${c.cliente}) lleva ${plural(v.dias, "día", "días")} sin respuesta.`, mensajeWa: wa, telefono: c.telefono,
      });
    } else if (v.estado === "vencida") {
      out.push({
        tipo: "cotizacion", severidad: "atencion", refId: c.id, dedupeKey: "vencida",
        mensaje: `${c.numero} (${c.cliente}) venció sin respuesta.`, mensajeWa: wa, telefono: c.telefono,
      });
    }
  }
  return out;
}

export function alertasOperaciones(lista: OperacionIn[], ahora: Date): AlertaCalculada[] {
  const hoy = diaISO(ahora);
  const out: AlertaCalculada[] = [];
  for (const o of lista) {
    if ((o.estado === "en_carga" || o.estado === "en_transito") && o.eta) {
      const min = (ahora.getTime() - new Date(o.eta).getTime()) / 60_000;
      if (min > 0) {
        out.push({
          tipo: "demora", severidad: min > 120 ? "urgente" : "atencion", refId: o.id, dedupeKey: min > 120 ? "d2" : "d0",
          mensaje: `${o.numero} (${o.cliente}) viene demorada ${duracion(min)}.`,
          mensajeWa: `Hola! La carga ${o.numero} tenía llegada prevista a las ${new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Cordoba" }).format(new Date(o.eta))}. ¿Me confirmás en qué punto está?`,
          telefono: o.telefonoChofer,
        });
      }
    }
    if (o.estado === "entregada" && o.entregadaAt) {
      const dias = diasEntre(diaISO(o.entregadaAt), hoy);
      if (dias >= 2) {
        out.push({
          tipo: "sin_facturar", severidad: dias >= 5 ? "urgente" : "atencion", refId: o.id, dedupeKey: dias >= 5 ? "sf:5" : "sf:2",
          mensaje: `${o.numero} (${o.cliente}) entregada hace ${plural(dias, "día", "días")} y sin facturar${o.conformado ? "" : ": falta el remito firmado"}.`,
          mensajeWa: o.conformado ? null : `Hola! Falta la foto del remito firmado de la carga ${o.numero}. ¿Me la podés mandar? Gracias!`,
          telefono: o.conformado ? null : o.telefonoChofer,
        });
      }
    }
    if (o.estado === "facturada" && o.vencimientoCobro && o.vencimientoCobro < hoy) {
      const mora = diasEntre(o.vencimientoCobro, hoy);
      out.push({
        tipo: "factura_vencida", severidad: "urgente", refId: o.id, dedupeKey: `fv:${o.vencimientoCobro}:${mora >= 15 ? 15 : mora >= 7 ? 7 : 1}`,
        mensaje: `${o.numero} (${o.cliente}): ${ars(o.importe)} vencidos hace ${plural(mora, "día", "días")}.`,
        mensajeWa: `Hola! Te escribo por la factura de la operación ${o.numero} (${ars(o.importe)}), que venció el ${fechaAR(o.vencimientoCobro)}. ¿Me confirmás cuándo la van a abonar? Gracias!`,
        telefono: o.telefonoCliente,
      });
    }
  }
  return out;
}

/** Aviso a 1.000 km del próximo service y cuando ya se pasó. */
export function alertasMantenimiento(lista: MantenimientoIn[]): AlertaCalculada[] {
  const out: AlertaCalculada[] = [];
  for (const m of lista) {
    const restante = m.proximoKm - m.odometroKm;
    if (restante > 1000) continue;
    out.push({
      tipo: "service", severidad: restante <= 0 ? "urgente" : "atencion", refId: m.id, dedupeKey: `m:${m.proximoKm}:${restante <= 0 ? 0 : 1000}`,
      mensaje: restante <= 0 ? `${m.tipo} de ${m.unidad}: ya pasaste los ${km(m.proximoKm)} km (hoy ${km(m.odometroKm)} km).` : `${m.tipo} de ${m.unidad}: faltan ${km(restante)} km (toca a los ${km(m.proximoKm)} km).`,
      mensajeWa: null, telefono: null,
    });
  }
  return out;
}

export function calcularAlertas(e: EntradaAlertas, ahora: Date = new Date()): AlertaCalculada[] {
  return [
    ...alertasVencimientos(e.vencimientos, diaISO(ahora)),
    ...alertasCotizaciones(e.cotizaciones, ahora),
    ...alertasOperaciones(e.operaciones, ahora),
    ...alertasMantenimiento(e.mantenimientos),
  ];
}

export const claveAlerta = (a: { tipo: string; refId: string | null; dedupeKey: string }) => `${a.tipo}|${a.refId}|${a.dedupeKey}`;
