/** Lógica pura de la cola sin conexión del chofer (el almacenamiento está en cola-offline.ts). */
export const ORDEN = ["pendiente", "en_carga", "en_transito", "entregada"] as const;

/**
 * El estado que debe ver el chofer: el del servidor más los pasos que tocó sin señal, siempre que
 * sigan el orden (cada paso tiene que ser el que sigue al anterior; los repetidos o salteados se ignoran).
 */
export function estadoEfectivo(servidor: string, pendientes: string[]): string {
  let actual = servidor;
  for (const p of pendientes) {
    const i = ORDEN.indexOf(actual as (typeof ORDEN)[number]);
    const j = ORDEN.indexOf(p as (typeof ORDEN)[number]);
    if (i >= 0 && j === i + 1) actual = p;
  }
  return actual;
}

/** ¿El fallo es de conexión (se reintenta) o un rechazo de verdad (no se reintenta)? */
export function esErrorDeRed(e: unknown, enLinea: boolean): boolean {
  if (!enLinea) return true;
  const m = String((e as { message?: string } | null)?.message ?? e);
  return e instanceof TypeError || /failed to fetch|network|load failed|fetch failed|timed? ?out/i.test(m);
}
