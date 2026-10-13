import type { Metadata } from "next";
import Link from "next/link";
import { getContexto } from "@/lib/contexto";
import { obtenerRentabilidad, type Dimension } from "@/lib/repos/rentabilidad";
import { diagnosticar, resumenRentabilidad, type Accion } from "@/lib/rentabilidad";
import { ars, plural, porcentaje } from "@/lib/format";

export const metadata: Metadata = { title: "Rentabilidad" };

const DIMS: { v: Dimension; t: string }[] = [{ v: "ruta", t: "Rutas" }, { v: "cliente", t: "Clientes" }, { v: "chofer", t: "Choferes" }, { v: "unidad", t: "Unidades" }];
const PERIODOS: { v: string; t: string; dias: number | null }[] = [{ v: "30", t: "30 días", dias: 30 }, { v: "90", t: "90 días", dias: 90 }, { v: "todo", t: "Todo", dias: null }];
const ACCION: Record<Accion, { icono: string; texto: string; clase: string }> = {
  rechazar: { icono: "✖", texto: "Conviene rechazar o subir la tarifa", clase: "text-bad" },
  revisar: { icono: "⚠", texto: "Revisar la tarifa", clase: "text-warn" },
  mantener: { icono: "✔", texto: "Mantener", clase: "text-ok" },
};

export default async function Rentabilidad({ searchParams }: { searchParams: Promise<{ dim?: string; p?: string }> }) {
  const sp = await searchParams;
  const dim = DIMS.find((d) => d.v === sp.dim)?.v ?? "ruta";
  const per = PERIODOS.find((p) => p.v === sp.p) ?? PERIODOS[1];
  const { supabase, objetivoMargen } = await getContexto();
  const filas = await obtenerRentabilidad(supabase, dim, per.dias);

  const items = filas
    .map((f) => ({ f, d: diagnosticar(f, objetivoMargen) }))
    .sort((a, b) => (a.f.margen ?? 1) - (b.f.margen ?? 1)); // el peor margen primero
  const total = resumenRentabilidad(filas);
  const revisar = items.filter((i) => i.d.accion !== "mantener").slice(0, 3);
  const url = (cambios: { dim?: string; p?: string }) => `/rentabilidad?dim=${cambios.dim ?? dim}&p=${cambios.p ?? per.v}`;
  const chip = (activo: boolean) => `flex min-h-11 flex-none items-center rounded-full border px-4 text-sm ${activo ? "border-brand bg-brand font-bold text-brand-ink" : "border-line bg-surface"}`;

  return (
    <section aria-labelledby="t">
      <h1 id="t" className="mb-3 text-2xl font-extrabold tracking-tight">Rentabilidad</h1>

      <div className="mb-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Agrupar por">
        {DIMS.map((d) => <Link key={d.v} href={url({ dim: d.v })} aria-current={d.v === dim ? "true" : undefined} className={chip(d.v === dim)}>{d.t}</Link>)}
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Período">
        {PERIODOS.map((p) => <Link key={p.v} href={url({ p: p.v })} aria-current={p.v === per.v ? "true" : undefined} className={chip(p.v === per.v)}>{p.t}</Link>)}
      </div>

      {filas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted">Todavía no hay viajes en marcha o terminados en este período. Cuando haya, vas a ver cuánto ganás con cada {dim}.</div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-line bg-surface p-3"><span className="block text-xs text-muted">Ingresos</span><span className="block font-bold">{ars(total.ingresos)}</span></div>
            <div className="rounded-2xl border border-line bg-surface p-3"><span className="block text-xs text-muted">Viajes</span><span className="block font-bold">{total.viajes}</span></div>
            <div className="rounded-2xl border border-line bg-surface p-3">
              <span className="block text-xs text-muted">Margen</span>
              <span className={`block font-bold ${total.margen !== null && total.margen + 1e-4 >= objetivoMargen ? "text-ok" : "text-warn"}`}>{total.margen === null ? "—" : `${total.margen + 1e-4 >= objetivoMargen ? "✔" : "⚠"} ${porcentaje(total.margen)}`}</span>
            </div>
          </div>

          {revisar.length > 0 && (
            <div className="mb-4 rounded-2xl border border-warn bg-surface p-4">
              <h2 className="mb-2 font-bold">Qué conviene revisar</h2>
              <ul className="grid gap-2 text-sm">
                {revisar.map(({ f, d }) => (
                  <li key={f.clave ?? f.nombre}>
                    <span className={`font-bold ${ACCION[d.accion].clase}`}>{ACCION[d.accion].icono} {f.nombre}</span>: {d.avisos[0]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="grid gap-3 md:grid-cols-2">
            {items.map(({ f, d }) => {
              const a = ACCION[d.accion];
              return (
                <li key={f.clave ?? f.nombre} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold">{f.nombre}</p>
                    <p className={`whitespace-nowrap text-sm font-bold ${a.clase}`}><span aria-hidden="true">{a.icono}</span> {f.margen === null ? "—" : porcentaje(f.margen)}</p>
                  </div>
                  <p className="text-sm text-muted">{plural(f.viajes, "viaje", "viajes")} · {ars(f.ingresos)} de ingresos</p>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div><dt className="text-muted">Costo por km</dt><dd className="font-medium">{f.costoKm === null ? "—" : ars(f.costoKm)}</dd></div>
                    <div><dt className="text-muted">Km vacíos</dt><dd className="font-medium">{f.pctVacio === null ? "—" : `${Math.round(f.pctVacio)} %`}</dd></div>
                    <div><dt className="text-muted">A horario</dt><dd className="font-medium">{f.pctATiempo === null ? "—" : `${Math.round(f.pctATiempo)} %`}</dd></div>
                  </dl>
                  <p className={`mt-2 text-sm font-medium ${a.clase}`}>{a.texto}</p>
                  {d.avisos.map((m) => <p key={m} className="text-sm text-muted">• {m}</p>)}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="mt-4 text-xs text-muted">Los costos son los estimados al cargar cada viaje, salvo que hayas cargado el costo real en el detalle de la operación. Cuanto más real el costo, más confiable el margen.</p>
    </section>
  );
}
