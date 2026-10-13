"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { avanzarEstado } from "@/app/(app)/operaciones/actions";
import { encolarEstado } from "@/lib/cola-offline";
import { esErrorDeRed, estadoEfectivo } from "@/lib/cola";
import { pasosChofer } from "@/lib/seguimiento";
import { useCola } from "@/components/use-cola";

/**
 * Los 3 botones grandes del chofer: Cargué, Salí, Entregué. Solo se puede tocar el próximo y pide confirmación.
 * Sin señal, el paso se guarda en el celular y se manda solo después (se ve como hecho, marcado "pendiente de enviar").
 */
export function ChoferPasos({ operacionId, estado }: { operacionId: string; estado: string }) {
  const router = useRouter();
  const cola = useCola(operacionId);
  const [error, setError] = useState("");
  const [guardando, empezar] = useTransition();

  const enCola = cola.filter((a) => a.tipo === "estado" && !a.error).map((a) => (a as { estado: string }).estado);
  const pasos = pasosChofer(estadoEfectivo(estado, enCola));

  function tocar(nuevo: string, etiqueta: string) {
    if (!confirm(`¿Confirmás: ${etiqueta}?`)) return;
    setError("");
    empezar(async () => {
      if (!navigator.onLine) return void (await encolarEstado(operacionId, nuevo));
      try {
        const fd = new FormData();
        fd.set("id", operacionId);
        fd.set("estado", nuevo);
        const r = await avanzarEstado({ ok: true }, fd);
        if (r.ok) router.refresh();
        else setError(r.error);
      } catch (e) {
        // Señal floja: se guarda y se reintenta. Si el toque sí había llegado, el reintento se descarta solo.
        if (esErrorDeRed(e, navigator.onLine)) await encolarEstado(operacionId, nuevo);
        else setError("No se pudo guardar. Probá de nuevo.");
      }
    });
  }

  return (
    <div className="grid gap-3">
      {pasos.map((p, i) => {
        const pendiente = enCola.includes(p.estado);
        return (
          <button
            key={p.estado}
            type="button"
            disabled={!p.siguiente || guardando}
            onClick={() => tocar(p.estado, p.etiqueta)}
            className={`flex min-h-16 flex-col items-center justify-center rounded-2xl text-xl font-extrabold ${
              p.siguiente ? "bg-brand text-brand-ink" : p.hecho ? "border border-ok bg-surface text-ok" : "border border-line bg-surface text-muted opacity-60"
            }`}
          >
            <span><span aria-hidden="true">{p.hecho ? "✔ " : `${i + 1} · `}</span>{guardando && p.siguiente ? "Guardando…" : p.etiqueta}</span>
            {pendiente && <span className="text-sm font-medium text-warn">Pendiente de enviar (sin señal)</span>}
          </button>
        );
      })}
      {error && <p role="alert" className="rounded-lg bg-bad/15 p-3 font-medium text-bad">✖ {error}</p>}
    </div>
  );
}
