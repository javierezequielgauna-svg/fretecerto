import Link from "next/link";
import type { Resumen } from "@/lib/calc/resumen";
import { TOLERANCIA_MARGEN } from "@/lib/calc/pricing";
import { ars, plural, porcentaje } from "@/lib/format";

type Tono = "ok" | "warn" | "bad";
const BORDE: Record<Tono, string> = { ok: "border-line", warn: "border-warn", bad: "border-bad" };
const TEXTO: Record<Tono, string> = { ok: "text-ok", warn: "text-warn", bad: "text-bad" };

/** Los cuatro indicadores de plata. Cada uno filtra la tabla (menos el margen). */
export function Kpis({ r, objetivo }: { r: Resumen; objetivo: number }) {
  const margenOk = r.margen + TOLERANCIA_MARGEN >= objetivo;
  const { sinFacturar: sf, porCobrar: pc } = r;
  const items: { t: string; v: string; d: string; href: string | null; tono: Tono }[] = [
    { t: "En curso", v: String(r.enCurso), d: "En carga o en tránsito", href: "/operaciones?estado=curso", tono: "ok" },
    { t: "Margen real", v: porcentaje(r.margen), d: `${margenOk ? "✔ Cumple" : "⚠ Bajo"} el objetivo de ${porcentaje(objetivo, 0)}`, href: null, tono: margenOk ? "ok" : "warn" },
    {
      t: "Entregado sin facturar", v: ars(sf.monto),
      d: sf.cantidad ? `✖ ${plural(sf.cantidad, "carga", "cargas")} · la más vieja hace ${plural(sf.diasMasVieja, "día", "días")}` : "✔ Todo facturado",
      href: "/operaciones?estado=entregada", tono: sf.cantidad ? "bad" : "ok",
    },
    {
      t: "Facturado por cobrar", v: ars(pc.monto),
      d: pc.vencidas ? `✖ ${plural(pc.vencidas, "vencida", "vencidas")} (${ars(pc.montoVencido)})` : `${plural(pc.cantidad, "factura pendiente", "facturas pendientes")}`,
      href: "/operaciones?estado=facturada", tono: pc.vencidas ? "bad" : pc.cantidad ? "warn" : "ok",
    },
  ];
  return (
    <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
      {items.map((k) => {
        const cuerpo = (
          <>
            <span className="block text-xs text-muted">{k.t}</span>
            <span className="block text-xl font-bold leading-snug">{k.v}</span>
            <span className={`block text-xs font-bold ${TEXTO[k.tono]}`}>{k.d}</span>
          </>
        );
        const clase = `block rounded-2xl border bg-surface p-3 ${BORDE[k.tono]}`;
        return k.href ? (
          <Link key={k.t} href={k.href} className={clase}>{cuerpo}</Link>
        ) : (
          <div key={k.t} className={clase}>{cuerpo}</div>
        );
      })}
    </div>
  );
}
