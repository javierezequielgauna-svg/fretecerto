"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Recarga los datos de la página cada tanto, solo si la pestaña está a la vista. */
export function AutoRefresco({ segundos = 60 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, segundos * 1000);
    return () => clearInterval(t);
  }, [router, segundos]);
  return null;
}
