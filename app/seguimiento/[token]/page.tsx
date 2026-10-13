import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { mensajeEstado, pasosSeguimiento } from "@/lib/seguimiento";
import { fechaHoraAR } from "@/lib/format";
import { AutoRefresco } from "@/components/auto-refresco";

// El link es privado por ser un código largo y al azar: que no lo indexen los buscadores.
export const metadata: Metadata = { title: "Seguí tu carga", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const dato = z.object({
  empresa: z.string(),
  numero: z.string(),
  estado: z.enum(["pendiente", "en_carga", "en_transito", "entregada", "cancelada"]),
  eta: z.string().nullable(),
  origen: z.string().nullable(),
  destino: z.string().nullable(),
  actualizado: z.string(),
  eventos: z.array(z.object({ estado: z.string(), at: z.string() })),
});

export default async function Seguimiento({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!z.string().uuid().safeParse(token).success) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("seguimiento_publico", { p_token: token });
  const r = dato.safeParse(data);
  if (!r.success) notFound();
  const d = r.data;
  const pasos = pasosSeguimiento(d.estado, d.eventos);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 p-5">
      <AutoRefresco segundos={60} />
      <header>
        <p className="text-sm text-muted">{d.empresa}</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Seguí tu carga {d.numero}</h1>
        {d.origen && d.destino && <p className="text-muted">{d.origen} a {d.destino}</p>}
      </header>

      <p role="status" className={`rounded-2xl border p-4 text-lg font-bold ${d.estado === "entregada" ? "border-ok text-ok" : d.estado === "cancelada" ? "border-bad text-bad" : "border-line"}`}>
        {mensajeEstado(d.estado, d.eta)}
      </p>

      {pasos.length > 0 && (
        <ol className="grid gap-0 rounded-2xl border border-line bg-surface p-4">
          {pasos.map((p, i) => (
            <li key={p.titulo} aria-current={p.actual ? "step" : undefined} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span aria-hidden="true" className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${p.hecho ? "bg-brand text-brand-ink" : "border border-line text-muted"}`}>{p.hecho ? "✔" : i + 1}</span>
                {i < pasos.length - 1 && <span className={`h-8 w-0.5 ${p.hecho ? "bg-brand" : "bg-line"}`} />}
              </div>
              <div className="pb-4">
                <p className={`font-bold ${p.hecho ? "" : "text-muted"}`}>{p.titulo}{p.actual ? " (ahora)" : ""}</p>
                {p.cuando && <p className="text-sm text-muted">{p.cuando}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}

      <footer className="mt-auto text-center text-xs text-muted">
        Actualizado {fechaHoraAR(d.actualizado)} · Esta página se actualiza sola.
      </footer>
    </main>
  );
}
