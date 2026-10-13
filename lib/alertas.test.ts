import { describe, it, expect } from "vitest";
import { alertasCotizaciones, alertasMantenimiento, alertasOperaciones, alertasVencimientos, calcularAlertas, claveAlerta, umbralAlcanzado, type OperacionIn } from "./alertas";
import { escaparHtml, htmlResumen } from "./email";

const ahora = new Date("2026-10-11T15:00:00Z"); // 11/10/2026 12:00 en Córdoba
const hoy = "2026-10-11";
const venc = (fecha: string, extra = {}) => ({ id: "v1", tipo: "seguro" as const, sujeto: "AE 412 QZ", fecha, avisarDias: [30, 7, 1], telefono: null, ...extra });

describe("vencimientos", () => {
  it("el umbral es el más chico alcanzado", () => {
    expect(umbralAlcanzado(25, [30, 7, 1])).toBe(30);
    expect(umbralAlcanzado(5, [30, 7, 1])).toBe(7);
    expect(umbralAlcanzado(0, [30, 7, 1])).toBe(1);
    expect(umbralAlcanzado(60, [30, 7, 1])).toBeNull();
  });
  it("no avisa si falta mucho", () => {
    expect(alertasVencimientos([venc("2026-12-31")], hoy)).toEqual([]);
  });
  it("a 25 días: atención con el umbral de 30", () => {
    const [a] = alertasVencimientos([venc("2026-11-05")], hoy);
    expect(a.severidad).toBe("atencion");
    expect(a.dedupeKey).toBe("2026-11-05:30");
    expect(a.mensaje).toBe("El seguro de AE 412 QZ vence en 25 días (05/11/2026).");
  });
  it("a 3 días: urgente", () => {
    const [a] = alertasVencimientos([venc("2026-10-14")], hoy);
    expect(a.severidad).toBe("urgente");
    expect(a.dedupeKey).toBe("2026-10-14:7");
  });
  it("vencido y vence hoy", () => {
    const [v] = alertasVencimientos([venc("2026-10-06", { tipo: "licencia", sujeto: "Marcos Pereyra" })], hoy);
    expect(v.severidad).toBe("urgente");
    expect(v.mensaje).toBe("La licencia de conducir de Marcos Pereyra venció hace 5 días (06/10/2026).");
    expect(v.dedupeKey).toBe("2026-10-06:vencido");
    expect(alertasVencimientos([venc(hoy)], hoy)[0].mensaje).toContain("vence hoy");
  });
  it("renovar cambia la clave: vuelve a avisar en el próximo ciclo", () => {
    const a = alertasVencimientos([venc("2026-10-14")], hoy)[0];
    const b = alertasVencimientos([venc("2027-10-14")], "2027-10-10")[0];
    expect(claveAlerta(a) === claveAlerta(b)).toBe(false);
  });
});

describe("cotizaciones", () => {
  const cot = (enviadaAt: string, vigenciaHasta = "2026-10-30T00:00:00Z") => ({ id: "c1", numero: "COT-0001", cliente: "Comercial Oeste", telefono: "3516123456", enviadaAt, vigenciaHasta });
  it("sin avisar hasta los 3 días", () => {
    expect(alertasCotizaciones([cot("2026-10-10T12:00:00Z")], ahora)).toEqual([]);
  });
  it("3 días: atención; 7 días: urgente", () => {
    expect(alertasCotizaciones([cot("2026-10-08T12:00:00Z")], ahora)[0]).toMatchObject({ severidad: "atencion", dedupeKey: "sr:3" });
    expect(alertasCotizaciones([cot("2026-10-04T12:00:00Z")], ahora)[0]).toMatchObject({ severidad: "urgente", dedupeKey: "sr:7" });
  });
  it("vencida", () => {
    expect(alertasCotizaciones([cot("2026-10-09T12:00:00Z", "2026-10-10T00:00:00Z")], ahora)[0].dedupeKey).toBe("vencida");
  });
});

describe("operaciones", () => {
  const op = (o: Partial<OperacionIn>): OperacionIn => ({ id: "o1", numero: "FC-0001", estado: "en_transito", eta: null, entregadaAt: null, conformado: false, vencimientoCobro: null, importe: 100000, cliente: "Distribuidora Centro", telefonoCliente: "3516123456", chofer: "Marcos", telefonoChofer: "3516000000", ...o });
  it("demora: atención hasta 2 h, urgente después", () => {
    expect(alertasOperaciones([op({ eta: "2026-10-11T14:00:00Z" })], ahora)[0]).toMatchObject({ tipo: "demora", severidad: "atencion", dedupeKey: "d0" });
    expect(alertasOperaciones([op({ eta: "2026-10-11T10:00:00Z" })], ahora)[0]).toMatchObject({ severidad: "urgente", dedupeKey: "d2" });
    expect(alertasOperaciones([op({ eta: "2026-10-11T18:00:00Z" })], ahora)).toEqual([]);
  });
  it("entregada sin facturar: avisa al chofer si falta el conformado", () => {
    const [a] = alertasOperaciones([op({ estado: "entregada", entregadaAt: "2026-10-06T15:00:00Z" })], ahora);
    expect(a).toMatchObject({ tipo: "sin_facturar", severidad: "urgente", dedupeKey: "sf:5", telefono: "3516000000" });
    expect(a.mensaje).toContain("falta el remito firmado");
    const [b] = alertasOperaciones([op({ estado: "entregada", entregadaAt: "2026-10-09T15:00:00Z", conformado: true })], ahora);
    expect(b).toMatchObject({ severidad: "atencion", telefono: null, mensajeWa: null });
    expect(alertasOperaciones([op({ estado: "entregada", entregadaAt: "2026-10-10T15:00:00Z" })], ahora)).toEqual([]);
  });
  it("factura vencida: urgente, escala con la mora", () => {
    const a = alertasOperaciones([op({ estado: "facturada", vencimientoCobro: "2026-10-01" })], ahora)[0];
    expect(a).toMatchObject({ tipo: "factura_vencida", severidad: "urgente", dedupeKey: "fv:2026-10-01:7", telefono: "3516123456" });
    expect(alertasOperaciones([op({ estado: "facturada", vencimientoCobro: "2026-10-20" })], ahora)).toEqual([]);
  });
});

describe("mantenimiento", () => {
  it("avisa a 1.000 km y cuando se pasa", () => {
    const m = { id: "m1", tipo: "Service", unidad: "AE 412 QZ", proximoKm: 50000 };
    expect(alertasMantenimiento([{ ...m, odometroKm: 40000 }])).toEqual([]);
    expect(alertasMantenimiento([{ ...m, odometroKm: 49200 }])[0]).toMatchObject({ severidad: "atencion", dedupeKey: "m:50000:1000" });
    expect(alertasMantenimiento([{ ...m, odometroKm: 50300 }])[0]).toMatchObject({ severidad: "urgente", dedupeKey: "m:50000:0" });
  });
});

describe("conjunto y mails", () => {
  it("junta todas las reglas", () => {
    const r = calcularAlertas({ vencimientos: [venc("2026-10-14")], cotizaciones: [], operaciones: [], mantenimientos: [{ id: "m", tipo: "Service", unidad: "X", proximoKm: 10, odometroKm: 20 }] }, ahora);
    expect(r.map((a) => a.tipo).sort()).toEqual(["service", "vencimiento"]);
  });
  it("el mail escapa el HTML y ordena lo urgente primero", () => {
    expect(escaparHtml('<b>"a" & b</b>')).toBe("&lt;b&gt;&quot;a&quot; &amp; b&lt;/b&gt;");
    const h = htmlResumen("Mi <Empresa>", [{ severidad: "atencion", mensaje: "B" }, { severidad: "urgente", mensaje: "A" }], "https://app.test");
    expect(h.indexOf("A</li>") < h.indexOf("B</li>")).toBe(true);
    expect(h).toContain("Mi &lt;Empresa&gt;");
  });
});
