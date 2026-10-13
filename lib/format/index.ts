/** Formato local argentino: pesos, fechas dd/mm/aaaa y números de WhatsApp. */

const TZ = "America/Argentina/Cordoba";
const moneda = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 });
const fecha = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ });

/** $ 1.234.567,00 */
export const ars = (n: number): string => moneda.format(n);

/** Porcentaje con una coma decimal: 0,286 -> "28,6 %". */
export const porcentaje = (fraccion: number, decimales = 1): string =>
  `${(fraccion * 100).toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })} %`;

/**
 * dd/mm/aaaa. Los textos "AAAA-MM-DD" (sin hora) se leen tal cual para que no se corran de día
 * por la zona horaria; el resto se interpreta en hora de Córdoba.
 */
export function fechaAR(valor: Date | string): string {
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split("-");
    return `${d}/${m}/${a}`;
  }
  return fecha.format(typeof valor === "string" ? new Date(valor) : valor);
}

/**
 * Normaliza un celular argentino al formato de wa.me: 549 + área + número, sin 0 ni 15.
 * Devuelve "" si no hay dígitos.
 */
export function whatsappNumero(crudo: string): string {
  const d = String(crudo ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (!d) return "";
  if (d.startsWith("54")) return d;
  let r = d;
  if (r.length === 12) {
    for (const area of [2, 3, 4]) {
      if (r.slice(area, area + 2) === "15") {
        r = r.slice(0, area) + r.slice(area + 2);
        break;
      }
    }
  }
  return "549" + r;
}

export function whatsappLink(telefono: string, mensaje: string): string | null {
  const n = whatsappNumero(telefono);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(mensaje)}` : null;
}

/** plural(1, "carga", "cargas") -> "1 carga" */
export const plural = (n: number, uno: string, otros: string): string => `${n} ${n === 1 ? uno : otros}`;

const hora = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ });
/** 11/10/2026 12:30, en hora de Córdoba. */
export const fechaHoraAR = (valor: Date | string): string => {
  const d = typeof valor === "string" ? new Date(valor) : valor;
  return `${fecha.format(d)} ${hora.format(d)}`;
};
