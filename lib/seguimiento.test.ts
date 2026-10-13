import { describe, it, expect } from "vitest";
import { mensajeEstado, pasosChofer, pasosSeguimiento } from "./seguimiento";
import { fechaHoraAR } from "./format";
import { generarClave } from "./clave";

describe("fechaHoraAR", () => {
  it("fecha y hora de Córdoba", () => {
    expect(fechaHoraAR("2026-10-11T15:30:00Z")).toBe("11/10/2026 12:30");
    expect(fechaHoraAR("2026-10-11T03:05:00Z")).toBe("11/10/2026 00:05");
  });
});

describe("seguimiento público", () => {
  const ev = [{ estado: "pendiente", at: "2026-10-11T12:00:00Z" }, { estado: "en_carga", at: "2026-10-11T13:00:00Z" }];
  it("marca lo hecho y el paso actual", () => {
    const p = pasosSeguimiento("en_carga", ev);
    expect(p.map((x) => x.hecho)).toEqual([true, true, false, false]);
    expect(p.map((x) => x.actual)).toEqual([false, true, false, false]);
    expect(p[1].cuando).toBe("11/10/2026 10:00");
    expect(p[2].cuando).toBeNull();
  });
  it("entregada deja todo hecho", () => {
    expect(pasosSeguimiento("entregada", []).every((x) => x.hecho)).toBe(true);
  });
  it("cancelada no muestra pasos", () => {
    expect(pasosSeguimiento("cancelada", [])).toEqual([]);
  });
  it("mensajes", () => {
    expect(mensajeEstado("en_transito", null)).toBe("Tu carga está en camino.");
    expect(mensajeEstado("en_transito", "2026-10-11T15:30:00Z")).toBe("Tu carga está en camino. Llegada estimada: 11/10/2026 12:30.");
    expect(mensajeEstado("entregada", null)).toBe("Tu carga fue entregada.");
  });
});

describe("modo chofer", () => {
  it("solo el próximo paso se puede tocar", () => {
    expect(pasosChofer("pendiente").map((p) => [p.hecho, p.siguiente])).toEqual([[false, true], [false, false], [false, false]]);
    expect(pasosChofer("en_transito").map((p) => [p.hecho, p.siguiente])).toEqual([[true, false], [true, false], [false, true]]);
  });
  it("con la carga entregada no queda ningún paso", () => {
    const p = pasosChofer("entregada");
    expect(p.every((x) => x.hecho && !x.siguiente)).toBe(true);
  });
});

describe("clave temporal", () => {
  it("formato legible, sin caracteres ambiguos", () => {
    const c = generarClave();
    expect(/^[a-hj-km-zA-HJ-KM-Z2-9]{4}(-[a-hj-km-zA-HJ-KM-Z2-9]{4}){2}$/.test(c)).toBe(true);
  });
  it("no se repite", () => {
    expect(new Set(Array.from({ length: 200 }, generarClave)).size).toBe(200);
  });
});
