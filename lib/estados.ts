export const ESTADOS = ["pendiente", "en_carga", "en_transito", "entregada", "facturada", "cobrada", "cancelada"] as const;
export type EstadoOperacion = (typeof ESTADOS)[number];

/** Cada estado lleva ícono y texto, así no depende solo del color (accesibilidad). */
export const ESTADO_META: Record<EstadoOperacion, { label: string; icono: string; clase: string }> = {
  pendiente: { label: "Pendiente", icono: "○", clase: "bg-bg text-muted border border-line" },
  en_carga: { label: "En carga", icono: "◐", clase: "bg-warn/15 text-warn" },
  en_transito: { label: "En tránsito", icono: "➤", clase: "bg-brand/15 text-brand" },
  entregada: { label: "Entregada", icono: "✔", clase: "bg-ok/15 text-ok" },
  facturada: { label: "Facturada", icono: "◆", clase: "bg-bad/15 text-bad" },
  cobrada: { label: "Cobrada", icono: "●", clase: "bg-ok/15 text-ok" },
  cancelada: { label: "Cancelada", icono: "✖", clase: "bg-bg text-muted border border-line" },
};

/** Siguiente paso de cada operación; la base valida que solo se avance de a uno. */
export const SIGUIENTE: Record<EstadoOperacion, { estado: EstadoOperacion; etiqueta: string } | null> = {
  pendiente: { estado: "en_carga", etiqueta: "Empezar a cargar" },
  en_carga: { estado: "en_transito", etiqueta: "Salir a ruta" },
  en_transito: { estado: "entregada", etiqueta: "Marcar entregada" },
  entregada: { estado: "facturada", etiqueta: "Marcar facturada" },
  facturada: { estado: "cobrada", etiqueta: "Registrar cobro" },
  cobrada: null,
  cancelada: null,
};
