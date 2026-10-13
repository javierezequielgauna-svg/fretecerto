import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { crearEmpresa } from "./actions";

export const metadata: Metadata = { title: "Tu empresa" };

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: yaEs } = await supabase.from("miembros").select("id").eq("user_id", user.id).maybeSingle();
  if (yaEs) redirect("/operaciones");

  const { e } = await searchParams;
  const campo = "mt-1 min-h-12 w-full rounded-lg border border-line bg-bg px-3 text-base text-ink";
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-extrabold">Armemos tu empresa</h1>
        <p className="mt-1 text-muted">Son dos datos. Después podés completar el resto en Configuración.</p>
      </div>
      {e && <p role="alert" className="rounded-lg bg-bad/15 p-3 text-sm font-medium text-bad">No pudimos crear la empresa. Revisá los datos e intentá de nuevo.</p>}
      <form action={crearEmpresa} className="grid gap-4 rounded-2xl border border-line bg-surface p-5">
        <label className="text-sm font-medium text-muted">Nombre de la empresa
          <input className={campo} name="empresa" required minLength={2} placeholder="Transportes del Centro" />
        </label>
        <label className="text-sm font-medium text-muted">Tu nombre
          <input className={campo} name="nombre" required minLength={2} autoComplete="name" />
        </label>
        <button className="min-h-12 rounded-xl bg-brand font-bold text-brand-ink">Crear empresa</button>
      </form>
    </main>
  );
}
