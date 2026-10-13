import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getContexto } from "@/lib/contexto";
import { crearOperacionesRepo } from "@/lib/repos/operaciones";
import { ESTADO_META, SIGUIENTE } from "@/lib/estados";
import { margenReal, nivelMargen } from "@/lib/calc/pricing";
import { ars, fechaAR, porcentaje, whatsappLink } from "@/lib/format";
import { AvanzarBoton } from "@/components/avanzar-boton";
import { guardarCostoReal } from "../actions";
import { SubirConformado } from "@/components/subir-conformado";
import { CopiarLink } from "@/components/copiar-link";
import { urlBase } from "@/lib/url";

export const metadata: Metadata = { title: "Operación" };

const hora = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Cordoba" }).format(new Date(iso));

export default async function Detalle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string }> }) {
  const { id } = await params;
  const { e } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase, empresaId, objetivoMargen } = await getContexto();
  const repo = crearOperacionesRepo(supabase);
  const o = await repo.obtener(id);
  if (!o) notFound();
  const eventos = await repo.eventos(id);

  const m = margenReal(o.importe, o.costo);
  const nivel = nivelMargen(m, objetivoMargen);
  const meta = ESTADO_META[o.estado];
  const sig = SIGUIENTE[o.estado];
  const wa = o.telefonoCliente ? whatsappLink(o.telefonoCliente, `Hola! Te escribo por la operación ${o.numero} (${o.origen ?? ""} a ${o.destino ?? ""}).`) : null;
  const link = `${await urlBase()}/seguimiento/${o.token}`;
  const waLink = o.telefonoCliente ? whatsappLink(o.telefonoCliente, `Hola! Podés seguir tu carga ${o.numero} en este link: ${link}`) : null;
  const dato = (t: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-3 border-b border-line py-2 last:border-0"><dt className="text-muted">{t}</dt><dd className="text-right font-medium">{v}</dd></div>
  );

  return (
    <section aria-labelledby="t" className="mx-auto grid max-w-xl gap-4">
      <div>
        <Link href="/operaciones" className="inline-flex min-h-11 items-center text-sm text-muted">← Volver a operaciones</Link>
        <div className="flex items-start justify-between gap-3">
          <h1 id="t" className="text-2xl font-extrabold tracking-tight">{o.numero}</h1>
          <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-bold ${meta.clase}`}><span aria-hidden="true">{meta.icono}</span> {meta.label}</span>
        </div>
        <p className="text-muted">{o.cliente} · {o.origen && o.destino ? `${o.origen} a ${o.destino}` : "Sin ruta"}</p>
      </div>

      <dl className="rounded-2xl border border-line bg-surface px-4">
        {dato("Importe (sin IVA)", ars(o.importe))}
        {dato("Costo", ars(o.costo))}
        {dato("Margen", <span className={nivel === "ok" ? "text-ok" : nivel === "bajo" ? "text-warn" : "text-bad"}>{nivel === "ok" ? "✔" : nivel === "bajo" ? "⚠" : "✖"} {porcentaje(m)}</span>)}
        {dato("Distancia", `${o.km} km`)}
        {dato("Chofer", o.chofer ?? "Sin asignar")}
        {dato("Unidad", o.patente ?? "Sin asignar")}
        {o.fechaProgramada && dato("Fecha programada", fechaAR(o.fechaProgramada))}
        {o.vencimientoCobro && dato("Vence el cobro", fechaAR(o.vencimientoCobro))}
      </dl>

      {e && <p role="alert" className="rounded-lg bg-bad/15 p-3 text-sm font-medium text-bad">✖ {e}</p>}
      <form action={guardarCostoReal} className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-2xl border border-line bg-surface p-4">
        <input type="hidden" name="id" value={o.id} />
        <label className="text-sm font-medium text-muted">Costo real del viaje ($){o.costoReal === null && " · hoy se usa el estimado"}
          <input name="costo" type="number" step="any" min="0" inputMode="decimal" defaultValue={o.costoReal ?? ""} required className="mt-1 min-h-12 w-full rounded-lg border border-line bg-bg px-3 text-base text-ink" />
        </label>
        <button className="min-h-12 rounded-lg border border-line px-3 font-medium">Guardar</button>
      </form>

      <div className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-bold">Remito firmado</h2>
        <p className={`text-sm ${o.conformado ? "text-ok" : "text-warn"}`}>
          {o.conformado ? "✔ Cargado: la operación ya se puede facturar." : "⚠ Todavía no hay foto del remito firmado."}
        </p>
        {o.conformado && <a href={`/operaciones/${o.id}/conformado`} target="_blank" rel="noopener" className="flex min-h-11 items-center justify-center rounded-lg border border-line">Ver foto</a>}
        <SubirConformado operacionId={o.id} empresaId={empresaId} tiene={o.conformado} />
      </div>

      <div className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-bold">Link de seguimiento para tu cliente</h2>
        <p className="text-sm text-muted">Quien tenga este link ve el estado y la hora estimada de llegada. No ve precios ni datos del chofer.</p>
        <CopiarLink url={link} />
        {waLink && <a href={waLink} target="_blank" rel="noopener" className="flex min-h-11 items-center justify-center rounded-lg bg-[#1fa855] font-bold text-white">Mandarle el link por WhatsApp</a>}
      </div>

      <div className="grid gap-2">
        <Link href={`/operaciones/${o.id}/remito`} className="flex min-h-11 items-center justify-center rounded-lg border border-line font-medium">Hacer remito (PDF)</Link>
        {sig && <AvanzarBoton id={o.id} siguiente={sig.estado} etiqueta={sig.etiqueta} aviso={o.estado === "entregada" && !o.conformado ? "Todavía no subieron el remito firmado" : undefined} />}
        {wa && <a href={wa} target="_blank" rel="noopener" className="flex min-h-11 items-center justify-center rounded-lg bg-[#1fa855] font-bold text-white">Escribirle al cliente por WhatsApp</a>}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-2 font-bold">Historial</h2>
        <ol className="grid gap-1.5 text-sm">
          {eventos.map((ev, i) => (
            <li key={i} className="flex justify-between gap-3"><span><span aria-hidden="true">{ESTADO_META[ev.estado].icono}</span> {ESTADO_META[ev.estado].label}</span><span className="text-muted">{hora(ev.at)}</span></li>
          ))}
        </ol>
      </div>
    </section>
  );
}
