import { describe, it, expect } from "vitest";
import {
  calcularCostos, precioParaMargen, margenReal, nivelMargen, puntoEquilibrio,
  pesoVolumetricoKg, kgFacturables, precioPorTarifa, tarifaSugeridaPorUnidad, ocupacion, porcentajeVacio,
} from "./pricing";

const viaje = { km: 145, vuelveVacio: true, consumoL100: 35, precioGasoil: 1450, peajes: 18500, dias: 1, viaticoDia: 45000, otros: 12000 };

describe("calcularCostos", () => {
  it("suma combustible, peajes, viáticos y otros", () => {
    const c = calcularCostos(viaje);
    expect(c.kmTotales).toBe(290);
    expect(c.litros).toBeCloseTo(101.5, 6);
    expect(c.combustible).toBe(147175);
    expect(c.total).toBe(222675);
  });
  it("cuenta solo un sentido si no vuelve vacío", () => {
    expect(calcularCostos({ ...viaje, vuelveVacio: false }).kmTotales).toBe(145);
  });
  it("ignora valores inválidos", () => {
    expect(calcularCostos({ ...viaje, peajes: -5, otros: NaN }).total).toBe(147175 + 45000);
  });
  it("suma chofer y desgaste cuando se cargan", () => {
    const c = calcularCostos({ ...viaje, costoChoferDia: 30000, desgasteKm: 100 });
    expect(c.chofer).toBe(30000);
    expect(c.desgaste).toBe(29000);
  });
});

describe("precio y margen", () => {
  it("el precio sale de dividir por (1 - margen)", () => {
    expect(precioParaMargen(222675, 0.3)).toBe(318107.14);
  });
  it("incluye IIBB en el divisor", () => {
    expect(precioParaMargen(222675, 0.3, 0.03)).toBe(332350.75);
  });
  it("rechaza margen + IIBB >= 100 %", () => {
    expect(() => precioParaMargen(100, 0.6, 0.4)).toThrow(RangeError);
  });
  it("el margen real vuelve al objetivo", () => {
    expect(margenReal(precioParaMargen(222675, 0.3), 222675)).toBeCloseTo(0.3, 6);
  });
  it("detecta pérdida y margen bajo", () => {
    expect(margenReal(100, 150)).toBeLessThan(0);
    expect(nivelMargen(-0.1, 0.3)).toBe("perdida");
    expect(nivelMargen(0.2, 0.3)).toBe("bajo");
    expect(nivelMargen(0.3, 0.3)).toBe("ok");
  });
  it("un precio calculado para el objetivo no figura como margen bajo (redondeo a centavos)", () => {
    for (const costo of [222675, 1234567.89, 98765.43, 5_000_000]) {
      for (const objetivo of [0.15, 0.3, 0.42]) {
        expect(nivelMargen(margenReal(precioParaMargen(costo, objetivo), costo), objetivo)).toBe("ok");
      }
    }
  });
  it("precio 0 no rompe", () => {
    expect(margenReal(0, 100)).toBe(0);
  });
});

describe("kilos y paquetes", () => {
  it("punto de equilibrio redondea hacia arriba", () => {
    expect(puntoEquilibrio(222675, 200)).toBe(1114);
    expect(puntoEquilibrio(1000, 0)).toBeNull();
  });
  it("peso volumétrico: 2 m³ a 250 kg/m³ = 500 kg", () => {
    expect(pesoVolumetricoKg([{ largoCm: 100, anchoCm: 100, altoCm: 100, cantidad: 2 }])).toBe(500);
  });
  it("se factura el mayor entre real y volumétrico", () => {
    expect(kgFacturables(400, 500)).toBe(500);
    expect(kgFacturables(800, 500)).toBe(800);
  });
  it("respeta la tarifa mínima por viaje", () => {
    expect(precioPorTarifa(100, 30, 5000)).toBe(5000);
    expect(precioPorTarifa(300, 30, 5000)).toBe(9000);
  });
  it("tarifa sugerida por kilo", () => {
    expect(tarifaSugeridaPorUnidad(222675, 0.3, 8000)).toBe(39.76);
    expect(tarifaSugeridaPorUnidad(222675, 0.3, 0)).toBeNull();
  });
  it("ocupación y km vacíos", () => {
    expect(ocupacion(8000, 16000)).toBe(0.5);
    expect(ocupacion(100, 0)).toBe(0);
    expect(porcentajeVacio(145, 145)).toBe(0.5);
    expect(porcentajeVacio(0, 0)).toBe(0);
  });
});
