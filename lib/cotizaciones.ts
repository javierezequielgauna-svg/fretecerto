import { diaISO, diasEntre } from "./calc/fechas";

export type EstadoVisible = "borrador" | "enviada" | "sin_respuesta" | "vencida" | "aceptada" | "rechazada";

/**
 * El estado que ve la persona. "Sin respuesta" y "vencida" se calculan al mostrar:
 * no dependen de que corra una tarea programada.
 */
export function estadoVisible(
  c: { estado: string; enviadaAt: string | null; vigenciaHasta: string | null },
  ahora: Date = new Date(),
): { estado: EstadoVisible; dias: number; urgencia: "ok" | "warn" | "bad" } {
  const dias = c.enviadaAt ? Math.max(0, diasEntre(diaISO(c.enviadaAt), diaISO(ahora))) : 0;
  if (c.estado !== "enviada") return { estado: c.estado as EstadoVisible, dias, urgencia: "ok" };
  if (c.vigenciaHasta && ahora.getTime() > new Date(c.vigenciaHasta).getTime()) return { estado: "vencida", dias, urgencia: "bad" };
  if (dias >= 7) return { estado: "sin_respuesta", dias, urgencia: "bad" };
  if (dias >= 3) return { estado: "sin_respuesta", dias, urgencia: "warn" };
  return { estado: "enviada", dias, urgencia: "ok" };
}
