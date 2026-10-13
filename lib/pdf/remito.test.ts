import { describe, it, expect } from "vitest";
import { construirRemitoPdf } from "./remito";

describe("construirRemitoPdf", () => {
  const base = {
    numero: "0001-00000001", fecha: "11/10/2026",
    remitente: { nombre: "Transportes del Centro S.R.L.", cuit: "30-71234567-8", domicilio: "Av. Colón 1234, Córdoba" },
    destinatario: { nombre: "Distribuidora Centro", cuit: "30-70987654-3", domicilio: "Ruta 9 km 560, Villa María" },
    chofer: "Marcos Pereyra", patente: "AE 412 QZ",
    items: [{ descripcion: "Cajas de alimentos secos", bultos: 120, kg: 2400 }],
    valorDeclarado: "$ 500.000,00", observaciones: "Entregar de 8 a 12",
  };
  it("genera un PDF válido", () => {
    const pdf = new Uint8Array(construirRemitoPdf(base));
    expect(pdf.length > 1000).toBe(true);
    expect(String.fromCharCode(...pdf.slice(0, 5))).toBe("%PDF-");
  });
  it("pasa a una segunda hoja con muchos ítems", () => {
    const muchos = Array.from({ length: 60 }, (_, i) => ({ descripcion: `Ítem ${i + 1}`, bultos: 1, kg: 10 }));
    const pdf = new Uint8Array(construirRemitoPdf({ ...base, items: muchos }));
    const texto = new TextDecoder("latin1").decode(pdf);
    expect((texto.match(/\/Type\s*\/Page[^s]/g) ?? []).length > 1).toBe(true);
  });
});
