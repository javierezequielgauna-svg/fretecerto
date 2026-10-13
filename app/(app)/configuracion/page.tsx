import type { Metadata } from "next";
import { getContexto } from "@/lib/contexto";
import { listarChoferesAcceso, listarChoferesCosto, listarUnidadesCosto, obtenerEmpresa, obtenerParametros } from "@/lib/repos/configuracion";
import { urlBase } from "@/lib/url";
import { AccesoChofer } from "@/components/acceso-chofer";
import { InstalarApp } from "@/components/instalar-app";
import { guardarCostoChofer, guardarCostos, guardarCostosUnidad, guardarDatosEmpresa } from "./actions";

export const metadata: Metadata = { title: "Ajustes" };

const pct = (x: number) => String(Math.round(x * 10000) / 100);
const campo = "mt-1 min-h-12 w-full rounded-lg border border-line bg-bg px-3 text-base text-ink";
const etiqueta = "text-sm font-medium text-muted";
const grupo = "grid gap-3 rounded-2xl border border-line bg-surface p-4";
const boton = "min-h-12 rounded-xl bg-brand font-bold text-brand-ink";

export default async function Ajustes({ searchParams }: { searchParams: Promise<{ ok?: string; e?: string }> }) {
  const { ok, e } = await searchParams;
  const { supabase, empresaId, rol } = await getContexto();
  const [empresa, p, unidades, choferes, accesos, urlApp] = await Promise.all([obtenerEmpresa(supabase, empresaId), obtenerParametros(supabase), listarUnidadesCosto(supabase), listarChoferesCosto(supabase), listarChoferesAcceso(supabase), urlBase()]);

  return (
    <section aria-labelledby="t" className="mx-auto grid max-w-xl gap-4">
      <h1 id="t" className="text-2xl font-extrabold tracking-tight">Ajustes</h1>
      <InstalarApp />
      {ok && <p role="status" className="rounded-lg bg-ok/15 p-3 text-sm font-medium text-ok">✔ Cambios guardados.</p>}
      {e && <p role="alert" className="rounded-lg bg-bad/15 p-3 text-sm font-medium text-bad">✖ {e}</p>}

      <form action={guardarDatosEmpresa} className={grupo}>
        <h2 className="font-bold">Tu empresa</h2>
        <p className="text-sm text-muted">Estos datos salen en el remitente de tus remitos.{rol !== "dueno" && " Solo el dueño puede cambiarlos."}</p>
        <label className={etiqueta}>CUIT<input name="cuit" defaultValue={empresa.cuit ?? ""} className={campo} placeholder="30-12345678-9" /></label>
        <label className={etiqueta}>Domicilio<input name="domicilio" defaultValue={empresa.domicilio ?? ""} className={campo} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className={etiqueta}>Punto de venta<input name="puntoVenta" defaultValue={empresa.puntoVenta} inputMode="numeric" className={campo} /></label>
          <label className={etiqueta}>Margen objetivo (%)<input name="objetivo" type="number" step="any" min="0" max="100" defaultValue={pct(empresa.objetivoMargen)} className={campo} /></label>
        </div>
        <button className={boton}>Guardar empresa</button>
      </form>

      <form action={guardarCostos} className={grupo}>
        <h2 className="font-bold">Costos generales</h2>
        <p className="text-sm text-muted">Actualizalos cuando cambien: cada día que guardás queda registrado.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className={etiqueta}>Gasoil ($/litro)<input name="gasoil" type="number" step="any" min="0" defaultValue={p.precioGasoil || ""} required className={campo} /></label>
          <label className={etiqueta}>Viático ($/día)<input name="viatico" type="number" step="any" min="0" defaultValue={p.viaticoDia || ""} className={campo} /></label>
          <label className={etiqueta}>Ingresos Brutos (%)<input name="iibb" type="number" step="any" min="0" max="100" defaultValue={pct(p.iibbPct)} className={campo} /></label>
          <label className={etiqueta}>Índice de costos<input name="indice" type="number" step="any" defaultValue={p.indiceCostos ?? ""} className={campo} placeholder="Opcional" /></label>
        </div>
        <p className="text-xs text-muted">La alícuota de Ingresos Brutos la tenés que confirmar con tu contador.</p>
        <button className={boton}>Guardar costos</button>
      </form>

      <div className={grupo}>
        <h2 className="font-bold">Unidades</h2>
        {unidades.length === 0 && <p className="text-sm text-muted">Todavía no hay unidades. Se crean al cargar una patente en una operación.</p>}
        {unidades.map((u) => (
          <form key={u.id} action={guardarCostosUnidad} className="grid gap-3 rounded-xl border border-line p-3">
            <input type="hidden" name="id" value={u.id} />
            <p className="font-bold">{u.patente}</p>
            <div className="grid grid-cols-2 gap-3">
              <label className={etiqueta}>Consumo (L/100 km)<input name="consumo" type="number" step="any" min="0" defaultValue={u.consumoL100 || ""} className={campo} /></label>
              <label className={etiqueta}>Capacidad (kg)<input name="capacidad" type="number" step="any" min="0" defaultValue={u.capacidadKg || ""} className={campo} /></label>
              <label className={etiqueta}>Amortización ($/km)<input name="amortizacion" type="number" step="any" min="0" defaultValue={u.amortizacionKm} className={campo} /></label>
              <label className={etiqueta}>Cubiertas ($/km)<input name="cubiertas" type="number" step="any" min="0" defaultValue={u.cubiertasKm} className={campo} /></label>
              <label className={`${etiqueta} col-span-2`}>Mantenimiento ($/km)<input name="mantenimiento" type="number" step="any" min="0" defaultValue={u.mantenimientoKm} className={campo} /></label>
            </div>
            <button className="min-h-11 rounded-lg border border-line font-medium">Guardar {u.patente}</button>
          </form>
        ))}
      </div>

      <div className={grupo}>
        <h2 className="font-bold">Choferes</h2>
        {choferes.length === 0 && <p className="text-sm text-muted">Todavía no hay choferes. Se crean al cargarlos en una operación.</p>}
        {choferes.map((c) => (
          <form key={c.id} action={guardarCostoChofer} className="grid grid-cols-[1fr_auto] items-end gap-3">
            <input type="hidden" name="id" value={c.id} />
            <label className={etiqueta}>{c.nombre}: costo por día ($, con cargas)<input name="costoDia" type="number" step="any" min="0" defaultValue={c.costoDia || ""} className={campo} /></label>
            <button className="min-h-12 rounded-lg border border-line px-4 font-medium">Guardar</button>
          </form>
        ))}
      </div>

      {rol === "dueno" && (
        <div className={grupo}>
          <h2 className="font-bold">Acceso de choferes</h2>
          <p className="text-sm text-muted">Con su acceso, el chofer ve solo sus viajes (sin plata), marca Cargué / Salí / Entregué y sube la foto del remito firmado.</p>
          {accesos.length === 0 && <p className="text-sm text-muted">Primero cargá al chofer en una operación.</p>}
          {accesos.map((c) => c.tieneAcceso
            ? <p key={c.id} className="text-sm"><span className="font-bold">{c.nombre}</span> <span className="text-ok">✔ ya tiene acceso</span></p>
            : <AccesoChofer key={c.id} choferId={c.id} nombre={c.nombre} telefono={c.telefono} urlApp={urlApp} />)}
        </div>
      )}
    </section>
  );
}
