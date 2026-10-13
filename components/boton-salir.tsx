"use client";

import { salir } from "@/app/(auth)/login/actions";
import { useCola } from "@/components/use-cola";

/** Salir: avisa si quedan pasos sin enviar y borra las pantallas guardadas del celular. */
export function BotonSalir() {
  const pendientes = useCola().filter((a) => !a.error).length;
  function antes(e: React.FormEvent<HTMLFormElement>) {
    if (pendientes > 0 && !confirm(`Todavía hay ${pendientes} ${pendientes === 1 ? "paso" : "pasos"} sin enviar. Si salís ahora se pierden. ¿Salir igual?`)) {
      e.preventDefault();
      return;
    }
    navigator.serviceWorker?.controller?.postMessage("limpiar");
  }
  return (
    <form action={salir} onSubmit={antes}>
      <button className="min-h-11 rounded-lg border border-line px-3 text-sm">Salir</button>
    </form>
  );
}
