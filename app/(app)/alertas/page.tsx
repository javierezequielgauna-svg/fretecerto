import type { Metadata } from "next";
import Link from "next/link";
import { getContexto } from "@/lib/contexto";
import { listarAbiertas } from "@/lib/repos/alertas";
import type { Severidad, TipoAlerta } from "@/lib/alertas";
import { fechaAR, plural, whatsappLink } from "@/lib/format";
import { actualizarAhora, silenciar } from "./actions";

export const metadata: Metadata = { title: "Alertas" };

const SEV: Record<Severidad, { icono: string; titulo: string; borde: string; texto: string }> = {
  urgente: { icono: "✖", titulo: "Urgentes", borde: "border-l-bad", texto: "text-bad" },
  atencion: { icono: "⚠", titulo: "Para seguir de cerca", borde: "border-l-warn", texto: "text-warn" },
  info: { icono: "•", titulo: "Información", borde: "border-l-line", texto: "text-muted" },
};
const TIPO: Record<TipoAlerta, string> = {
  vencimiento: "Vencimiento", cotizacion: "Cotización", demora: "Demora", sin_facturar: "Sin facturar", factura_vencida: "Cobranza", service: "Mantenimiento",
};

export default async function Alertas({ searchParams }: { searchParams: Promise<{ n?: string; e?: string }> }) {
  const { n, e } = await searchParams;
  const { supabase } = await getContexto();
  const lista = await listarAbiertas(supabase);
  const grupos = (["urgente", "atencion", "info"] as Severidad[]).map((s) => ({ s, items: lista.filter((a) => a.severidad === s) })).filter((g) => g.items.length);

  return (
    <section aria-labelledby="t">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 id="t" className="text-2xl font-extrabold tracking-tight">Alertas</h1>
        <Link href="/alertas/controles" className="flex min-h-11 items-center rounded-xl border border-line px-4 font-medium">Vencimientos y service</Link>
      </div>

      {n !== undefined && <p role="status" className="mb-3 rounded-lg bg-ok/15 p-3 text-sm font-medium text-ok">✔ Alertas actualizadas: {plural(Number(n) || 0, "alerta nueva", "alertas nuevas")}.</p>}
      {e && <p role="alert" className="mb-3 rounded-lg bg-bad/15 p-3 text-sm font-medium text-bad">✖ {e}</p>}

      <form action={actualizarAhora} className="mb-4">
        <button className="min-h-11 rounded-lg border border-line px-4 text-sm font-medium">Actualizar ahora</button>
        <span className="ml-3 text-xs text-muted">Se actualizan solas todos los días a las 8:00.</span>
      </form>

      {grupos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted">
          ✔ No hay alertas abiertas. Cargá vencimientos y service en “Vencimientos y service” para que te avisemos a tiempo.
        </div>
      ) : (
        grupos.map(({ s, items }) => (
          <div key={s} className="mb-5">
            <h2 className={`mb-2 font-bold ${SEV[s].texto}`}><span aria-hidden="true">{SEV[s].icono}</span> {SEV[s].titulo} ({items.length})</h2>
            <ul className="grid gap-3">
              {items.map((a) => {
                const wa = a.telefono && a.mensajeWa ? whatsappLink(a.telefono, a.mensajeWa) : null;
                return (
                  <li key={a.id} className={`rounded-2xl border border-l-4 border-line bg-surface p-4 ${SEV[s].borde}`}>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">{TIPO[a.tipo]} · {fechaAR(a.generada)}{a.mailEnviado ? " · mail enviado" : ""}</p>
                    <p className="mt-1 font-medium">{a.mensaje}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {wa && <a href={wa} target="_blank" rel="noopener" className="flex min-h-11 items-center rounded-lg bg-[#1fa855] px-3 text-sm font-bold text-white">Avisar por WhatsApp</a>}
                      <form action={silenciar}><input type="hidden" name="id" value={a.id} /><button className="min-h-11 rounded-lg border border-line px-3 text-sm">Ya lo resolví</button></form>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
