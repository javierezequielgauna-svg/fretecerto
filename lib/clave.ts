import { randomInt } from "node:crypto";

// Sin letras ni números que se confunden (0/O, 1/l/I) para dictarla o copiarla sin errores
const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Clave temporal tipo "aB3d-Ef7h-Jk4m", con generador criptográfico. */
export function generarClave(): string {
  const grupo = () => Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `${grupo()}-${grupo()}-${grupo()}`;
}
