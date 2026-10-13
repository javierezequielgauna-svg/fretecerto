import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getContexto } from "@/lib/contexto";
import { crearOperacionesRepo } from "@/lib/repos/operaciones";
import { listarRemitos } from "@/lib/repos/remitos";
import { fechaAR, whatsappLink } from "@/lib/format";
import { CompartirPdf } from "@/components/compartir-pdf";
import { emitirRemito } from "./actions";

export const metadata: Metadata = { title: "Remito" };

const campo = "mt-1 min-h-12 w-full rounded-lg border border-line bg-bg px-3 text-base text-ink";
const etiqueta = "text-sm font-medium text-muted";
const FILAS = 5;

export default async function Remito({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ r?: string; e?: string }> }) {
  const { id } = await params;
  const { r, e } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const { supabase } = await getContexto();
  const o = await crearOperacionesRepo(supabase).obtener(id);
  if (!o) notFound();
  const remitos = await listarRemitos(supabase, id);
  const nuevo = r ? remitos.find((x) => x.id === r) : undefined;

  const wa = nuevo && o.telefonoCliente
    ? whatsappLink(o.telefonoCliente, `Hola! Te paso el remito ${nuevo.numero} de la operación ${o.numero} (${o.origen ?? ""} a ${o.destino ?? ""}). Te mando el PDF en este chat. Gracias!`)
    : null;

  return (
    <section aria-labelledby="t" className="mx-auto grid max-w-xl gap-4">
      <div>
        <Link href={`/operaciones/${id}`} className="inline-flex min-h-11 items-center text-sm text-muted">← Volver a {o.numero}</Link>
        <h1 id="t" className="text-2xl font-extrabold tracking-tight">Remito de {o.numero}</h1>
        <p className="text-sm text-muted">Remito interno tipo X: no vale como factura ni como remito electrónico de ARCA.</p>
      </div>

      {e && <p role="alert" className="rounded-lg bg-bad/15 p-3 text-sm font-medium text-bad">✖ {e}</p>}

      {nuevo && (
        <div role="status" className="grid gap-2 rounded-2xl border border-ok bg-surface p-4">
          <p className="font-bold text-ok">✔ Remito {nuevo.numero} emitido y guardado.</p>
          <a href={`/remitos/${nuevo.id}/pdf`} target="_blank" rel="noopener" className="flex min-h-12 items-center justify-center rounded-xl border border-line font-medium">Ver PDF</a>
          <CompartirPdf url={`/remitos/${nuevo.id}/pdf`} nombre={`Remito-${nuevo.numero}.pdf`} texto={`Remito ${nuevo.numero} de ${o.numero}`} />
          {wa && <a href={wa} target="_blank" rel="noopener" className="flex min-h-11 items-center justify-center rounded-lg border border-line text-sm">Solo el mensaje por WhatsApp (adjuntás el PDF a mano)</a>}
          {!o.telefonoCliente && <p className="text-xs text-muted">Si cargás el WhatsApp del cliente, también te armamos el mensaje.</p>}
        </div>
      )}

      <form action={emitirRemito} className="grid gap-4">
        <input type="hidden" name="operacionId" value={id} />
        <fieldset className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
          <legend className="px-2 font-bold">Quién recibe</legend>
          <label className={etiqueta}>Nombre o razón social<input name="destNombre" required defaultValue={o.cliente === "Sin cliente" ? "" : o.cliente} className={campo} /></label>
          <label className={etiqueta}>CUIT o DNI<input name="destCuit" inputMode="numeric" className={campo} /></label>
          <label className={etiqueta}>Dirección de entrega<input name="destDom" className={campo} placeholder={o.destino ?? ""} /></label>
        </fieldset>

        <fieldset className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
          <legend className="px-2 font-bold">Transporte</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className={etiqueta}>Chofer<input name="chofer" defaultValue={o.chofer ?? ""} className={campo} /></label>
            <label className={etiqueta}>Patente<input name="patente" defaultValue={o.patente ?? ""} autoCapitalize="characters" className={campo} /></label>
          </div>
        </fieldset>

        <fieldset className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
          <legend className="px-2 font-bold">Mercadería (hasta {FILAS} ítems)</legend>
          {Array.from({ length: FILAS }, (_, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-line p-3">
              <label className={`${etiqueta} col-span-2`}>Ítem {i + 1}<input name={`desc${i}`} className={campo} placeholder={i === 0 ? "Ej: cajas de alimentos secos" : "Opcional"} /></label>
              <label className={etiqueta}>Bultos<input name={`bul${i}`} type="number" min="0" step="any" inputMode="decimal" defaultValue={i === 0 && o.paquetes ? o.paquetes : ""} className={campo} /></label>
              <label className={etiqueta}>Peso (kg)<input name={`kg${i}`} type="number" min="0" step="any" inputMode="decimal" defaultValue={i === 0 && o.kg ? o.kg : ""} className={campo} /></label>
            </div>
          ))}
          <label className={etiqueta}>Valor declarado en $ (opcional)<input name="valor" type="number" min="0" step="any" inputMode="decimal" className={campo} /></label>
          <label className={etiqueta}>Observaciones<textarea name="obs" rows={3} className={`${campo} py-2`} /></label>
        </fieldset>

        <button className="min-h-12 rounded-xl bg-brand font-bold text-brand-ink">Emitir remito y guardar PDF</button>
      </form>

      {remitos.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="mb-2 font-bold">Remitos de esta operación</h2>
          <ul className="grid gap-1.5 text-sm">
            {remitos.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3">
                <span>{x.numero} <span className="text-muted">· {fechaAR(x.fecha)}</span></span>
                {x.tienePdf && <a href={`/remitos/${x.id}/pdf`} target="_blank" rel="noopener" className="flex min-h-11 items-center px-2 underline">Ver PDF</a>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
