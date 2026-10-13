import { diaISO, diasEntre } from "./fechas";

/** Lo mínimo de cada operación para armar los indicadores de plata. */
export interface OpResumen {
  estado: string;
  importe: number;
  costo: number; // real si existe, si no el estimado
  entregadaAt: string | null;
  vencimientoCobro: string | null; // AAAA-MM-DD
}

export interface Resumen {
  enCurso: number;
  margen: number; // sobre lo ya iniciado (excluye pendientes y canceladas)
  sinFacturar: { cantidad: number; monto: number; diasMasVieja: number };
  porCobrar: { cantidad: number; monto: number; vencidas: number; montoVencido: number };
}

const INICIADAS = ["en_carga", "en_transito", "entregada", "facturada", "cobrada"];

export function calcularResumen(ops: OpResumen[], ahora: Date = new Date()): Resumen {
  const hoy = diaISO(ahora);
  const r: Resumen = {
    enCurso: 0,
    margen: 0,
    sinFacturar: { cantidad: 0, monto: 0, diasMasVieja: 0 },
    porCobrar: { cantidad: 0, monto: 0, vencidas: 0, montoVencido: 0 },
  };
  let ingresos = 0;
  let costos = 0;

  for (const o of ops) {
    if (o.estado === "en_carga" || o.estado === "en_transito") r.enCurso++;
    if (INICIADAS.includes(o.estado)) {
      ingresos += o.importe;
      costos += o.costo;
    }
    if (o.estado === "entregada") {
      r.sinFacturar.cantidad++;
      r.sinFacturar.monto += o.importe;
      if (o.entregadaAt) r.sinFacturar.diasMasVieja = Math.max(r.sinFacturar.diasMasVieja, diasEntre(diaISO(o.entregadaAt), hoy));
    }
    if (o.estado === "facturada") {
      r.porCobrar.cantidad++;
      r.porCobrar.monto += o.importe;
      if (o.vencimientoCobro && o.vencimientoCobro < hoy) {
        r.porCobrar.vencidas++;
        r.porCobrar.montoVencido += o.importe;
      }
    }
  }
  r.margen = ingresos > 0 ? (ingresos - costos) / ingresos : 0;
  return r;
}
