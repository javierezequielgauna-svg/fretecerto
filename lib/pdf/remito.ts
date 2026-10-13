import { jsPDF } from "jspdf";

/** Remito interno tipo X (no válido como factura). Se arma en el servidor con jsPDF. */
export interface DatosRemito {
  numero: string; // 0001-00000012
  fecha: string; // dd/mm/aaaa
  remitente: { nombre: string; cuit: string; domicilio: string };
  destinatario: { nombre: string; cuit: string; domicilio: string };
  chofer: string;
  patente: string;
  items: { descripcion: string; bultos: number; kg: number }[];
  valorDeclarado: string | null; // ya formateado ($ 1.234,00)
  observaciones: string;
}

const num = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const limpio = (s: string) => s.replace(/\u00a0/g, " ");

export function construirRemitoPdf(d: DatosRemito): ArrayBuffer {
  const M = 14;
  const W = 210;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 0;

  const caja = (x: number, y0: number, w: number, h: number, titulo: string, lineas: string[]) => {
    doc.setLineWidth(0.3);
    doc.rect(x, y0, w, h);
    doc.setFont("helvetica", "bold").setFontSize(8).text(titulo, x + 3, y0 + 5);
    doc.setFont("helvetica", "normal").setFontSize(10);
    let yy = y0 + 11;
    for (const t of lineas) for (const s of doc.splitTextToSize(limpio(t), w - 6).slice(0, 2)) { doc.text(s, x + 3, yy); yy += 5; }
  };

  doc.setFont("helvetica", "bold").setFontSize(20).text("REMITO", M, 20);
  doc.setLineWidth(0.5).rect(W / 2 - 8, 10, 16, 16);
  doc.setFontSize(26).text("X", W / 2, 22.5, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(6).text("Documento no válido como factura", W / 2, 30, { align: "center" });
  doc.setFont("helvetica", "bold").setFontSize(12).text(`Nro. ${d.numero}`, W - M, 18, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(10).text(`Fecha: ${d.fecha}`, W - M, 24, { align: "right" });

  caja(M, 34, 89, 32, "REMITENTE", [d.remitente.nombre || "-", `CUIT: ${d.remitente.cuit || "-"}`, d.remitente.domicilio]);
  caja(W - M - 89, 34, 89, 32, "DESTINATARIO", [d.destinatario.nombre, `CUIT/DNI: ${d.destinatario.cuit || "-"}`, `Entrega: ${d.destinatario.domicilio || "-"}`]);
  caja(M, 69, W - 2 * M, 16, "TRANSPORTE", [`Chofer: ${d.chofer || "-"}     Patente: ${d.patente || "-"}`]);

  y = 92;
  const encabezado = () => {
    doc.setFillColor(15, 92, 77).rect(M, y - 5, W - 2 * M, 8, "F").setTextColor(255);
    doc.setFont("helvetica", "bold").setFontSize(9);
    doc.text("BULTOS", M + 3, y).text("DESCRIPCIÓN", M + 28, y).text("PESO (KG)", W - M - 3, y, { align: "right" });
    doc.setTextColor(0);
    y += 8;
    doc.setFont("helvetica", "normal").setFontSize(10);
  };
  encabezado();

  let bultos = 0;
  let kg = 0;
  for (const it of d.items) {
    const lineas: string[] = doc.splitTextToSize(it.descripcion, W - 2 * M - 28 - 34);
    const h = Math.max(1, lineas.length) * 5 + 3;
    if (y + h > 238) { doc.addPage(); y = 20; encabezado(); }
    doc.text(num.format(it.bultos), M + 3, y).text(lineas, M + 28, y).text(num.format(it.kg), W - M - 3, y, { align: "right" });
    doc.setLineWidth(0.1).line(M, y + h - 4, W - M, y + h - 4);
    y += h;
    bultos += it.bultos;
    kg += it.kg;
  }

  y += 2;
  doc.setFont("helvetica", "bold").text(`TOTAL: ${num.format(bultos)} bultos  |  ${num.format(kg)} kg`, W - M, y, { align: "right" });
  y += 8;
  doc.setFont("helvetica", "normal");
  if (d.valorDeclarado) { doc.text(`Valor declarado: ${limpio(d.valorDeclarado)}`, M, y); y += 6; }
  if (d.observaciones) {
    doc.setFont("helvetica", "bold").text("Observaciones", M, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    for (const s of doc.splitTextToSize(d.observaciones, W - 2 * M).slice(0, 6)) { doc.text(s, M, y); y += 5; }
  }

  const fy = 262;
  doc.setLineWidth(0.3).line(M, fy, M + 78, fy).line(W - M - 78, fy, W - M, fy);
  doc.setFontSize(8).text("Firma y aclaración - Chofer", M, fy + 4).text("Firma, aclaración y DNI - Quien recibe", W - M - 78, fy + 4);
  doc.setFontSize(7).text("Comprobante interno de transporte. No válido como factura ni como remito autorizado por ARCA.", W / 2, 288, { align: "center" });

  return doc.output("arraybuffer");
}
