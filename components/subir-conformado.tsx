"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagen } from "@/lib/imagen";
import { encolarFoto } from "@/lib/cola-offline";
import { esErrorDeRed } from "@/lib/cola";
import { useCola } from "@/components/use-cola";

/**
 * Sube la foto del remito firmado. En el celular abre la cámara trasera.
 * Con `permitirCola` (modo chofer), si no hay señal la foto se guarda en el celular y se sube sola después.
 * Ruta en Storage: {empresa}/{operación}/archivo, que es lo que esperan las políticas de la base.
 */
export function SubirConformado({ operacionId, empresaId, tiene, permitirCola = false }: { operacionId: string; empresaId: string; tiene: boolean; permitirCola?: boolean }) {
  const router = useRouter();
  const enCola = useCola(operacionId).filter((a) => a.tipo === "foto" && !a.error).length;
  const [estado, setEstado] = useState<"quieto" | "subiendo" | "error">("quieto");
  const [mensaje, setMensaje] = useState("");

  async function alElegir(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setEstado("subiendo");
    setMensaje("");
    let foto: Blob;
    try {
      foto = await comprimirImagen(archivo);
    } catch {
      setEstado("error");
      setMensaje("No se pudo leer la foto. Sacala de nuevo.");
      return;
    }
    try {
      if (permitirCola && !navigator.onLine) throw new TypeError("sin conexión");
      const ruta = `${empresaId}/${operacionId}/conformado-${Date.now()}.jpg`;
      const db = createClient();
      const subida = await db.storage.from("remitos").upload(ruta, foto, { contentType: "image/jpeg" });
      if (subida.error) throw subida.error;
      const reg = await db.rpc("registrar_conformado", { p_op: operacionId, p_path: ruta });
      if (reg.error) throw reg.error;
      setEstado("quieto");
      router.refresh();
    } catch (err) {
      if (permitirCola && esErrorDeRed(err, navigator.onLine)) {
        await encolarFoto(operacionId, empresaId, foto);
        setEstado("quieto");
        return;
      }
      setEstado("error");
      setMensaje((err as { message?: string }).message ?? "No se pudo subir la foto");
    }
  }

  return (
    <div className="grid gap-2">
      {enCola > 0 && <p role="status" className="font-medium text-warn">📷 Foto guardada: se sube sola cuando haya señal.</p>}
      <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface px-4 text-lg font-medium">
        {estado === "subiendo" ? "Procesando…" : tiene || enCola > 0 ? "Reemplazar foto del remito firmado" : "Sacar foto del remito firmado"}
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={alElegir} disabled={estado === "subiendo"} />
      </label>
      {estado === "error" && <p role="alert" className="text-sm text-bad">✖ {mensaje}</p>}
    </div>
  );
}
