import type { Metadata } from "next";
import Link from "next/link";
import { getContexto } from "@/lib/contexto";
import { crearOperacionesRepo } from "@/lib/repos/operaciones";
import { ESTADOS, ESTADO_META, SIGUIENTE } from "@/lib/estados";
import { POR_PAGINA, leerFiltros, urlOperaciones, type Orden } from "@/lib/filtros";
import { calcularResumen } from "@/lib/calc/resumen";
import { margenReal, nivelMargen } from "@/lib/calc/pricing";
import { diaISO, diasEntre } from "@/lib/calc/fechas";
import { ars, fechaAR, plural, porcentaje } from "@/lib/format";
import { Kpis } from "@/components/kpis";
import { AvanzarBoton } from "@/components/avanzar-boton";

export const metadata: Metadata = { title: "Operaciones" };

type Params = Record<string, string | string[] | undefined>;
const ORDEN_TEXTO: Record<Orden, string> = {
  fecha_desc: "Más nuevas primero", fecha_asc: "Más viejas primero", numero_asc: "Número ascendente", numero_desc: "Número descendente",
  importe_desc: "Importe mayor a menor", importe_asc: "Importe menor a mayor", estado_asc: "Estado (inicio a fin)", estado_desc: "Estado (fin a inicio)",
};
const CHIPS = [{ v: undefined, t: "Todas" }, { v: "curso" as const, t: "En curso" }, ...ESTADOS.map((e) => ({ v: e, t: ESTADO_META[e].label }))];

export default async function Operaciones({ searchParams }: { searchParams: Promise<Params> }) {
  const f = leerFiltros(await searchParams);
  const { supabase, objetivoMargen } = await getContexto();
  const repo = crearOperacionesRepo(supabase);
  const [base, { filas, total }] = await Promise.all([repo.resumenBase(), repo.listarPagina(f)]);
  const resumen = calcularResumen(base);
  const hoy = diaISO(new Date());
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const alternar = (campo: "fecha" | "numero" | "importe" | "estado") => (f.o === `${campo}_desc` ? `${campo}_asc` : `${campo}_desc`) as Orden;
  const Th = ({ campo, children, derecha }: { campo: "fecha" | "numero" | "importe" | "estado"; children: React.ReactNode; derecha?: boolean }) => {
    const activo = f.o.startsWith(campo);
    const asc = f.o.endsWith("_asc");
    return (
      <th scope="col" aria-sort={activo ? (asc ? "ascending" : "descending") : "none"} className={`p-3 font-bold ${derecha ? "text-right" : ""}`}>
        <Link href={urlOperaciones(f, { o: alternar(campo), pag: 1 })} className="inline-flex min-h-8 items-center">
          {children}{activo ? (asc ? " ▲" : " ▼") : ""}
        </Link>
      </th>
    );
  };
  const celdaBase = "flex items-start justify-between gap-3 py-1 text-right before:text-left before:text-sm before:text-muted before:content-[attr(data-l)] md:table-cell md:p-3 md:before:content-none";
  const celda = `${celdaBase} md:text-left`;
  const celdaDer = `${celdaBase} md:text-right`;

  return (
    <section aria-labelledby="t">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 id="t" className="text-2xl font-extrabold tracking-tight">Operaciones</h1>
        <Link href="/operaciones/nueva" className="flex min-h-11 items-center rounded-xl bg-brand px-4 font-bold text-brand-ink">+ Nueva</Link>
      </div>

      <Kpis r={resumen} objetivo={objetivoMargen} />

      <form method="get" action="/operaciones" role="search" className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        {f.estado && <input type="hidden" name="estado" value={f.estado} />}
        <input type="search" name="q" defaultValue={f.q} placeholder="Buscar por número o cliente" aria-label="Buscar operaciones" className="min-h-12 rounded-lg border border-line bg-surface px-3" />
        <select name="o" defaultValue={f.o} aria-label="Ordenar por" className="min-h-12 rounded-lg border border-line bg-surface px-3">
          {Object.entries(ORDEN_TEXTO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
        <button className="min-h-12 rounded-lg border border-line px-4 font-medium">Buscar</button>
      </form>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por estado">
        {CHIPS.map((c) => (
          <Link key={c.t} href={urlOperaciones(f, { estado: c.v, pag: 1 })} aria-current={f.estado === c.v ? "true" : undefined}
            className={`flex min-h-11 flex-none items-center rounded-full border px-4 text-sm ${f.estado === c.v ? "border-brand bg-brand font-bold text-brand-ink" : "border-line bg-surface"}`}>
            {c.t}
          </Link>
        ))}
      </div>

      {filas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted">
          {f.q || f.estado ? "No hay operaciones con este filtro. Probá limpiar la búsqueda." : "Todavía no cargaste ninguna operación. Tocá “+ Nueva” para empezar."}
        </div>
      ) : (
        <table className="block w-full text-left md:table md:overflow-hidden md:rounded-2xl md:border md:border-line md:bg-surface">
          <thead className="hidden bg-bg text-sm text-muted md:table-header-group">
            <tr>
              <Th campo="numero">Operación</Th>
              <th scope="col" className="p-3 font-bold">Cliente y ruta</th>
              <Th campo="estado">Estado</Th>
              <Th campo="importe" derecha>Importe</Th>
              <th scope="col" className="p-3 text-right font-bold">Margen</th>
              <th scope="col" className="p-3 font-bold">Acciones</th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {filas.map((o) => {
              const m = margenReal(o.importe, o.costo);
              const nivel = nivelMargen(m, objetivoMargen);
              const meta = ESTADO_META[o.estado];
              const sig = SIGUIENTE[o.estado];
              const mora = o.estado === "facturada" && o.vencimientoCobro ? diasEntre(o.vencimientoCobro, hoy) : null;
              return (
                <tr key={o.id} className="mb-3 block rounded-2xl border border-line bg-surface p-3 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-t md:p-0">
                  <td data-l="Operación" className={celda}>
                    <span><Link href={`/operaciones/${o.id}`} className="font-bold underline-offset-2 hover:underline">{o.numero}</Link><span className="block text-sm text-muted">{fechaAR(o.creada)}</span></span>
                  </td>
                  <td data-l="Cliente" className={celda}>
                    <span>{o.cliente}<span className="block text-sm text-muted">{o.origen && o.destino ? `${o.origen} a ${o.destino}` : "Sin ruta"}</span></span>
                  </td>
                  <td data-l="Estado" className={celda}>
                    <span>
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-bold ${meta.clase}`}><span aria-hidden="true">{meta.icono}</span> {meta.label}</span>
                      {o.estado === "entregada" && !o.conformado && <span className="mt-1 block text-xs text-warn">⚠ Sin remito firmado</span>}
                      {mora !== null && o.vencimientoCobro && (
                        <span className={`mt-1 block text-xs ${mora > 0 ? "text-bad" : "text-muted"}`}>
                          {mora > 0 ? `✖ Vencida hace ${plural(mora, "día", "días")}` : `Vence ${fechaAR(o.vencimientoCobro)}`}
                        </span>
                      )}
                    </span>
                  </td>
                  <td data-l="Importe" className={celdaDer}>{ars(o.importe)}</td>
                  <td data-l="Margen" className={`${celdaDer} ${nivel === "ok" ? "text-ok" : nivel === "bajo" ? "text-warn" : "text-bad"}`}>
                    {nivel === "ok" ? "✔" : nivel === "bajo" ? "⚠" : "✖"} {porcentaje(m)}
                  </td>
                  <td className="block pt-2 md:table-cell md:p-3">
                    {sig && <AvanzarBoton id={o.id} siguiente={sig.estado} etiqueta={sig.etiqueta} aviso={o.estado === "entregada" && !o.conformado ? "Todavía no subieron el remito firmado" : undefined} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <nav aria-label="Páginas" className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-muted">{plural(total, "resultado", "resultados")} · página {Math.min(f.pag, paginas)} de {paginas}</span>
        <span className="flex gap-2">
          {f.pag > 1 ? <Link href={urlOperaciones(f, { pag: f.pag - 1 })} className="flex min-h-11 items-center rounded-lg border border-line px-4">Anterior</Link> : <span className="flex min-h-11 items-center rounded-lg border border-line px-4 opacity-40">Anterior</span>}
          {f.pag < paginas ? <Link href={urlOperaciones(f, { pag: f.pag + 1 })} className="flex min-h-11 items-center rounded-lg border border-line px-4">Siguiente</Link> : <span className="flex min-h-11 items-center rounded-lg border border-line px-4 opacity-40">Siguiente</span>}
        </span>
      </nav>
    </section>
  );
}
