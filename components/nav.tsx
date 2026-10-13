"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECCIONES = [
  { href: "/operaciones", label: "Operaciones", icono: "▤" },
  { href: "/cotizaciones", label: "Cotizar", icono: "✎" },
  { href: "/cobranza", label: "Cobranza", icono: "$" },
  { href: "/alertas", label: "Alertas", icono: "!" },
  { href: "/rentabilidad", label: "Rentabilidad", icono: "↗", soloEscritorio: true },
  { href: "/configuracion", label: "Ajustes", icono: "⚙" },
] as { href: string; label: string; icono: string; soloEscritorio?: boolean }[];

/** Barra inferior en el celular y superior en pantallas grandes. En "Alertas" muestra cuántas urgentes hay. */
export function Nav({ urgentes = 0 }: { urgentes?: number }) {
  const path = usePathname();
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-10 flex gap-1 border-t border-line bg-surface px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] md:static md:border-0 md:bg-transparent md:p-0"
    >
      {SECCIONES.map((s) => {
        const activa = path.startsWith(s.href);
        const badge = s.href === "/alertas" ? urgentes : 0;
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={activa ? "page" : undefined}
            className={`${s.soloEscritorio ? "hidden md:flex" : "flex"} relative min-h-12 flex-1 flex-col items-center justify-center rounded-lg text-xs md:flex-none md:flex-row md:gap-2 md:border md:border-line md:bg-surface md:px-4 md:text-sm ${activa ? "font-bold text-brand" : "text-muted"}`}
          >
            <span aria-hidden="true">{s.icono}</span>
            {s.label}
            {badge > 0 && (
              <span aria-label={`${badge} ${badge === 1 ? "urgente" : "urgentes"}`} className="absolute right-1 top-0.5 min-w-5 rounded-full bg-bad px-1.5 text-center text-[11px] font-bold leading-5 text-brand-ink md:static md:ml-1">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
