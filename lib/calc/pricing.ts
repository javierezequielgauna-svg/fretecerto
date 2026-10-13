/**
 * Cálculos de costos y precios. Funciones puras: sin red, sin base, fáciles de testear.
 * Convención: los porcentajes van como fracción (0,30 = 30 %).
 * Ingresos Brutos (iibb) se trata como un % sobre el precio: valores a validar con tu contador.
 */

/** Redondea a centavos. */
export const redondear = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Número finito y no negativo; cualquier otra cosa cuenta como 0. */
const nn = (n: number | undefined): number => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0);

export interface EntradaCostos {
  km: number; // km cargados, un sentido
  vuelveVacio: boolean; // si vuelve sin carga se cuentan ida y vuelta
  consumoL100: number; // litros cada 100 km
  precioGasoil: number; // $/litro
  peajes: number; // total del viaje
  dias: number;
  viaticoDia: number;
  costoChoferDia?: number; // sueldo + cargas, $/día
  desgasteKm?: number; // amortización + cubiertas + mantenimiento, $/km
  otros?: number;
}

export interface DesgloseCostos {
  kmTotales: number;
  litros: number;
  combustible: number;
  peajes: number;
  viaticos: number;
  chofer: number;
  desgaste: number;
  otros: number;
  total: number;
}

export function calcularCostos(e: EntradaCostos): DesgloseCostos {
  const kmTotales = nn(e.km) * (e.vuelveVacio ? 2 : 1);
  const litros = (kmTotales * nn(e.consumoL100)) / 100;
  const combustible = litros * nn(e.precioGasoil);
  const peajes = nn(e.peajes);
  const viaticos = nn(e.dias) * nn(e.viaticoDia);
  const chofer = nn(e.dias) * nn(e.costoChoferDia);
  const desgaste = kmTotales * nn(e.desgasteKm);
  const otros = nn(e.otros);
  const total = combustible + peajes + viaticos + chofer + desgaste + otros;
  return {
    kmTotales,
    litros,
    combustible: redondear(combustible),
    peajes: redondear(peajes),
    viaticos: redondear(viaticos),
    chofer: redondear(chofer),
    desgaste: redondear(desgaste),
    otros: redondear(otros),
    total: redondear(total),
  };
}

/**
 * Precio (sin IVA) para ganar `margen` sobre el precio, ya descontado IIBB.
 * precio = costo / (1 - margen - iibb). Es margen sobre venta, no un recargo sobre el costo.
 */
export function precioParaMargen(costo: number, margen: number, iibb = 0): number {
  if (margen < 0 || iibb < 0 || margen + iibb >= 1) {
    throw new RangeError("El margen más IIBB debe ser menor al 100 %");
  }
  return redondear(nn(costo) / (1 - margen - iibb));
}

/** Margen real sobre el precio, después de IIBB. Puede ser negativo. */
export function margenReal(precio: number, costo: number, iibb = 0): number {
  if (!(precio > 0)) return 0;
  return (precio * (1 - iibb) - nn(costo)) / precio;
}

export type NivelMargen = "ok" | "bajo" | "perdida";

/** Margen de error por redondear el precio a centavos (0,01 puntos): un precio calculado para 30 % no debe figurar "bajo". */
export const TOLERANCIA_MARGEN = 1e-4;

export function nivelMargen(margen: number, objetivo: number): NivelMargen {
  if (margen < 0) return "perdida";
  return margen + TOLERANCIA_MARGEN < objetivo ? "bajo" : "ok";
}

/** Unidades (kg o paquetes) mínimas para no perder plata con una tarifa dada. null si no hay tarifa. */
export function puntoEquilibrio(costo: number, tarifa: number, iibb = 0): number | null {
  if (!(tarifa > 0)) return null;
  return Math.ceil(nn(costo) / (tarifa * (1 - iibb)) - 1e-9);
}

export interface Bulto {
  largoCm: number;
  anchoCm: number;
  altoCm: number;
  cantidad: number;
}

/**
 * Peso volumétrico en kg. `factor` = kg por m³ (250 es un valor habitual en cargas por ruta;
 * confirmalo con tus clientes y tu tarifario).
 */
export function pesoVolumetricoKg(bultos: Bulto[], factor = 250): number {
  const m3 = bultos.reduce((acc, b) => acc + ((nn(b.largoCm) * nn(b.anchoCm) * nn(b.altoCm)) / 1e6) * nn(b.cantidad), 0);
  return redondear(m3 * factor);
}

/** Se cobra el mayor entre el peso real y el volumétrico. */
export const kgFacturables = (real: number, volumetrico: number): number => Math.max(nn(real), nn(volumetrico));

/** Precio por tarifa unitaria ($/kg o $/paquete), respetando una tarifa mínima por viaje. */
export function precioPorTarifa(unidades: number, tarifa: number, minimoViaje = 0): number {
  return redondear(Math.max(nn(unidades) * nn(tarifa), nn(minimoViaje)));
}

/** Tarifa por unidad que hace falta para llegar al margen objetivo. null si no hay unidades. */
export function tarifaSugeridaPorUnidad(costo: number, margen: number, unidades: number, iibb = 0): number | null {
  if (!(unidades > 0)) return null;
  return redondear(precioParaMargen(costo, margen, iibb) / unidades);
}

/** Ocupación del camión (0 a 1, puede pasar de 1 si hay sobrecarga). */
export const ocupacion = (kg: number, capacidadKg: number): number => (capacidadKg > 0 ? nn(kg) / capacidadKg : 0);

/** Fracción de km recorridos sin carga. */
export function porcentajeVacio(kmCargados: number, kmVacios: number): number {
  const total = nn(kmCargados) + nn(kmVacios);
  return total > 0 ? nn(kmVacios) / total : 0;
}

/** Lo que cuesta volver sin carga: combustible y desgaste de los km de retorno. 0 si no vuelve vacío. */
export function costoRetornoVacio(e: EntradaCostos): number {
  if (!e.vuelveVacio) return 0;
  const km = nn(e.km);
  return redondear(((km * nn(e.consumoL100)) / 100) * nn(e.precioGasoil) + km * nn(e.desgasteKm));
}
