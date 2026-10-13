import { redirect } from "next/navigation";
import { getContexto } from "@/lib/contexto";
import { contarUrgentes } from "@/lib/repos/alertas";
import { Nav } from "@/components/nav";
import { salir } from "@/app/(auth)/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { empresa, nombre, rol, supabase, empresaId } = await getContexto();
  if (rol === "chofer") redirect("/chofer");
  const urgentes = await contarUrgentes(supabase, empresaId).catch(() => 0);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:pb-8">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold leading-tight">{empresa}</p>
          <p className="text-sm text-muted">{nombre} · {rol}</p>
        </div>
        <form action={salir}>
          <button className="min-h-11 rounded-lg border border-line px-3 text-sm">Salir</button>
        </form>
      </header>
      <div className="mb-4"><Nav urgentes={urgentes} /></div>
      {children}
    </div>
  );
}
