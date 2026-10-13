import type { Metadata } from "next";
import Link from "next/link";
import { getContexto } from "@/lib/contexto";
import { listarCotizaciones } from "@/lib/repos/cotizaciones";
import { estadoVisible, type EstadoVisible } from "@/lib/cotizaciones";
import { margenReal } from "@/lib/calc/pricing";
import { ars, fechaAR, plural, porcentaje, whatsappLink } from "@/lib/format";
import { aceptarCotizacion, rechazarCotizacion } from "./actions";

export const metadata: Metadata = { title: "Cotizaciones" };

const ESTADO: Record<EstadoVisible, { icono: string; texto: string; clase: string }> = {
  borrador: { icono: "○", texto: "Borrador", clase: "bg-bg text-muted border border-line" },
  enviada: { icono: "➤", texto: "Enviada", clase: "bg-brand/15 text-brand" },
  sin_respuesta: { icono: "⚠", texto: "Sin respuesta", clase: "bg-warn/15 text-warn" },
  vencida: { icono: "✖", texto: "Vencida", clase: "bg-bad/15 text-bad" },
  aceptada: { icono: "✔", texto: "Aceptada", clase: "bg-ok/15 text-ok" },
  rechazada: { icono: "✖", texto: "Rechazada", clase: "bg-bg text-muted border border-line" },
};

export default async function Cotizaciones({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const { supabase } = await getContexto();
  const lista = await listarCotizaciones(supabase);

  return (
    <section aria-labelledby="t">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 id="t" className="text-2xl font-extrabold tracking-tight">Cotizaciones</h1>
        <Link href="/cotizaciones/nueva" className="flex min-h-11 items-center rounded-xl bg-brand px-4 font-bold text-brand-ink">+ Nueva</Link>
      </div>
      {e && <p role="alert" className="mb-3 rounded-lg bg-bad/15 p-3 text-sm font-medium text-bad">✖ {e}</p>}

      {lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted">Todavía no hiciste ninguna cotización. Tocá “+ Nueva” para calcular tu primer viaje.</div>
      ) : (
        <ul className="grid gap-3">
          {lista.map((c) => {
            const v = estadoVisible(c);
            const meta = ESTADO[v.estado];
            const abierta = ["borrador", "enviada", "sin_respuesta", "vencida"].includes(v.estado);
            const seguimiento = v.estado === "sin_respuesta" && c.telefono
              ? whatsappLink(c.telefono, `Hola! Quería saber si pudiste revisar la cotización ${c.numero} (${c.origen ?? ""} a ${c.destino ?? ""}) que te enviamos el ${c.enviadaAt ? fechaAR(c.enviadaAt) : ""}. Quedo atento. Gracias!`)
              : null;
            return (
              <li key={c.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{c.numero} · {c.cliente}</p>
                    <p className="text-sm text-muted">{c.origen && c.destino ? `${c.origen} a ${c.destino}` : "Sin ruta"} · {fechaAR(c.creada)}</p>
                  </div>
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-bold ${meta.clase}`}><span aria-hidden="true">{meta.icono}</span> {meta.texto}</span>
                </div>
                <p className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-semibold">{ars(c.precio)} <span className="font-normal text-muted">+ IVA</span></span>
                  <span className="text-muted">Margen {porcentaje(margenReal(c.precio, c.costo))}</span>
                </p>
                {v.estado === "sin_respuesta" && <p className={`mt-1 text-sm ${v.urgencia === "bad" ? "text-bad" : "text-warn"}`}>Hace {plural(v.dias, "día", "días")} que no responde.</p>}
                {v.estado === "enviada" && c.vigenciaHasta && <p className="mt-1 text-sm text-muted">Vale hasta el {fechaAR(c.vigenciaHasta)}.</p>}
                {abierta && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={aceptarCotizacion}><input type="hidden" name="id" value={c.id} /><button className="min-h-11 rounded-lg bg-brand px-3 text-sm font-bold text-brand-ink">Aceptada: crear operación</button></form>
                    <form action={rechazarCotizacion}><input type="hidden" name="id" value={c.id} /><button className="min-h-11 rounded-lg border border-line px-3 text-sm">Rechazada</button></form>
                    {seguimiento && <a href={seguimiento} target="_blank" rel="noopener" className="flex min-h-11 items-center rounded-lg bg-[#1fa855] px-3 text-sm font-bold text-white">Hacer seguimiento</a>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
