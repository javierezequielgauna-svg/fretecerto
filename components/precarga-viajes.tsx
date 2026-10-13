"use client";

import { useEffect } from "react";

/** Con señal, abre en segundo plano cada viaje para que el service worker guarde la pantalla y funcione sin conexión. */
export function PrecargaViajes({ ids }: { ids: string[] }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !navigator.onLine) return;
    ids.forEach((id) => fetch(`/chofer/${id}`, { headers: { accept: "text/html" }, credentials: "same-origin" }).catch(() => undefined));
  }, [ids]);
  return null;
}
