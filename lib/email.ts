/** Escapa texto para meterlo en HTML de un mail. */
export const escaparHtml = (t: string): string =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface AlertaMail { severidad: string; mensaje: string }

/** Resumen de alertas nuevas: lo urgente primero. */
export function htmlResumen(empresa: string, alertas: AlertaMail[], urlApp: string): string {
  const orden = { urgente: 0, atencion: 1, info: 2 } as Record<string, number>;
  const icono = { urgente: "✖", atencion: "⚠", info: "•" } as Record<string, string>;
  const filas = [...alertas]
    .sort((a, b) => (orden[a.severidad] ?? 3) - (orden[b.severidad] ?? 3))
    .map((a) => `<li style="margin:6px 0">${icono[a.severidad] ?? "•"} ${escaparHtml(a.mensaje)}</li>`)
    .join("");
  return `<div style="font-family:system-ui,sans-serif;max-width:560px"><h2 style="margin:0 0 8px">${escaparHtml(empresa)}: ${alertas.length} alertas nuevas</h2><ul style="padding-left:18px">${filas}</ul><p><a href="${escaparHtml(urlApp)}/alertas">Abrir las alertas en FreteCerto</a></p></div>`;
}

/** Manda un mail con Resend. Devuelve false si no hay clave configurada o si falla (nunca corta el proceso). */
export async function enviarEmail(para: string[], asunto: string, html: string): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY;
  const desde = process.env.RESEND_FROM;
  if (!clave || !desde || para.length === 0) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: desde, to: para, subject: asunto, html }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
