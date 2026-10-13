import type { Metadata } from "next";
import Link from "next/link";
import { getContexto } from "@/lib/contexto";
import { cobranzaPorCliente } from "@/lib/repos/cobranza";
import { nivelPuntaje } from "@/lib/calc/cobranza";
import { ars, plural } from "@/lib/format";

export const metadata: Metadata = { title: "Cobranza" };

const PUNTAJE = {
  bueno: { icono: "✔", texto: "Paga bien", clase: "text-ok" },
  regular: { icono: "⚠", texto: "Se demora", clase: "text-warn" },
  riesgo: { icono: "✖", texto: "Riesgo de mora", clase: "text-bad" },
} as const;

export default async function Cobranza() {
  const { supabase } = await getContexto();
  const clientes = await cobranzaPorCliente(supabase);
  const porCobrar = clientes.reduce((a, c) => a + c.porCobrar, 0);
  const sinFacturar = clientes.reduce((a, c) => a + c.sinFacturar, 0);

  return (
    <section aria-labelledby="t">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 id="t" className="text-2xl font-extrabold tracking-tight">Cobranza</h1>
        <Link href="/rentabilidad" className="flex min-h-11 items-center rounded-xl border border-line px-4 font-medium">Ver rentabilidad</Link>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <Link href="/operaciones?estado=entregada" className="rounded-2xl border border-line bg-surface p-3"><span className="block text-xs text-muted">Entregado sin facturar</span><span className="text-xl font-bold">{ars(sinFacturar)}</span></Link>
        <Link href="/operaciones?estado=facturada" className="rounded-2xl border border-line bg-surface p-3"><span className="block text-xs text-muted">Facturado por cobrar</span><span className="text-xl font-bold">{ars(porCobrar)}</span></Link>
      </div>

      {clientes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted">Cuando tengas clientes con operaciones, vas a ver acá cuánto te deben y cómo pagan.</div>
      ) : (
        <ul className="grid gap-3">
          {clientes.map((c) => {
            const p = PUNTAJE[nivelPuntaje(c.puntaje)];
            return (
              <li key={c.clienteId} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold">{c.nombre}</p>
                  <p className={`text-sm font-bold ${p.clase}`}><span aria-hidden="true">{p.icono}</span> {p.texto} · {c.puntaje}/100</p>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div><dt className="text-muted">Por cobrar</dt><dd className="font-medium">{ars(c.porCobrar)}</dd></div>
                  <div><dt className="text-muted">Sin facturar</dt><dd className="font-medium">{ars(c.sinFacturar)}</dd></div>
                  <div><dt className="text-muted">Cobra en</dt><dd className="font-medium">{c.diasPromCobro === null ? "Sin datos" : plural(c.diasPromCobro, "día", "días")}</dd></div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">El puntaje es una fórmula de ejemplo: 100 menos 4 puntos por cada día de mora promedio. Ajustala a tu criterio.</p>
    </section>
  );
}
