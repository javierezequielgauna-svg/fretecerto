import type { Metadata } from "next";
import Link from "next/link";
import { getContexto } from "@/lib/contexto";
import { listarChoferesTel, listarMantenimientos, listarUnidadesOdo, listarVencimientos } from "@/lib/repos/controles";
import { diaISO, diasEntre } from "@/lib/calc/fechas";
import { fechaAR, plural } from "@/lib/format";
import { actualizarOdometro, borrarVencimiento, crearMantenimiento, crearVencimiento, registrarService, renovarVencimiento } from "../actions";

export const metadata: Metadata = { title: "Vencimientos y service" };

const campo = "mt-1 min-h-12 w-full rounded-lg border border-line bg-bg px-3 text-base text-ink";
const etiqueta = "text-sm font-medium text-muted";
const grupo = "grid gap-3 rounded-2xl border border-line bg-surface p-4";
const boton = "min-h-12 rounded-xl bg-brand font-bold text-brand-ink";
const TIPOS = { seguro: "Seguro", vtv: "VTV / RTO", licencia: "Licencia de conducir", otro: "Otro" } as Record<string, string>;
const km = (n: number) => new Intl.NumberFormat("es-AR").format(n);

export default async function Controles({ searchParams }: { searchParams: Promise<{ ok?: string; e?: string }> }) {
  const { ok, e } = await searchParams;
  const { supabase } = await getContexto();
  const [vencs, mants, unidades, choferes] = await Promise.all([listarVencimientos(supabase), listarMantenimientos(supabase), listarUnidadesOdo(supabase), listarChoferesTel(supabase)]);
  const hoy = diaISO(new Date());

  return (
    <section aria-labelledby="t" className="mx-auto grid max-w-xl gap-4">
      <div>
        <Link href="/alertas" className="inline-flex min-h-11 items-center text-sm text-muted">← Volver a alertas</Link>
        <h1 id="t" className="text-2xl font-extrabold tracking-tight">Vencimientos y service</h1>
      </div>
      {ok && <p role="status" className="rounded-lg bg-ok/15 p-3 text-sm font-medium text-ok">✔ Guardado. Las alertas ya se actualizaron.</p>}
      {e && <p role="alert" className="rounded-lg bg-bad/15 p-3 text-sm font-medium text-bad">✖ {e}</p>}

      <div className={grupo}>
        <h2 className="font-bold">Vencimientos</h2>
        {vencs.length === 0 && <p className="text-sm text-muted">Todavía no cargaste ninguno. Te avisamos a los 30, 7 y 1 días antes.</p>}
        {vencs.map((v) => {
          const dias = diasEntre(hoy, v.fecha);
          const t = dias < 0 ? { i: "✖", c: "text-bad", x: `Venció hace ${plural(-dias, "día", "días")}` } : dias <= 7 ? { i: "✖", c: "text-bad", x: dias === 0 ? "Vence hoy" : `Vence en ${plural(dias, "día", "días")}` } : dias <= 30 ? { i: "⚠", c: "text-warn", x: `Vence en ${dias} días` } : { i: "✔", c: "text-ok", x: `Vence en ${dias} días` };
          return (
            <div key={v.id} className="grid gap-2 rounded-xl border border-line p-3">
              <p className="font-bold">{TIPOS[v.tipo] ?? v.tipo} · {v.sujeto}</p>
              <p className={`text-sm font-medium ${t.c}`}><span aria-hidden="true">{t.i}</span> {t.x} ({fechaAR(v.fecha)})</p>
              <form action={renovarVencimiento} className="grid grid-cols-[1fr_auto] items-end gap-2">
                <input type="hidden" name="id" value={v.id} />
                <label className={etiqueta}>Nueva fecha de vencimiento<input type="date" name="fecha" required className={campo} /></label>
                <button className="min-h-12 rounded-lg border border-line px-3 font-medium">Renovar</button>
              </form>
              <form action={borrarVencimiento}><input type="hidden" name="id" value={v.id} /><button className="min-h-11 text-sm text-muted underline">Borrar</button></form>
            </div>
          );
        })}
      </div>

      <form action={crearVencimiento} className={grupo}>
        <h2 className="font-bold">Agregar un vencimiento</h2>
        <label className={etiqueta}>Qué vence
          <select name="tipo" className={campo} defaultValue="seguro">{Object.entries(TIPOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
        </label>
        <label className={etiqueta}>De quién
          <select name="sujeto" required className={campo} defaultValue="">
            <option value="" disabled>— Elegir —</option>
            <optgroup label="Unidades">{unidades.map((u) => <option key={u.id} value={`u:${u.id}`}>{u.patente}</option>)}</optgroup>
            <optgroup label="Choferes">{choferes.map((c) => <option key={c.id} value={`c:${c.id}`}>{c.nombre}</option>)}</optgroup>
          </select>
        </label>
        <label className={etiqueta}>Vence el<input type="date" name="fecha" required className={campo} /></label>
        <label className={etiqueta}>WhatsApp a quien avisar (opcional; si es un chofer, usa el suyo)<input type="tel" name="telefono" className={campo} placeholder="351 612-3456" /></label>
        <button className={boton}>Agregar vencimiento</button>
      </form>

      <div className={grupo}>
        <h2 className="font-bold">Service por kilómetros</h2>
        <p className="text-sm text-muted">El odómetro suma solo los km de cada operación entregada. Corregilo cuando quieras con el kilometraje real del tablero.</p>
        {unidades.map((u) => (
          <form key={u.id} action={actualizarOdometro} className="grid grid-cols-[1fr_auto] items-end gap-2">
            <input type="hidden" name="unidadId" value={u.id} />
            <label className={etiqueta}>{u.patente}: odómetro (km)<input type="number" name="km" min="0" step="1" defaultValue={u.odometroKm} className={campo} /></label>
            <button className="min-h-12 rounded-lg border border-line px-3 font-medium">Guardar</button>
          </form>
        ))}
        {mants.map((m) => {
          const resta = m.proximoKm - m.odometroKm;
          const t = resta <= 0 ? { i: "✖", c: "text-bad", x: `Pasaste el service por ${km(-resta)} km` } : resta <= 1000 ? { i: "⚠", c: "text-warn", x: `Faltan ${km(resta)} km` } : { i: "✔", c: "text-ok", x: `Faltan ${km(resta)} km` };
          return (
            <div key={m.id} className="grid gap-2 rounded-xl border border-line p-3">
              <p className="font-bold">{m.tipo} · {m.unidad}</p>
              <p className={`text-sm font-medium ${t.c}`}><span aria-hidden="true">{t.i}</span> {t.x} (toca a los {km(m.proximoKm)} km, cada {km(m.cadaKm)})</p>
              <form action={registrarService}>
                <input type="hidden" name="id" value={m.id} /><input type="hidden" name="odometro" value={m.odometroKm} />
                <button className="min-h-11 rounded-lg border border-line px-3 text-sm font-medium">Hice el service ahora ({km(m.odometroKm)} km)</button>
              </form>
            </div>
          );
        })}
      </div>

      <form action={crearMantenimiento} className={grupo}>
        <h2 className="font-bold">Agregar un service</h2>
        <label className={etiqueta}>Unidad
          <select name="unidadId" required className={campo} defaultValue=""><option value="" disabled>— Elegir —</option>{unidades.map((u) => <option key={u.id} value={u.id}>{u.patente}</option>)}</select>
        </label>
        <label className={etiqueta}>Qué es<input name="tipo" required className={campo} placeholder="Cambio de aceite, cubiertas, service…" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className={etiqueta}>Cada (km)<input type="number" name="cadaKm" min="1" required className={campo} placeholder="15000" /></label>
          <label className={etiqueta}>Último a los (km)<input type="number" name="ultimoKm" min="0" required defaultValue="0" className={campo} /></label>
        </div>
        <button className={boton}>Agregar service</button>
      </form>
    </section>
  );
}
