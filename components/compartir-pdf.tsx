"use client";

import { useState } from "react";

/** En el celular abre el menú de compartir del sistema con el PDF adjunto (WhatsApp incluido). Si no se puede, abre el PDF. */
export function CompartirPdf({ url, nombre, texto }: { url: string; nombre: string; texto: string }) {
  const [msg, setMsg] = useState("");

  async function compartir() {
    setMsg("");
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("No se pudo descargar el PDF");
      const archivo = new File([await r.blob()], nombre, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], text: texto });
        return;
      }
      window.open(url, "_blank", "noopener");
      setMsg("Este dispositivo no permite compartir archivos: abrimos el PDF para que lo mandes a mano.");
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return; // la persona cerró el menú
      window.open(url, "_blank", "noopener");
      setMsg("No pudimos abrir el menú de compartir: abrimos el PDF.");
    }
  }

  return (
    <div className="grid gap-1">
      <button type="button" onClick={compartir} className="min-h-12 rounded-xl bg-[#1fa855] font-bold text-white">Compartir PDF (WhatsApp)</button>
      {msg && <p role="status" className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
