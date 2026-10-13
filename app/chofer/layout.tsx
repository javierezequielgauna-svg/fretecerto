import { redirect } from "next/navigation";
import Link from "next/link";
import { getContexto } from "@/lib/contexto";
import { BotonSalir } from "@/components/boton-salir";
import { EstadoConexion } from "@/components/estado-conexion";

export default async function ChoferLayout({ children }: { children: React.ReactNode }) {
  const { rol, nombre, empresa } = await getContexto();
  if (rol !== "chofer") redirect("/operaciones");
  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-4">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold leading-tight">{nombre}</p>
          <p className="text-sm text-muted">{empresa}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/chofer/clave" className="flex min-h-11 items-center rounded-lg border border-line px-3 text-sm">Mi clave</Link>
          <BotonSalir />
        </div>
      </header>
      <EstadoConexion />
      {children}
    </div>
  );
}
