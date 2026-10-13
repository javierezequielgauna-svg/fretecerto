/**
 * Límite de pedidos en memoria. Sirve para frenar abusos básicos, pero cada instancia serverless
 * tiene su propia memoria: para producción usá un contador compartido (por ejemplo Upstash Redis).
 */
const cubos = new Map<string, { n: number; hasta: number }>();

export function permitir(clave: string, max: number, ventanaMs = 60_000): boolean {
  const ahora = Date.now();
  const c = cubos.get(clave);
  if (!c || c.hasta < ahora) {
    cubos.set(clave, { n: 1, hasta: ahora + ventanaMs });
    return true;
  }
  c.n++;
  return c.n <= max;
}
