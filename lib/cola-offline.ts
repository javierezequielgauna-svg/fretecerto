import { avanzarEstado } from "@/app/(app)/operaciones/actions";
import { createClient } from "@/lib/supabase/client";
import { esErrorDeRed } from "@/lib/cola";

/**
 * Cola sin conexión del chofer (IndexedDB): los pasos (Cargué / Salí / Entregué) y las fotos del remito
 * que se tocan sin señal se guardan en el celular y se mandan solos cuando vuelve la conexión.
 * Los pasos se mandan en orden. Solo funciona en el navegador.
 */
export type Accion = ({ tipo: "estado"; estado: string } | { tipo: "foto"; empresaId: string; foto: Blob }) & {
  id: string;
  operacionId: string;
  creada: number;
  error?: string; // si el servidor la rechazó: queda visible para que el chofer la descarte o avise
};

const BASE = "fc-cola";
const TABLA = "acciones";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(BASE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(TABLA, { keyPath: "id" });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}

async function op<T>(modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  try {
    return await new Promise<T>((ok, mal) => {
      const r = f(db.transaction(TABLA, modo).objectStore(TABLA));
      r.onsuccess = () => ok(r.result);
      r.onerror = () => mal(r.error);
    });
  } finally {
    db.close();
  }
}

const avisar = () => window.dispatchEvent(new Event("cola-cambio"));

export async function listar(): Promise<Accion[]> {
  try {
    return ((await op("readonly", (s) => s.getAll())) as Accion[]).sort((a, b) => a.creada - b.creada);
  } catch {
    return []; // por ejemplo, navegación privada sin IndexedDB
  }
}

async function guardar(a: Accion) {
  await op("readwrite", (s) => s.put(a));
  avisar();
}

export async function descartar(id: string) {
  await op("readwrite", (s) => s.delete(id));
  avisar();
}

export const encolarEstado = (operacionId: string, estado: string) =>
  guardar({ id: crypto.randomUUID(), tipo: "estado", operacionId, estado, creada: Date.now() });

export const encolarFoto = (operacionId: string, empresaId: string, foto: Blob) =>
  guardar({ id: crypto.randomUUID(), tipo: "foto", operacionId, empresaId, foto, creada: Date.now() });

async function subirFoto(a: Extract<Accion, { tipo: "foto" }>) {
  const db = createClient();
  const ruta = `${a.empresaId}/${a.operacionId}/conformado-${a.id}.jpg`; // ruta fija: reintentar no duplica
  const sube = await db.storage.from("remitos").upload(ruta, a.foto, { contentType: "image/jpeg" });
  if (sube.error && !/already exists|duplicate/i.test(sube.error.message)) throw sube.error;
  const reg = await db.rpc("registrar_conformado", { p_op: a.operacionId, p_path: ruta });
  if (reg.error) throw reg.error;
}

let corriendo = false;

/** Manda lo pendiente, en orden. Si no hay señal, frena y reintenta más tarde. Devuelve cuántas mandó. */
export async function sincronizar(): Promise<number> {
  if (corriendo || !navigator.onLine) return 0;
  corriendo = true;
  let enviadas = 0;
  try {
    for (const a of await listar()) {
      if (a.error) continue;
      try {
        if (a.tipo === "estado") {
          const fd = new FormData();
          fd.set("id", a.operacionId);
          fd.set("estado", a.estado);
          const r = await avanzarEstado({ ok: true }, fd);
          if (!r.ok) {
            // Si ya estaba en ese estado (por ejemplo, el toque anterior sí llegó), no hay nada que avisar
            if (/transición inválida/i.test(r.error)) await descartar(a.id);
            else await guardar({ ...a, error: r.error });
            continue;
          }
        } else {
          await subirFoto(a);
        }
        await descartar(a.id);
        enviadas++;
      } catch (e) {
        if (esErrorDeRed(e, navigator.onLine)) break; // sin señal: se reintenta después
        await guardar({ ...a, error: (e as { message?: string })?.message ?? "No se pudo enviar" });
      }
    }
  } finally {
    corriendo = false;
  }
  return enviadas;
}
