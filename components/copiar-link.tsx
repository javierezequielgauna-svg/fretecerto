"use client";

import { useState } from "react";

export function CopiarLink({ url }: { url: string }) {
  const [msg, setMsg] = useState("");
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setMsg("✔ Link copiado");
    } catch {
      setMsg("No se pudo copiar: seleccionalo y copialo a mano.");
    }
  }
  return (
    <div className="grid gap-1">
      <input readOnly value={url} aria-label="Link de seguimiento" onFocus={(e) => e.currentTarget.select()} className="min-h-12 w-full rounded-lg border border-line bg-bg px-3 text-sm" />
      <button type="button" onClick={copiar} className="min-h-11 rounded-lg border border-line font-medium">Copiar link</button>
      {msg && <p role="status" className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
