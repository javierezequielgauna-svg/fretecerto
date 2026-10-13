"use client";

import { useEffect, useState } from "react";

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
}

/** Invita a instalar la app. En Android/Chrome usa el aviso del navegador; en iPhone explica los pasos. */
export function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [instalada, setInstalada] = useState(false);
  const [esIos, setEsIos] = useState(false);

  useEffect(() => {
    setInstalada(matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
    setEsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const antes = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const listo = () => setInstalada(true);
    addEventListener("beforeinstallprompt", antes);
    addEventListener("appinstalled", listo);
    return () => {
      removeEventListener("beforeinstallprompt", antes);
      removeEventListener("appinstalled", listo);
    };
  }, []);

  if (instalada) return <p className="text-sm text-ok">✔ La app ya está instalada en este dispositivo.</p>;
  if (evento)
    return (
      <button type="button" onClick={() => evento.prompt()} className="min-h-12 rounded-xl border border-line bg-surface px-4 font-bold">
        Instalar la app en este celular
      </button>
    );
  if (esIos) return <p className="text-sm text-muted">Para instalarla en iPhone: tocá el botón Compartir y elegí “Agregar a inicio”.</p>;
  return null;
}
