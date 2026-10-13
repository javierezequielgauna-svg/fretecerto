import { NextResponse } from "next/server";
import { calcularRuta, googleConfigurado } from "@/lib/google";
import { permitir } from "@/lib/limite";
import { usuarioApi } from "@/lib/api";

/** Km y minutos entre dos lugares. Primero mira la caché de rutas de la empresa, para no pagar dos veces la misma consulta. */
export async function GET(req: Request) {
  const u = await usuarioApi();
  if (!u) return NextResponse.json({ error: "Iniciá sesión" }, { status: 401 });

  const p = new URL(req.url).searchParams;
  const origen = (p.get("origin") ?? "").trim().slice(0, 200);
  const destino = (p.get("destination") ?? "").trim().slice(0, 200);
  if (origen.length < 2 || destino.length < 2) return NextResponse.json({ error: "Falta el origen o el destino" }, { status: 400 });

  const { data: guardada } = await u.supabase
    .from("rutas").select("km, tiempo_min").eq("empresa_id", u.empresaId).eq("origen", origen).eq("destino", destino).eq("fuente", "google").maybeSingle();
  if (guardada) return NextResponse.json({ km: Number(guardada.km), minutos: guardada.tiempo_min, cache: true });

  if (!googleConfigurado()) return NextResponse.json({ error: "Google Maps no está configurado: cargá los km a mano." }, { status: 501 });
  if (!permitir(`distance:${u.userId}`, 20)) return NextResponse.json({ error: "Demasiados pedidos, esperá un minuto" }, { status: 429 });

  try {
    const r = await calcularRuta(origen, destino);
    if (!r) return NextResponse.json({ error: "Google no encontró una ruta entre esos lugares" }, { status: 404 });
    await u.supabase.from("rutas").upsert(
      { empresa_id: u.empresaId, origen, destino, km: r.km, tiempo_min: r.minutos, fuente: "google" },
      { onConflict: "empresa_id,origen,destino" },
    );
    return NextResponse.json({ km: r.km, minutos: r.minutos, cache: false });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar Google Maps" }, { status: 502 });
  }
}
