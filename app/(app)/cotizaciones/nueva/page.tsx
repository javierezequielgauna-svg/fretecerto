import type { Metadata } from "next";
import Link from "next/link";
import { getContexto } from "@/lib/contexto";
import { listarChoferesCosto, listarClientesTel, listarUnidadesCosto, obtenerEmpresa, obtenerParametros } from "@/lib/repos/configuracion";
import { Cotizador } from "@/components/cotizador";

export const metadata: Metadata = { title: "Nueva cotización" };

export default async function NuevaCotizacion() {
  const { supabase, empresaId } = await getContexto();
  const [params, empresa, clientes, unidades, choferes] = await Promise.all([
    obtenerParametros(supabase), obtenerEmpresa(supabase, empresaId), listarClientesTel(supabase), listarUnidadesCosto(supabase), listarChoferesCosto(supabase),
  ]);
  return (
    <section aria-labelledby="t">
      <Link href="/cotizaciones" className="inline-flex min-h-11 items-center text-sm text-muted">← Volver a cotizaciones</Link>
      <h1 id="t" className="mb-3 text-2xl font-extrabold tracking-tight">Nueva cotización</h1>
      <Cotizador defaults={{ precioGasoil: params.precioGasoil, viaticoDia: params.viaticoDia, iibbPct: params.iibbPct, margen: empresa.objetivoMargen }} clientes={clientes} unidades={unidades} choferes={choferes} />
    </section>
  );
}
