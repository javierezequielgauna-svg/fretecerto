import { describe, it, expect } from "vitest";
import { ars, porcentaje, fechaAR, whatsappNumero, whatsappLink, plural } from "./index";

const sinNbsp = (s: string) => s.replace(/\s/g, " ");

describe("formato", () => {
  it("pesos argentinos", () => {
    expect(sinNbsp(ars(1234567))).toBe("$ 1.234.567,00");
    expect(sinNbsp(ars(0))).toBe("$ 0,00");
  });
  it("porcentaje con coma", () => {
    expect(sinNbsp(porcentaje(0.286))).toBe("28,6 %");
  });
  it("fechas dd/mm/aaaa", () => {
    expect(fechaAR("2026-10-11")).toBe("11/10/2026");
    expect(fechaAR("2026-10-11T12:00:00Z")).toBe("11/10/2026");
  });
  it("hora de Córdoba: a las 01:00 UTC todavía es el día anterior", () => {
    expect(fechaAR("2026-10-11T01:00:00Z")).toBe("10/10/2026");
  });
});

describe("whatsapp", () => {
  it("agrega 549 a un número local", () => {
    expect(whatsappNumero("351 612-3456")).toBe("5493516123456");
  });
  it("saca el 0 y el 15", () => {
    expect(whatsappNumero("0351 15 6123456")).toBe("5493516123456");
  });
  it("respeta un número que ya trae 54", () => {
    expect(whatsappNumero("+54 9 351 612 3456")).toBe("5493516123456");
  });
  it("vacío si no hay dígitos", () => {
    expect(whatsappNumero("abc")).toBe("");
    expect(whatsappLink("", "hola")).toBeNull();
  });
  it("arma el link con el texto codificado", () => {
    expect(whatsappLink("3516123456", "Hola! Gracias")).toBe("https://wa.me/5493516123456?text=Hola!%20Gracias");
  });
});

describe("plural", () => {
  it("singular y plural", () => {
    expect(plural(1, "carga", "cargas")).toBe("1 carga");
    expect(plural(3, "carga", "cargas")).toBe("3 cargas");
  });
});
