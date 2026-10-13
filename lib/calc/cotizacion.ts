import {
  calcularCostos, costoRetornoVacio, kgFacturables, margenReal, nivelMargen, ocupacion, porcentajeVacio,
  precioParaMargen, precioPorTarifa, puntoEquilibrio, redondear,
  type DesgloseCostos, type EntradaCostos, type NivelMargen,
} from "./pricing";

export type Modo = "viaje" | "kilo" | "paquete";

export interface EntradaCotizacion extends EntradaCostos {
  modo: Modo;
  margen: number; // objetivo, como fracción
  iibb: number; // como fracción
  kgReales: number;
  kgVolumetricos: number;
  paquetes: number;
  tarifaMinima: number; // piso por viaje
  capacidadKg: number;
  tarifaPrueba: number; // total (viaje) o $/kg o $/paquete; 0 = sin prueba
}

export interface ResultadoCotizacion {
  costos: DesgloseCostos;
  kgFacturables: number;
  unidades: number; // kg facturables o paquetes, según el modo (0 en "viaje")
  precioSugerido: number; // sin IVA
  precioFinal: number; // el sugerido, o el que resulta de la tarifa que probás
  precioConIva: number;
  tarifaSugerida: number | null; // $/kg o $/paquete
  tarifaFinal: number | null;
  margen: number; // real, sobre el precio final
  nivel: NivelMargen;
  ocupacion: number;
  pctVacio: number;
  costoRetornoVacio: number;
  equilibrio: number | null; // unidades mínimas con la tarifa probada
}

const IVA = 0.21;
const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** Arma toda la cotización. Lanza RangeError si margen + IIBB llegan al 100 %. */
export function cotizar(e: EntradaCotizacion): ResultadoCotizacion {
  const costos = calcularCostos(e);
  const kgFact = kgFacturables(e.kgReales, e.kgVolumetricos);
  const unidades = e.modo === "kilo" ? kgFact : e.modo === "paquete" ? pos(e.paquetes) : 0;

  // El precio por costo y margen no puede quedar por debajo de la tarifa mínima del viaje
  const precioSugerido = Math.max(precioParaMargen(costos.total, e.margen, e.iibb), redondear(pos(e.tarifaMinima)));
  const prueba = pos(e.tarifaPrueba) > 0;
  const precioFinal = !prueba ? precioSugerido : e.modo === "viaje" ? redondear(e.tarifaPrueba) : precioPorTarifa(unidades, e.tarifaPrueba, e.tarifaMinima);

  const m = margenReal(precioFinal, costos.total, e.iibb);
  return {
    costos,
    kgFacturables: kgFact,
    unidades,
    precioSugerido,
    precioFinal,
    precioConIva: redondear(precioFinal * (1 + IVA)),
    tarifaSugerida: unidades > 0 ? redondear(precioSugerido / unidades) : null,
    tarifaFinal: unidades > 0 ? redondear(precioFinal / unidades) : null,
    margen: m,
    nivel: nivelMargen(m, e.margen),
    ocupacion: ocupacion(e.kgReales, e.capacidadKg),
    pctVacio: porcentajeVacio(e.km, e.vuelveVacio ? e.km : 0),
    costoRetornoVacio: costoRetornoVacio(e),
    equilibrio: prueba && e.modo !== "viaje" ? puntoEquilibrio(costos.total, e.tarifaPrueba, e.iibb) : null,
  };
}
