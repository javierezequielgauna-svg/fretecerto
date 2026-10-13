"use client";

import { useActionState } from "react";
import { avanzarEstado, type Resultado } from "@/app/(app)/operaciones/actions";
import type { EstadoOperacion } from "@/lib/estados";

/** Botón del próximo paso. Muestra el error de la base (por ejemplo, un salto de estado) debajo del botón. */
export function AvanzarBoton({ id, siguiente, etiqueta, aviso }: { id: string; siguiente: EstadoOperacion; etiqueta: string; aviso?: string }) {
  const [res, accion, pendiente] = useActionState<Resultado, FormData>(avanzarEstado, { ok: true });
  return (
    <form action={accion} className="grid gap-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value={siguiente} />
      <button disabled={pendiente} className="min-h-11 rounded-lg bg-brand px-3 text-sm font-bold text-brand-ink disabled:opacity-60">
        {pendiente ? "Guardando…" : etiqueta}
      </button>
      {aviso && <p className="text-xs text-warn">⚠ {aviso}</p>}
      {!res.ok && <p role="alert" className="text-xs text-bad">✖ {res.error}</p>}
    </form>
  );
}
