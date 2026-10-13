import { describe, it, expect } from "vitest";
import { cotizar, type EntradaCotizacion } from "./cotizacion";
import { costoRetornoVacio } from "./pricing";
import { estadoVisible } from "../cotizaciones";

const base: EntradaCotizacion = {
  km: 145, vuelveVacio: true, consumoL100: 35, precioGasoil: 1450, peajes: 18500, dias: 1, viaticoDia: 45000, otros: 12000,
  modo: "viaje", margen: 0.3, iibb: 0, kgReales: 8000, kgVolumetricos: 0, paquetes: 0, tarifaMinima: 0, capacidadKg: 16000, tarifaPrueba: 0,
};

describe("cotizar", () => {
  it("por viaje: precio para el margen objetivo", () => {
    const r = cotizar(base);
    expect(r.costos.total).toBe(222675);
    expect(r.precioSugerido).toBe(318107.14);
    expect(r.precioFinal).toBe(318107.14);
    expect(r.margen).toBeCloseTo(0.3, 6);
    expect(r.nivel).toBe("ok");
    expect(r.precioConIva).toBe(384909.64);
  });
  it("por kilo: tarifa sugerida y ocupación", () => {
    const r = cotizar({ ...base, modo: "kilo" });
    expect(r.unidades).toBe(8000);
    expect(r.tarifaSugerida).toBe(39.76);
    expect(r.ocupacion).toBe(0.5);
  });
  it("por kilo: cobra el peso volumétrico si es mayor", () => {
    expect(cotizar({ ...base, modo: "kilo", kgVolumetricos: 10000 }).unidades).toBe(10000);
  });
  it("la tarifa mínima funciona como piso", () => {
    expect(cotizar({ ...base, tarifaMinima: 400000 }).precioSugerido).toBe(400000);
  });
  it("por paquete con tarifa de prueba: margen y equilibrio", () => {
    const r = cotizar({ ...base, modo: "paquete", paquetes: 120, tarifaPrueba: 3000 });
    expect(r.precioFinal).toBe(360000);
    expect(r.tarifaFinal).toBe(3000);
    expect(r.margen).toBeCloseTo(1 - 222675 / 360000, 6);
    expect(r.equilibrio).toBe(75);
  });
  it("una tarifa baja da pérdida", () => {
    const r = cotizar({ ...base, modo: "kilo", tarifaPrueba: 20 });
    expect(r.precioFinal).toBe(160000);
    expect(r.nivel).toBe("perdida");
  });
  it("un precio probado en viaje reemplaza al sugerido", () => {
    expect(cotizar({ ...base, tarifaPrueba: 250000 }).precioFinal).toBe(250000);
  });
  it("con IIBB sube el precio", () => {
    expect(cotizar({ ...base, iibb: 0.03 }).precioSugerido).toBe(332350.75);
  });
  it("margen + IIBB de 100 % o más lanza error", () => {
    expect(() => cotizar({ ...base, margen: 0.9, iibb: 0.1 })).toThrow(RangeError);
  });
  it("km vacíos y su costo", () => {
    const r = cotizar(base);
    expect(r.pctVacio).toBe(0.5);
    expect(r.costoRetornoVacio).toBe(73587.5);
    expect(costoRetornoVacio({ ...base, vuelveVacio: false })).toBe(0);
    expect(cotizar({ ...base, vuelveVacio: false }).pctVacio).toBe(0);
  });
});

describe("estado visible de la cotización", () => {
  const ahora = new Date("2026-10-11T15:00:00Z");
  const futuro = "2026-10-20T00:00:00Z";
  it("borrador y aceptada pasan tal cual", () => {
    expect(estadoVisible({ estado: "borrador", enviadaAt: null, vigenciaHasta: null }, ahora).estado).toBe("borrador");
    expect(estadoVisible({ estado: "aceptada", enviadaAt: "2026-10-01T12:00:00Z", vigenciaHasta: null }, ahora).estado).toBe("aceptada");
  });
  it("enviada hace poco sigue en espera", () => {
    expect(estadoVisible({ estado: "enviada", enviadaAt: "2026-10-10T12:00:00Z", vigenciaHasta: futuro }, ahora)).toEqual({ estado: "enviada", dias: 1, urgencia: "ok" });
  });
  it("3 días sin respuesta: atención; 7: urgente", () => {
    expect(estadoVisible({ estado: "enviada", enviadaAt: "2026-10-08T12:00:00Z", vigenciaHasta: futuro }, ahora).urgencia).toBe("warn");
    expect(estadoVisible({ estado: "enviada", enviadaAt: "2026-10-04T12:00:00Z", vigenciaHasta: futuro }, ahora).urgencia).toBe("bad");
  });
  it("pasada la vigencia queda vencida", () => {
    expect(estadoVisible({ estado: "enviada", enviadaAt: "2026-10-09T12:00:00Z", vigenciaHasta: "2026-10-11T12:00:00Z" }, ahora).estado).toBe("vencida");
  });
});
