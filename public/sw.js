/* Service worker de FreteCerto.
 * - Archivos estáticos (JS, CSS, íconos, fuentes): primero la copia guardada.
 * - Páginas del chofer: primero la red; si no hay señal, la última copia que se vio.
 * - Todo lo demás (panel de gestión, /api, pedidos a Supabase): siempre a la red, nunca se guarda.
 * Subí VERSION cuando cambies este archivo. */
const VERSION = "v1";
const ESTATICO = `fc-estatico-${VERSION}`;
const PAGINAS = `fc-paginas-${VERSION}`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(ESTATICO).then((c) => c.addAll(["/offline", "/icons/icon-192.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("fc-") && k !== ESTATICO && k !== PAGINAS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Al cerrar sesión, la app pide borrar las páginas guardadas (por si el celular lo usa otra persona)
self.addEventListener("message", (e) => {
  if (e.data === "limpiar") e.waitUntil(caches.delete(PAGINAS));
});

const esEstatico = (p) => p.startsWith("/_next/static/") || /\.(png|svg|ico|woff2?)$/.test(p);
const esChofer = (p) => p === "/chofer" || p.startsWith("/chofer/");

async function primeroCache(req) {
  const c = await caches.open(ESTATICO);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) c.put(req, res.clone());
  return res;
}

async function primeroRed(req, guardar) {
  try {
    const res = await fetch(req);
    // No se guardan redirecciones (por ejemplo al login cuando vence la sesión)
    if (guardar && res.ok && !res.redirected) (await caches.open(PAGINAS)).put(req.url, res.clone());
    return res;
  } catch {
    const copia = await caches.match(req.url, { cacheName: PAGINAS });
    if (copia) return copia;
    if (req.mode === "navigate") return (await caches.match("/offline")) || Response.error();
    return Response.error();
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  if (esEstatico(url.pathname)) return e.respondWith(primeroCache(req));

  const pideHtml = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (pideHtml) e.respondWith(primeroRed(req, esChofer(url.pathname)));
});
