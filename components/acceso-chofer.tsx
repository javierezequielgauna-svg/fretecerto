"use client";

import { useActionState } from "react";
import { crearAccesoChofer, type ResultadoAcceso } from "@/app/(app)/configuracion/actions";
import { whatsappLink } from "@/lib/format";

/** El dueño le da acceso a un chofer: se crea la cuenta con una clave temporal que se muestra una sola vez. */
export function AccesoChofer({ choferId, nombre, telefono, urlApp }: { choferId: string; nombre: string; telefono: string | null; urlApp: string }) {
  const [res, accion, pendiente] = useActionState<ResultadoAcceso, FormData>(crearAccesoChofer, null);

  if (res?.ok) {
    const texto = `Hola ${nombre}! Tu acceso a FreteCerto:\nLink: ${urlApp}/login\nMail: ${res.email}\nClave temporal: ${res.clave}\nAl entrar, cambiá la clave desde el menú.`;
    const wa = telefono ? whatsappLink(telefono, texto) : null;
    return (
      <div role="status" className="grid gap-2 rounded-xl border border-ok p-3">
        <p className="font-bold text-ok">✔ Acceso creado para {nombre}</p>
        <p className="text-sm">Mail: <b>{res.email}</b><br />Clave temporal: <b className="select-all">{res.clave}</b></p>
        <p className="text-xs text-warn">⚠ Esta clave se muestra solo ahora. Pasásela al chofer.</p>
        {wa && <a href={wa} target="_blank" rel="noopener" className="flex min-h-11 items-center justify-center rounded-lg bg-[#1fa855] font-bold text-white">Mandar por WhatsApp</a>}
      </div>
    );
  }

  return (
    <form action={accion} className="grid grid-cols-[1fr_auto] items-end gap-2">
      <input type="hidden" name="choferId" value={choferId} />
      <label className="text-sm font-medium text-muted">{nombre}: mail del chofer
        <input type="email" name="email" required autoComplete="off" className="mt-1 min-h-12 w-full rounded-lg border border-line bg-bg px-3 text-base text-ink" />
      </label>
      <button disabled={pendiente} className="min-h-12 rounded-lg border border-line px-3 font-medium disabled:opacity-60">{pendiente ? "Creando…" : "Dar acceso"}</button>
      {res && !res.ok && <p role="alert" className="col-span-2 text-sm text-bad">✖ {res.error}</p>}
    </form>
  );
}
