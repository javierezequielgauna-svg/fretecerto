import { describe, it, expect } from "vitest";
import { calcularResumen, type OpResumen } from "./resumen";
import { diaISO, diasEntre } from "./fechas";
import { nivelPuntaje } from "./cobranza";

const ahora = new Date("2026-10-11T15:00:00Z"); // 12:00 en Córdoba
const op = (o: Partial<OpResumen>): OpResumen => ({ estado: "pendiente", importe: 0, costo: 0, entregadaAt: null, vencimientoCobro: null, ...o });

describe("fechas", () => {
  it("el día se ve desde Córdoba", () => {
    expect(diaISO(new Date("2026-10-11T01:00:00Z"))).toBe("2026-10-10");
    expect(diaISO("2026-10-11T15:00:00Z")).toBe("2026-10-11");
  });
  it("diferencia en días", () => {
    expect(diasEntre("2026-10-06", "2026-10-11")).toBe(5);
    expect(diasEntre("2026-10-11", "2026-10-06")).toBe(-5);
    expect(diasEntre("2026-02-28", "2026-03-01")).toBe(1);
  });
});

describe("calcularResumen", () => {
  const ops = [
    op({ estado: "en_transito", importe: 100, costo: 70 }),
    op({ estado: "en_carga", importe: 100, costo: 80 }),
    op({ estado: "pendiente", importe: 999, costo: 1 }), // no cuenta para el margen
    op({ estado: "cancelada", importe: 999, costo: 1 }),
    op({ estado: "entregada", importe: 200, costo: 120, entregadaAt: "2026-10-06T15:00:00Z" }),
    op({ estado: "entregada", importe: 50, costo: 30, entregadaAt: "2026-10-10T15:00:00Z" }),
    op({ estado: "facturada", importe: 300, costo: 200, vencimientoCobro: "2026-10-01" }),
    op({ estado: "facturada", importe: 100, costo: 60, vencimientoCobro: "2026-10-20" }),
    op({ estado: "cobrada", importe: 50, costo: 40 }),
  ];
  const r = calcularResumen(ops, ahora);
  it("cuenta las cargas en curso", () => expect(r.enCurso).toBe(2));
  it("margen sobre lo iniciado", () => expect(r.margen).toBeCloseTo((900 - 600) / 900, 6));
  it("entregado sin facturar y la más vieja", () => {
    expect(r.sinFacturar.cantidad).toBe(2);
    expect(r.sinFacturar.monto).toBe(250);
    expect(r.sinFacturar.diasMasVieja).toBe(5);
  });
  it("por cobrar y vencidas", () => {
    expect(r.porCobrar.cantidad).toBe(2);
    expect(r.porCobrar.monto).toBe(400);
    expect(r.porCobrar.vencidas).toBe(1);
    expect(r.porCobrar.montoVencido).toBe(300);
  });
  it("sin datos no rompe", () => expect(calcularResumen([], ahora).margen).toBe(0));
  it("niveles de puntaje", () => {
    expect(nivelPuntaje(100)).toBe("bueno");
    expect(nivelPuntaje(79)).toBe("regular");
    expect(nivelPuntaje(10)).toBe("riesgo");
  });
});
