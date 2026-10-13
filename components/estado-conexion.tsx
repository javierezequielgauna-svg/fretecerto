"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { descartar, sincronizar } from "@/lib/cola-offline";
import { useCola } from "@/components/use-cola";

/** Aviso de conexión del chofer. También es quien manda lo pendiente cuando vuelve la señal. */
export function EstadoConexion() {
  const router = useRouter();
  const cola = useCola();
  const [enLinea, setEnLinea] = useState(true);
  const antes = useRef(0);

  useEffect(() => {
    setEnLinea(navigator.onLine);
    const sync = () => void sincronizar();
    const arriba = () => {
      setEnLinea(true);
      sync();
    };
    const abajo = () => setEnLinea(false);
    const visible = () => document.visibilityState === "visible" && sync();
    sync();
    window.addEventListener("online", arriba);
    window.addEventListener("offline", abajo);
    document.addEventListener("visibilitychange", visible);
    const t = setInterval(sync, 30_000);
    return () => {
      window.removeEventListener("online", arriba);
      window.removeEventListener("offline", abajo);
      document.removeEventListener("visibilitychange", visible);
      clearInterval(t);
    };
  }, []);

  const pendientes = cola.filter((a) => !a.error);
  const fallidas = cola.filter((a) => a.error);

  // Cuando se manda lo último, se recargan los datos para mostrar el estado real
  useEffect(() => {
    if (antes.current > 0 && pendientes.length === 0) router.refresh();
    antes.current = pendientes.length;
  }, [pendientes.length, router]);

  return (
    <div className="mb-3 grid gap-2">
      {!enLinea && <p role="status" className="rounded-lg bg-warn/15 p-3 font-medium text-warn">⚠ Sin conexión. Lo que marques se guarda y se manda solo cuando vuelva la señal.</p>}
      {enLinea && pendientes.length > 0 && <p role="status" className="rounded-lg bg-brand/15 p-3 font-medium text-brand">Enviando {pendientes.length === 1 ? "1 paso pendiente" : `${pendientes.length} pasos pendientes`}…</p>}
      {fallidas.map((a) => (
        <div key={a.id} role="alert" className="grid gap-1 rounded-lg bg-bad/15 p-3 text-bad">
          <p className="font-medium">✖ No se pudo enviar {a.tipo === "foto" ? "una foto" : `el paso “${a.estado}”`}: {a.error}</p>
          <button type="button" onClick={() => void descartar(a.id)} className="min-h-11 w-fit rounded-lg border border-bad px-3 text-sm">Descartar</button>
        </div>
      ))}
    </div>
  );
}
