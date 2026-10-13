"use client";

import { useActionState, useMemo, useState } from "react";
import { cotizar, type EntradaCotizacion, type Modo } from "@/lib/calc/cotizacion";
import { pesoVolumetricoKg } from "@/lib/calc/pricing";
import { ars, porcentaje } from "@/lib/format";
import { guardarCotizacion, type ResultadoGuardar } from "@/app/(app)/cotizaciones/nueva/actions";
import { CampoLugar } from "@/components/campo-lugar";
import type { ChoferCosto, ClienteTel, UnidadCosto } from "@/lib/repos/configuracion";
import Link from "next/link";

interface Props {
  defaults: { precioGasoil: number; viaticoDia: number; iibbPct: number; margen: number };
  clientes: ClienteTel[];
  unidades: UnidadCosto[];
  choferes: ChoferCosto[];
}

interface F {
  clienteId: string; clienteNuevo: string; telefono: string; origen: string; destino: string; km: string; vuelveVacio: boolean;
  unidadId: string; choferId: string; consumo: string; desgaste: string; capacidad: string; costoChofer: string;
  gasoil: string; viatico: string; dias: string; peajes: string; otros: string;
  modo: Modo; kg: string; largo: string; ancho: string; alto: string; bultos: string; paq: string; minima: string;
  margen: string; iibb: string; tarifa: string; vigencia: string; clausula: boolean;
}
type Clave = { [K in keyof F]: F[K] extends string ? K : never }[keyof F];

const n = (s: string) => {
  const v = Number.parseFloat(s);
  return Number.isFinite(v) && v > 0 ? v : 0;
};
const pctTexto = (x: number) => String(Math.round(x * 10000) / 100);
const campoCls = "mt-1 min-h-12 w-full rounded-lg border border-line bg-bg px-3 text-base text-ink";
const etiquetaCls = "text-sm font-medium text-muted";

export function Cotizador({ defaults: d, clientes, unidades, choferes }: Props) {
  const [f, setF] = useState<F>({
    clienteId: "", clienteNuevo: "", telefono: "", origen: "", destino: "", km: "", vuelveVacio: true,
    unidadId: "", choferId: "", consumo: "35", desgaste: "0", capacidad: "0", costoChofer: "0",
    gasoil: d.precioGasoil ? String(d.precioGasoil) : "", viatico: d.viaticoDia ? String(d.viaticoDia) : "", dias: "1", peajes: "0", otros: "0",
    modo: "viaje", kg: "0", largo: "0", ancho: "0", alto: "0", bultos: "0", paq: "0", minima: "0",
    margen: pctTexto(d.margen || 0.3), iibb: pctTexto(d.iibbPct), tarifa: "", vigencia: "48", clausula: false,
  });
  const [msgKm, setMsgKm] = useState("");
  const [calculando, setCalculando] = useState(false);
  const [guardado, accion, pendiente] = useActionState<ResultadoGuardar, FormData>(guardarCotizacion, null);

  const set = <K extends keyof F>(k: K, v: F[K]) => setF((p) => ({ ...p, [k]: v }));
  const Num = ({ k, etiqueta, unidad }: { k: Clave; etiqueta: string; unidad?: string }) => (
    <label className={etiquetaCls}>
      {etiqueta}{unidad ? ` (${unidad})` : ""}
      <input type="number" step="any" min="0" inputMode="decimal" value={f[k]} onChange={(e) => set(k, e.target.value as F[typeof k])} className={campoCls} />
    </label>
  );

  const entrada: EntradaCotizacion = useMemo(() => ({
    km: n(f.km), vuelveVacio: f.vuelveVacio, consumoL100: n(f.consumo), precioGasoil: n(f.gasoil), peajes: n(f.peajes), dias: n(f.dias),
    viaticoDia: n(f.viatico), costoChoferDia: n(f.costoChofer), desgasteKm: n(f.desgaste), otros: n(f.otros), modo: f.modo,
    margen: n(f.margen) / 100, iibb: n(f.iibb) / 100, kgReales: n(f.kg),
    kgVolumetricos: pesoVolumetricoKg([{ largoCm: n(f.largo), anchoCm: n(f.ancho), altoCm: n(f.alto), cantidad: n(f.bultos) }]),
    paquetes: n(f.paq), tarifaMinima: n(f.minima), capacidadKg: n(f.capacidad), tarifaPrueba: n(f.tarifa),
  }), [f]);

  const res = useMemo(() => {
    try {
      return { ok: true as const, r: cotizar(entrada) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Revisá el margen" };
    }
  }, [entrada]);

  async function calcularKm() {
    if (f.origen.trim().length < 2 || f.destino.trim().length < 2) return setMsgKm("Cargá origen y destino primero.");
    setCalculando(true);
    setMsgKm("");
    try {
      const r = await fetch(`/api/distance?origin=${encodeURIComponent(f.origen)}&destination=${encodeURIComponent(f.destino)}`);
      const j = (await r.json()) as { km?: number; minutos?: number; cache?: boolean; error?: string };
      if (!r.ok || !j.km) throw new Error(j.error ?? "No se pudo calcular");
      set("km", String(j.km));
      setMsgKm(`✔ ${j.km} km por ruta${j.minutos ? ` · unas ${Math.floor(j.minutos / 60)} h ${j.minutos % 60} min` : ""}${j.cache ? " · de tus rutas guardadas" : ""}`);
    } catch (e) {
      setMsgKm(`⚠ ${(e as Error).message}`);
    } finally {
      setCalculando(false);
    }
  }

  const elegirUnidad = (id: string) => {
    const u = unidades.find((x) => x.id === id);
    setF((p) => ({ ...p, unidadId: id, ...(u ? { consumo: String(u.consumoL100 || p.consumo), desgaste: String(u.amortizacionKm + u.cubiertasKm + u.mantenimientoKm), capacidad: String(u.capacidadKg) } : {}) }));
  };
  const elegirChofer = (id: string) => setF((p) => ({ ...p, choferId: id, costoChofer: String(choferes.find((c) => c.id === id)?.costoDia ?? 0) }));
  const elegirCliente = (id: string) => setF((p) => ({ ...p, clienteId: id, clienteNuevo: "", telefono: clientes.find((c) => c.id === id)?.telefono ?? p.telefono }));

  const datos = JSON.stringify({
    clienteId: f.clienteId, clienteNuevo: f.clienteNuevo.trim(), telefono: f.telefono, origen: f.origen, destino: f.destino,
    vigenciaHoras: Math.max(1, Math.round(n(f.vigencia)) || 48), clausula: f.clausula, entrada,
  });
  const unidadTxt = f.modo === "kilo" ? "kg" : "paquete";
  const tono = !res.ok ? "" : res.r.nivel === "ok" ? "text-ok" : res.r.nivel === "bajo" ? "text-warn" : "text-bad";

  return (
    <div className="grid gap-4 md:grid-cols-[1.1fr_.9fr] md:items-start">
      <div className="grid gap-4">
        {!n(f.gasoil) && (
          <p role="status" className="rounded-lg bg-warn/15 p-3 text-sm font-medium text-warn">
            ⚠ Falta el precio del gasoil. Cargalo una vez en <Link href="/configuracion" className="underline">Ajustes</Link> y se completa solo.
          </p>
        )}

        <fieldset className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
          <legend className="px-2 font-bold">Cliente</legend>
          <label className={etiquetaCls}>Elegí uno
            <select value={f.clienteId} onChange={(e) => elegirCliente(e.target.value)} className={campoCls}>
              <option value="">— Seleccionar —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <label className={etiquetaCls}>O escribí uno nuevo
            <input value={f.clienteNuevo} onChange={(e) => setF((p) => ({ ...p, clienteNuevo: e.target.value, clienteId: e.target.value ? "" : p.clienteId }))} className={campoCls} />
          </label>
          <label className={etiquetaCls}>WhatsApp del cliente (para enviar la cotización)
            <input type="tel" value={f.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="351 612-3456" className={campoCls} />
          </label>
        </fieldset>

        <fieldset className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
          <legend className="px-2 font-bold">Viaje</legend>
          <CampoLugar etiqueta="Origen" valor={f.origen} onCambio={(v) => set("origen", v)} ejemplo="Córdoba" />
          <CampoLugar etiqueta="Destino" valor={f.destino} onCambio={(v) => set("destino", v)} ejemplo="Villa María" />
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Num k="km" etiqueta="Distancia, un sentido" unidad="km" />
            <button type="button" onClick={calcularKm} disabled={calculando} className="min-h-12 rounded-lg border border-line px-3 text-sm font-medium disabled:opacity-60">
              {calculando ? "Calculando…" : "Calcular con Google"}
            </button>
          </div>
          {msgKm && <p role="status" className="text-sm text-muted">{msgKm}</p>}
          <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={f.vuelveVacio} onChange={(e) => set("vuelveVacio", e.target.checked)} className="h-5 w-5 accent-[var(--brand)]" /> Vuelve vacío (se cuentan ida y vuelta)</label>
        </fieldset>

        <fieldset className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
          <legend className="px-2 font-bold">Costos</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className={etiquetaCls}>Unidad
              <select value={f.unidadId} onChange={(e) => elegirUnidad(e.target.value)} className={campoCls}>
                <option value="">— Manual —</option>
                {unidades.map((u) => <option key={u.id} value={u.id}>{u.patente}</option>)}
              </select>
            </label>
            <label className={etiquetaCls}>Chofer
              <select value={f.choferId} onChange={(e) => elegirChofer(e.target.value)} className={campoCls}>
                <option value="">— Manual —</option>
                {choferes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <Num k="consumo" etiqueta="Consumo" unidad="L/100 km" />
            <Num k="gasoil" etiqueta="Gasoil" unidad="$/L" />
            <Num k="desgaste" etiqueta="Desgaste" unidad="$/km" />
            <Num k="costoChofer" etiqueta="Chofer" unidad="$/día" />
            <Num k="dias" etiqueta="Días de viaje" />
            <Num k="viatico" etiqueta="Viático" unidad="$/día" />
            <Num k="peajes" etiqueta="Peajes" unidad="$" />
            <Num k="otros" etiqueta="Otros costos" unidad="$" />
          </div>
        </fieldset>

        <fieldset className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
          <legend className="px-2 font-bold">Cómo cotizás</legend>
          <div role="radiogroup" aria-label="Forma de cotizar" className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-bg p-1">
            {(["viaje", "kilo", "paquete"] as Modo[]).map((m) => (
              <label key={m} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg text-sm font-bold ${f.modo === m ? "bg-brand text-brand-ink" : ""}`}>
                <input type="radio" name="modo" value={m} checked={f.modo === m} onChange={() => set("modo", m)} className="sr-only" />
                {m === "viaje" ? "Por viaje" : m === "kilo" ? "Por kilo" : "Por paquete"}
              </label>
            ))}
          </div>
          {f.modo !== "viaje" && (
            <div className="grid grid-cols-2 gap-3">
              {f.modo === "kilo" ? <Num k="kg" etiqueta="Kilos cargados" unidad="kg" /> : <><Num k="paq" etiqueta="Paquetes" /><Num k="kg" etiqueta="Peso total" unidad="kg" /></>}
              <Num k="capacidad" etiqueta="Capacidad del camión" unidad="kg" />
              <Num k="minima" etiqueta="Tarifa mínima por viaje" unidad="$" />
              <p className="col-span-2 text-xs text-muted">Peso volumétrico (opcional): se cobra el mayor entre el peso real y el volumétrico, a 250 kg por m³.</p>
              <Num k="bultos" etiqueta="Bultos iguales" />
              <Num k="largo" etiqueta="Largo" unidad="cm" />
              <Num k="ancho" etiqueta="Ancho" unidad="cm" />
              <Num k="alto" etiqueta="Alto" unidad="cm" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Num k="margen" etiqueta="Margen objetivo" unidad="%" />
            <Num k="iibb" etiqueta="Ingresos Brutos" unidad="%" />
            <label className={`${etiquetaCls} col-span-2`}>{f.modo === "viaje" ? "Probar un precio total ($, sin IVA)" : `Probar una tarifa ($ por ${unidadTxt})`}
              <input type="number" step="any" min="0" inputMode="decimal" value={f.tarifa} onChange={(e) => set("tarifa", e.target.value)} placeholder="Opcional" className={campoCls} />
            </label>
            <Num k="vigencia" etiqueta="Vigencia" unidad="horas" />
            <label className="flex min-h-11 items-center gap-3 self-end text-sm"><input type="checkbox" checked={f.clausula} onChange={(e) => set("clausula", e.target.checked)} className="h-5 w-5 accent-[var(--brand)]" /> Actualiza por índice de costos</label>
          </div>
        </fieldset>
      </div>

      <aside className="grid gap-3 md:sticky md:top-4" aria-live="polite">
        {!res.ok ? (
          <p role="alert" className="rounded-2xl border border-bad bg-surface p-4 font-medium text-bad">✖ {res.error}</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="bg-brand p-4 text-brand-ink">
              <p className="text-sm opacity-90">{n(f.tarifa) ? "Precio con la tarifa que probás (sin IVA)" : "Precio sugerido (sin IVA)"}</p>
              <p className="text-3xl font-extrabold tracking-tight">{ars(res.r.precioFinal)}</p>
              <p className="text-sm opacity-90">Con IVA 21 %: {ars(res.r.precioConIva)}</p>
              {res.r.tarifaFinal !== null && <p className="mt-1 text-sm font-bold">{ars(res.r.tarifaFinal)} por {unidadTxt}</p>}
            </div>
            <div className="grid gap-3 p-4">
              <p className={`rounded-lg bg-bg p-3 font-medium ${tono}`}>
                {res.r.costos.total === 0 ? "⚠ Cargá los km y el consumo para calcular." :
                  res.r.nivel === "perdida" ? `✖ Perdés ${ars(res.r.costos.total - res.r.precioFinal * (1 - entrada.iibb))} en este viaje.` :
                  res.r.nivel === "bajo" ? `⚠ Margen real ${porcentaje(res.r.margen)}, bajo tu objetivo de ${porcentaje(entrada.margen, 0)}.` :
                  `✔ Margen real ${porcentaje(res.r.margen)}. Cumple tu objetivo.`}
              </p>
              <dl className="grid gap-1 text-sm">
                {([["Combustible", res.r.costos.combustible], ["Peajes", res.r.costos.peajes], ["Viáticos", res.r.costos.viaticos], ["Chofer", res.r.costos.chofer], ["Desgaste", res.r.costos.desgaste], ["Otros", res.r.costos.otros]] as [string, number][])
                  .filter(([, v]) => v > 0).map(([t, v]) => <div key={t} className="flex justify-between"><dt className="text-muted">{t}</dt><dd>{ars(v)}</dd></div>)}
                <div className="flex justify-between border-t border-line pt-1 font-bold"><dt>Costo total</dt><dd>{ars(res.r.costos.total)}</dd></div>
                {entrada.vuelveVacio && entrada.km > 0 && <div className="flex justify-between text-warn"><dt>Volver vacío te cuesta</dt><dd>{ars(res.r.costoRetornoVacio)} ({porcentaje(res.r.pctVacio, 0)} de los km)</dd></div>}
                {f.modo !== "viaje" && res.r.unidades > 0 && <div className="flex justify-between"><dt className="text-muted">Costo por {unidadTxt}</dt><dd>{ars(res.r.costos.total / res.r.unidades)}</dd></div>}
                {f.modo !== "viaje" && entrada.capacidadKg > 0 && <div className="flex justify-between"><dt className="text-muted">Ocupación del camión</dt><dd>{porcentaje(res.r.ocupacion, 0)}</dd></div>}
                {res.r.equilibrio !== null && <div className="flex justify-between"><dt className="text-muted">Equilibrio (sin ganancia)</dt><dd>{new Intl.NumberFormat("es-AR").format(res.r.equilibrio)} {f.modo === "kilo" ? "kg" : "paquetes"}</dd></div>}
              </dl>
            </div>
          </div>
        )}

        <form action={accion} className="grid gap-2">
          <input type="hidden" name="datos" value={datos} />
          <button name="enviar" value="1" disabled={pendiente || !res.ok} className="min-h-12 rounded-xl bg-brand font-bold text-brand-ink disabled:opacity-60">{pendiente ? "Guardando…" : "Guardar y enviar por WhatsApp"}</button>
          <button name="enviar" value="0" disabled={pendiente || !res.ok} className="min-h-12 rounded-xl border border-line font-medium disabled:opacity-60">Guardar como borrador</button>
        </form>

        {guardado && !guardado.ok && <p role="alert" className="rounded-lg bg-bad/15 p-3 text-sm font-medium text-bad">✖ {guardado.error}</p>}
        {guardado?.ok && (
          <div role="status" className="grid gap-2 rounded-2xl border border-ok bg-surface p-4">
            <p className="font-bold text-ok">✔ Cotización {guardado.numero} guardada{guardado.enviada ? " como enviada" : " como borrador"}.</p>
            {guardado.wa && <a href={guardado.wa} target="_blank" rel="noopener" className="flex min-h-12 items-center justify-center rounded-xl bg-[#1fa855] font-bold text-white">Abrir WhatsApp</a>}
            {guardado.enviada && !guardado.wa && <p className="text-sm text-warn">⚠ Cargá el WhatsApp del cliente para poder mandársela.</p>}
            <Link href="/cotizaciones" className="flex min-h-11 items-center justify-center rounded-lg border border-line">Ver mis cotizaciones</Link>
          </div>
        )}
      </aside>
    </div>
  );
}
