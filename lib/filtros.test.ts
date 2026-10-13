import { describe, it, expect } from "vitest";
import { leerFiltros, sanitizarBusqueda, urlOperaciones, columnaOrden } from "./filtros";
import { formatoNumero } from "./numeracion";
import { dimensionesEscaladas } from "./imagen";

describe("filtros de la URL", () => {
  it("valores por defecto", () => {
    expect(leerFiltros({})).toEqual({ estado: undefined, q: "", o: "fecha_desc", pag: 1 });
  });
  it("ignora valores inválidos", () => {
    const f = leerFiltros({ estado: "hackeado", o: "drop table", pag: "-3" });
    expect(f.estado).toBe(undefined);
    expect(f.o).toBe("fecha_desc");
    expect(f.pag).toBe(1);
  });
  it("lee estado, orden y página válidos", () => {
    const f = leerFiltros({ estado: "curso", o: "importe_asc", pag: "3", q: "villa" });
    expect(f).toEqual({ estado: "curso", q: "villa", o: "importe_asc", pag: 3 });
  });
  it("toma el primero si el parámetro viene repetido", () => {
    expect(leerFiltros({ estado: ["entregada", "cobrada"] }).estado).toBe("entregada");
  });
  it("sanitiza la búsqueda", () => {
    expect(sanitizarBusqueda("a,b(c)%d*")).toBe("a b c d");
    expect(sanitizarBusqueda("  Pérez   S.R.L. ")).toBe("Pérez S.R.L.");
  });
  it("arma la URL sin ruido", () => {
    const f = leerFiltros({});
    expect(urlOperaciones(f)).toBe("/operaciones");
    expect(urlOperaciones(f, { estado: "entregada", pag: 2 })).toBe("/operaciones?estado=entregada&pag=2");
    expect(urlOperaciones({ ...f, estado: "entregada" }, { estado: undefined })).toBe("/operaciones");
  });
  it("traduce el orden a columna", () => {
    expect(columnaOrden("fecha_desc")).toEqual({ column: "created_at", ascending: false });
    expect(columnaOrden("importe_asc")).toEqual({ column: "importe", ascending: true });
  });
});

describe("varios", () => {
  it("numeración", () => {
    expect(formatoNumero("FC", 7)).toBe("FC-0007");
    expect(formatoNumero("FC", 12345)).toBe("FC-12345");
  });
  it("escala de imagen sin agrandar", () => {
    expect(dimensionesEscaladas(4000, 3000)).toEqual({ ancho: 1600, alto: 1200 });
    expect(dimensionesEscaladas(800, 600)).toEqual({ ancho: 800, alto: 600 });
  });
});
