"use client";

import { useId, useRef, useState } from "react";

/**
 * Campo de lugar con sugerencias de Google Places (limitadas a Córdoba y Gran Córdoba).
 * Si Google no está configurado, anda igual como un campo de texto común.
 */
export function CampoLugar({ etiqueta, valor, onCambio, ejemplo }: { etiqueta: string; valor: string; onCambio: (v: string) => void; ejemplo?: string }) {
  const lista = useId();
  const [opciones, setOpciones] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function alEscribir(v: string) {
    onCambio(v);
    clearTimeout(timer.current);
    if (v.trim().length < 3) return setOpciones([]);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/places?q=${encodeURIComponent(v)}`);
        if (!r.ok) return setOpciones([]);
        const j = (await r.json()) as { sugerencias: { texto: string }[] };
        setOpciones(j.sugerencias.map((s) => s.texto));
      } catch {
        setOpciones([]);
      }
    }, 250);
  }

  return (
    <label className="text-sm font-medium text-muted">
      {etiqueta}
      <input list={lista} value={valor} onChange={(e) => alEscribir(e.target.value)} placeholder={ejemplo} autoComplete="off"
        className="mt-1 min-h-12 w-full rounded-lg border border-line bg-bg px-3 text-base text-ink" />
      <datalist id={lista}>{opciones.map((o) => <option key={o} value={o} />)}</datalist>
    </label>
  );
}
