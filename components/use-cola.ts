"use client";

import { useEffect, useState } from "react";
import { listar, type Accion } from "@/lib/cola-offline";

/** Lo que está esperando conexión (de una operación, o de todas si no se indica). Se actualiza solo. */
export function useCola(operacionId?: string): Accion[] {
  const [acciones, setAcciones] = useState<Accion[]>([]);
  useEffect(() => {
    let vivo = true;
    const leer = () => listar().then((a) => vivo && setAcciones(a));
    leer();
    window.addEventListener("cola-cambio", leer);
    return () => {
      vivo = false;
      window.removeEventListener("cola-cambio", leer);
    };
  }, []);
  return operacionId ? acciones.filter((a) => a.operacionId === operacionId) : acciones;
}
