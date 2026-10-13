"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-bad bg-surface p-6">
      <p className="font-bold text-bad">✖ Algo salió mal</p>
      <p className="mt-1 text-sm text-muted">{error.message}</p>
      <button onClick={reset} className="mt-4 min-h-11 rounded-lg border border-line px-4">Reintentar</button>
    </div>
  );
}
