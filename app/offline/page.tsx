import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sin conexión", robots: { index: false } };

export default function SinConexion() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6 text-center">
      <p aria-hidden="true" className="text-5xl">📡</p>
      <h1 className="text-2xl font-extrabold tracking-tight">Sin conexión</h1>
      <p className="text-muted">No hay señal en este momento. Si sos chofer, tus viajes ya abiertos siguen funcionando y lo que marques se manda solo cuando vuelva la conexión.</p>
      <a href="/" className="flex min-h-12 items-center justify-center rounded-xl bg-brand font-bold text-brand-ink">Reintentar</a>
    </main>
  );
}
