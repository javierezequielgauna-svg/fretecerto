import { fechaHoraAR } from "./format";

/** Lo que ve el cliente en el link público. Facturada y cobrada llegan ya como "entregada" desde la base. */
export type EstadoPublico = "pendiente" | "en_carga" | "en_transito" | "entregada" | "cancelada";

export const PASOS_PUBLICOS: { estado: Exclude<EstadoPublico, "cancelada">; titulo: string }[] = [
  { estado: "pendiente", titulo: "Pedido recibido" },
  { estado: "en_carga", titulo: "Cargando" },
  { estado: "en_transito", titulo: "En camino" },
  { estado: "entregada", titulo: "Entregada" },
];

export interface PasoSeguimiento { titulo: string; hecho: boolean; actual: boolean; cuando: string | null }

export function pasosSeguimiento(estado: EstadoPublico, eventos: { estado: string; at: string }[]): PasoSeguimiento[] {
  const idx = PASOS_PUBLICOS.findIndex((p) => p.estado === estado);
  if (idx < 0) return [];
  return PASOS_PUBLICOS.map((p, i) => {
    const ev = eventos.find((e) => e.estado === p.estado);
    return { titulo: p.titulo, hecho: i <= idx, actual: i === idx, cuando: ev && i <= idx ? fechaHoraAR(ev.at) : null };
  });
}

export function mensajeEstado(estado: EstadoPublico, eta: string | null): string {
  switch (estado) {
    case "pendiente": return "Recibimos tu pedido. Todavía no salió.";
    case "en_carga": return "Estamos cargando tu mercadería.";
    case "en_transito": return eta ? `Tu carga está en camino. Llegada estimada: ${fechaHoraAR(eta)}.` : "Tu carga está en camino.";
    case "entregada": return "Tu carga fue entregada.";
    default: return "Este envío fue cancelado. Consultá con la empresa.";
  }
}

/** Los 3 botones del chofer, en orden. "siguiente" es el único que se puede tocar. */
export const PASOS_CHOFER = [
  { estado: "en_carga", etiqueta: "Cargué" },
  { estado: "en_transito", etiqueta: "Salí" },
  { estado: "entregada", etiqueta: "Entregué" },
] as const;

export function pasosChofer(estado: string): { estado: (typeof PASOS_CHOFER)[number]["estado"]; etiqueta: string; hecho: boolean; siguiente: boolean }[] {
  const hechos = estado === "pendiente" ? 0 : estado === "en_carga" ? 1 : estado === "en_transito" ? 2 : 3;
  return PASOS_CHOFER.map((p, i) => ({ ...p, hecho: i < hechos, siguiente: i === hechos }));
}
