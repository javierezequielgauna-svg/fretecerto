import type { Metadata } from "next";
import Link from "next/link";
import { getContexto } from "@/lib/contexto";
import { listarMaestros } from "@/lib/repos/maestros";
import { crearOperacion } from "./actions";

export const metadata: Metadata = { title: "Nueva operación" };

export default async function Nueva({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const { supabase } = await getContexto();
  const m = await listarMaestros(supabase);
  const campo = "mt-1 min-h-12 w-full rounded-lg border border-line bg-bg px-3 text-base text-ink";
  const etiqueta = "text-sm font-medium text-muted";
  const Sel = ({ name, opciones, vacio }: { name: string; opciones: { id: string; etiqueta: string }[]; vacio: string }) => (
    <select name={name} className={campo} defaultValue="">
      <option value="">{vacio}</option>
      {opciones.map((o) => <option key={o.id} value={o.id}>{o.etiqueta}</option>)}
    </select>
  );

  return (
    <section aria-labelledby="t" className="mx-auto max-w-xl">
      <Link href="/operaciones" className="mb-2 inline-flex min-h-11 items-center text-sm text-muted">← Volver a operaciones</Link>
      <h1 id="t" className="mb-3 text-2xl font-extrabold tracking-tight">Nueva operación</h1>
      {e && <p role="alert" className="mb-3 rounded-lg bg-bad/15 p-3 text-sm font-medium text-bad">✖ {e}</p>}

      <form action={crearOperacion} className="grid gap-4">
        <fieldset className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
          <legend className="px-2 font-bold">Cliente</legend>
          <label className={etiqueta}>Elegí uno existente<Sel name="clienteId" opciones={m.clientes} vacio="— Seleccionar —" /></label>
          <label className={etiqueta}>O escribí uno nuevo<input name="clienteNuevo" className={campo} placeholder="Distribuidora Centro" /></label>
        </fieldset>

        <fieldset className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
          <legend className="px-2 font-bold">Viaje</legend>
          <label className={etiqueta}>Origen<input name="origen" required className={campo} placeholder="Córdoba" /></label>
          <label className={etiqueta}>Destino<input name="destino" required className={campo} placeholder="Villa María" /></label>
          <label className={etiqueta}>Distancia en km (un sentido)<input name="km" type="number" step="any" min="0" inputMode="decimal" required className={campo} /></label>
          <label className={etiqueta}>Fecha programada<input name="fecha" type="date" className={campo} /></label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="vuelveVacio" defaultChecked className="h-5 w-5 accent-[var(--brand)]" /> Vuelve vacío (cuenta para el service del camión)</label>
        </fieldset>

        <fieldset className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
          <legend className="px-2 font-bold">Chofer y unidad (opcional)</legend>
          <label className={etiqueta}>Chofer<Sel name="choferId" opciones={m.choferes} vacio="— Sin asignar —" /></label>
          <label className={etiqueta}>O un chofer nuevo<input name="choferNuevo" className={campo} /></label>
          <label className={etiqueta}>Unidad<Sel name="unidadId" opciones={m.unidades} vacio="— Sin asignar —" /></label>
          <label className={etiqueta}>O una patente nueva<input name="unidadNueva" className={campo} placeholder="AE 412 QZ" autoCapitalize="characters" /></label>
        </fieldset>

        <fieldset className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
          <legend className="px-2 font-bold">Plata</legend>
          <label className={etiqueta}>Importe a cobrar, sin IVA ($)<input name="importe" type="number" step="any" min="0" inputMode="decimal" required className={campo} /></label>
          <label className={etiqueta}>Costo estimado del viaje ($)<input name="costo" type="number" step="any" min="0" inputMode="decimal" defaultValue="0" required className={campo} /></label>
          <p className="text-xs text-muted">Podés sacar el costo del cotizador. Con el costo cargado, la tabla te muestra el margen de cada viaje.</p>
        </fieldset>

        <button className="min-h-12 rounded-xl bg-brand font-bold text-brand-ink">Crear operación</button>
      </form>
    </section>
  );
}
