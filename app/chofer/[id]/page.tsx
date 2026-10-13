import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getContexto } from "@/lib/contexto";
import { obtenerMiOperacion } from "@/lib/repos/chofer";
import { fechaAR, fechaHoraAR } from "@/lib/format";
import { ChoferPasos } from "@/components/chofer-pasos";
import { SubirConformado } from "@/components/subir-conformado";

export const metadata: Metadata = { title: "Viaje" };

export default async function Viaje({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase, empresaId } = await getContexto();
  const o = await obtenerMiOperacion(supabase, id);
  if (!o) notFound();

  const carga = [o.kg > 0 ? `${new Intl.NumberFormat("es-AR").format(o.kg)} kg` : null, o.paquetes > 0 ? `${o.paquetes} paquetes` : null].filter(Boolean).join(" · ");
  const entregada = o.estado === "entregada";

  return (
    <section aria-labelledby="t" className="grid gap-4">
      <div>
        <Link href="/chofer" className="inline-flex min-h-11 items-center text-muted">← Mis viajes</Link>
        <h1 id="t" className="text-2xl font-extrabold tracking-tight">{o.numero}</h1>
        <p className="text-xl">{o.origen && o.destino ? `${o.origen} a ${o.destino}` : "Sin ruta"}</p>
        <p className="text-muted">{o.cliente ?? "Sin cliente"}{o.patente ? ` · ${o.patente}` : ""}</p>
        {carga && <p className="text-muted">Carga: {carga}</p>}
        {o.fecha_programada && <p className="text-muted">Salida: {fechaAR(o.fecha_programada)}</p>}
        {o.eta && <p className="text-muted">Llegada prevista: {fechaHoraAR(o.eta)}</p>}
      </div>

      <ChoferPasos operacionId={o.id} estado={o.estado} />

      <div className={`grid gap-2 rounded-2xl border p-4 ${entregada && !o.conformado ? "border-warn" : "border-line"} bg-surface`}>
        <h2 className="text-lg font-bold">Remito firmado</h2>
        {o.conformado ? (
          <p className="font-medium text-ok">✔ Ya subiste la foto. Gracias.</p>
        ) : (
          <p className={`font-medium ${entregada ? "text-warn" : "text-muted"}`}>{entregada ? "⚠ Falta la foto del remito firmado." : "Cuando el cliente firme el remito, sacale una foto acá."}</p>
        )}
        <SubirConformado operacionId={o.id} empresaId={empresaId} tiene={o.conformado} permitirCola />
      </div>
    </section>
  );
}
