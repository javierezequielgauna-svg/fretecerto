export default function Cargando() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Cargando operaciones">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-line bg-surface" />
      ))}
    </div>
  );
}
