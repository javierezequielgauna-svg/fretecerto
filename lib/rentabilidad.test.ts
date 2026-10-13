import { describe, it, expect } from "vitest";
import { diagnosticar, resumenRentabilidad, type FilaRentabilidad } from "./rentabilidad";
import { estadoEfectivo, esErrorDeRed } from "./cola";

const fila = (o: Partial<FilaRentabilidad> = {}): FilaRentabilidad => ({ clave: "x", nombre: "Córdoba a Villa María", viajes: 10, ingresos: 1_000_000, costos: 650_000, margen: 0.35, costoKm: 900, pctVacio: 30, pctATiempo: 95, ...o });

describe("diagnóstico de rentabilidad", () => {
  it("todo bien: mantener", () => {
    expect(diagnosticar(fila(), 0.3)).toEqual({ nivel: "ok", accion: "mantener", avisos: [] });
  });
  it("margen bajo el objetivo: revisar", () => {
    const d = diagnosticar(fila({ margen: 0.25 }), 0.3);
    expect(d.nivel).toBe("atencion");
    expect(d.accion).toBe("revisar");
    expect(d.avisos[0]).toContain("bajo tu objetivo");
  });
  it("menos de la mitad del objetivo: urgente", () => {
    const d = diagnosticar(fila({ margen: 0.1 }), 0.3);
    expect(d.nivel).toBe("urgente");
    expect(d.accion).toBe("revisar");
  });
  it("pérdida con varios viajes: rechazar", () => {
    const d = diagnosticar(fila({ margen: -0.05 }), 0.3);
    expect(d).toMatchObject({ nivel: "urgente", accion: "rechazar" });
  });
  it("pérdida con pocos viajes: revisar, con aviso de pocos datos", () => {
    const d = diagnosticar(fila({ margen: -0.05, viajes: 1 }), 0.3);
    expect(d.accion).toBe("revisar");
    expect(d.avisos.some((a) => a.includes("pocos viajes"))).toBe(true);
  });
  it("mucho retorno vacío y poca puntualidad avisan aunque el margen esté bien", () => {
    const d = diagnosticar(fila({ pctVacio: 55, pctATiempo: 60 }), 0.3);
    expect(d.nivel).toBe("atencion");
    expect(d.accion).toBe("mantener");
    expect(d.avisos.length).toBe(2);
  });
  it("sin margen calculable no rompe", () => {
    expect(diagnosticar(fila({ margen: null, pctVacio: null, pctATiempo: null }), 0.3).nivel).toBe("ok");
  });
  it("resumen general", () => {
    const r = resumenRentabilidad([fila(), fila({ ingresos: 500_000, costos: 400_000, viajes: 5 })]);
    expect(r.viajes).toBe(15);
    expect(r.ingresos).toBe(1_500_000);
    expect(r.margen).toBeCloseTo((1_500_000 - 1_050_000) / 1_500_000, 6);
    expect(resumenRentabilidad([]).margen).toBeNull();
  });
});

describe("cola sin conexión", () => {
  it("aplica los pasos en orden", () => {
    expect(estadoEfectivo("pendiente", ["en_carga"])).toBe("en_carga");
    expect(estadoEfectivo("pendiente", ["en_carga", "en_transito", "entregada"])).toBe("entregada");
  });
  it("ignora repetidos y salteados", () => {
    expect(estadoEfectivo("en_carga", ["en_carga"])).toBe("en_carga");
    expect(estadoEfectivo("pendiente", ["en_transito"])).toBe("pendiente");
    expect(estadoEfectivo("en_transito", ["en_carga", "entregada"])).toBe("entregada");
  });
  it("sin pendientes queda el del servidor", () => {
    expect(estadoEfectivo("en_transito", [])).toBe("en_transito");
  });
  it("distingue falta de señal de un rechazo", () => {
    expect(esErrorDeRed(new Error("x"), false)).toBe(true);
    expect(esErrorDeRed(new TypeError("Failed to fetch"), true)).toBe(true);
    expect(esErrorDeRed({ message: "Network request failed" }, true)).toBe(true);
    expect(esErrorDeRed(new Error("Transición inválida"), true)).toBe(false);
  });
});
