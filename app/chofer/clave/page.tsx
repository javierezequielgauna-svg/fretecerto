import type { Metadata } from "next";
import Link from "next/link";
import { cambiarClave } from "./actions";

export const metadata: Metadata = { title: "Mi clave" };

export default async function Clave({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const campo = "mt-1 min-h-14 w-full rounded-lg border border-line bg-bg px-3 text-lg text-ink";
  return (
    <section aria-labelledby="t" className="grid gap-4">
      <Link href="/chofer" className="inline-flex min-h-11 items-center text-muted">← Mis viajes</Link>
      <h1 id="t" className="text-2xl font-extrabold tracking-tight">Cambiar mi clave</h1>
      {e && <p role="alert" className="rounded-lg bg-bad/15 p-3 font-medium text-bad">✖ {e}</p>}
      <form action={cambiarClave} className="grid gap-4 rounded-2xl border border-line bg-surface p-4">
        <label className="font-medium text-muted">Clave nueva<input type="password" name="clave" required minLength={8} autoComplete="new-password" className={campo} /></label>
        <label className="font-medium text-muted">Repetila<input type="password" name="repetir" required minLength={8} autoComplete="new-password" className={campo} /></label>
        <button className="min-h-14 rounded-xl bg-brand text-lg font-bold text-brand-ink">Guardar clave nueva</button>
      </form>
    </section>
  );
}
