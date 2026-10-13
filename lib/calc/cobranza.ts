export type NivelPuntaje = "bueno" | "regular" | "riesgo";

/** El puntaje sale de la vista v_cobranza_cliente (100 menos 4 puntos por día de mora promedio). */
export const nivelPuntaje = (p: number): NivelPuntaje => (p >= 80 ? "bueno" : p >= 50 ? "regular" : "riesgo");
