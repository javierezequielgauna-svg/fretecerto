import { headers } from "next/headers";

/** URL base de la app para armar links (APP_URL si está, si no la del pedido). */
export async function urlBase(): Promise<string> {
  const fija = process.env.APP_URL;
  if (fija) return fija.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}
