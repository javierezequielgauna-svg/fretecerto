import type { Metadata } from "next";
import { ingresar, crearCuenta } from "./actions";

export const metadata: Metadata = { title: "Ingresar" };

const MENSAJES: Record<string, { texto: string; error: boolean }> = {
  datos: { texto: "Revisá el mail y poné una contraseña de al menos 8 caracteres.", error: true },
  credenciales: { texto: "El mail o la contraseña no coinciden.", error: true },
  registro: { texto: "No pudimos crear la cuenta. Probá con otro mail.", error: true },
  confirmar: { texto: "Te mandamos un mail para confirmar la cuenta. Después ingresá desde acá.", error: false },
};

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const msg = e ? MENSAJES[e] : undefined;
  const campo = "mt-1 min-h-12 w-full rounded-lg border border-line bg-bg px-3 text-base text-ink";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">FreteCerto</h1>
        <p className="mt-1 text-muted">Ingresá para ver tus cargas, cotizaciones y cobranzas.</p>
      </div>

      {msg && (
        <p role={msg.error ? "alert" : "status"} className={`rounded-lg p-3 text-sm font-medium ${msg.error ? "bg-bad/15 text-bad" : "bg-ok/15 text-ok"}`}>
          {msg.texto}
        </p>
      )}

      <form className="grid gap-4 rounded-2xl border border-line bg-surface p-5">
        <label className="text-sm font-medium text-muted">
          Mail
          <input className={campo} name="email" type="email" autoComplete="email" required />
        </label>
        <label className="text-sm font-medium text-muted">
          Contraseña
          <input className={campo} name="password" type="password" autoComplete="current-password" minLength={8} required />
        </label>
        <button formAction={ingresar} className="min-h-12 rounded-xl bg-brand font-bold text-brand-ink">
          Ingresar
        </button>
        <button formAction={crearCuenta} formNoValidate className="min-h-12 rounded-xl border border-line font-medium">
          Crear cuenta nueva
        </button>
      </form>
    </main>
  );
}
