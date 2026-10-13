import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que se pueden ver sin iniciar sesión (el link "seguí tu carga" llega en la Fase 5).
const PUBLICAS = ["/login", "/seguimiento", "/api/cron", "/offline"]; // /api/cron se protege con CRON_SECRET en la propia ruta

/** Refresca la sesión en cada pedido y manda a /login a quien no la tenga. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(lista) {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() valida el token contra Supabase; no uses getSession() para proteger rutas.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const esPublica = PUBLICAS.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/operaciones";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
