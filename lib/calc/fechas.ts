/** Fechas en hora de Córdoba. Todo en formato "AAAA-MM-DD" para comparar y restar sin sorpresas. */
const TZ = "America/Argentina/Cordoba";
const dia = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** Día calendario (AAAA-MM-DD) de un instante, visto desde Córdoba. */
export const diaISO = (valor: Date | string): string => dia.format(typeof valor === "string" ? new Date(valor) : valor);

/** Días entre dos fechas AAAA-MM-DD (positivo si `hasta` es posterior). */
export function diasEntre(desde: string, hasta: string): number {
  const t = (s: string) => {
    const [a, m, d] = s.split("-").map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((t(hasta) - t(desde)) / 86_400_000);
}
