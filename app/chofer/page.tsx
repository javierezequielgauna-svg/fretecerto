import type { Metadata } from "next";
import Link from "next/link";
import { getContexto } from "@/lib/contexto";
import { listarMisOperaciones, type MiOperacion } from "@/lib/repos/chofer";
import { fechaAR, fechaHoraAR } from "@/lib/format";
import { PrecargaViajes } from "@/components/precarga-viajes";
import { InstalarApp } from "@/components/instalar-app";

export const metadata: Metadata = { title: "Mis viajes" };

const ESTADO = { pendiente: "Por cargar", en_carga: "Cargado", en_transito: "En camino", entregada: "Entregado" } as const;

function Tarjeta({ o }: { o: MiOperacion }) {
  const faltaFoto = o.estado === "entregada" && !o.conformado;
  return (
    <li>
      <Link href={`/chofer/${o.id}`} className={`grid gap-1 rounded-2xl border bg-surface p-4 ${faltaFoto ? "border-warn" : "border-line"}`}>
        <span className="flex items-start justify-between gap-2">
          <span className="text-xl font-extrabold">{o.numero}</span>
          <span className="rounded-full border border-line px-2.5 py-0.5 text-sm font-bold">{ESTADO[o.estado]}</span>
        </span>
        <span className="text-lg">{o.origen && o.destino ? `${o.origen} a ${o.destino}` : "Sin ruta"}</span>
        <span className="text-muted">{o.cliente ?? "Sin cliente"}{o.patente ? ` · ${o.patente}` : ""}</span>
        {o.fecha_programada && <span className="text-sm text-muted">Salida: {fechaAR(o.fecha_programada)}</span>}
        {o.eta && <span className="text-sm text-muted">Llegada prevista: {fechaHoraAR(o.eta)}</span>}
        {faltaFoto && <span className="mt-1 font-bold text-warn">⚠ Falta la foto del remito firmado</span>}
      </Link>
    </li>
  );
}

export default async function MisViajes({ searchParams }: { searchParams: Promise<{ clave?: string }> }) {
  const { clave } = await searchParams;
  const { supabase } = await getContexto();
  const ops = await listarMisOperaciones(supabase);
  const activas = ops.filter((o) => o.estado !== "entregada");
  const entregadas = ops.filter((o) => o.estado === "entregada");

  return (
    <section aria-labelledby="t" className="grid gap-4">
      <PrecargaViajes ids={ops.map((o) => o.id)} />
      <h1 id="t" className="text-2xl font-extrabold tracking-tight">Mis viajes</h1>
      {clave && <p role="status" className="rounded-lg bg-ok/15 p-3 font-medium text-ok">✔ Cambiaste tu clave.</p>}
      {ops.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted">No tenés viajes asignados por ahora. Cuando te carguen uno, aparece acá.</p>}
      {activas.length > 0 && <ul className="grid gap-3" aria-label="Viajes para hacer">{activas.map((o) => <Tarjeta key={o.id} o={o} />)}</ul>}
      {entregadas.length > 0 && (
        <div className="grid gap-3">
          <h2 className="font-bold text-muted">Entregados</h2>
          <ul className="grid gap-3">{entregadas.map((o) => <Tarjeta key={o.id} o={o} />)}</ul>
        </div>
      )}
      <InstalarApp />
    </section>
  );
}
