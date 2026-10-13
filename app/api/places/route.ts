import { NextResponse } from "next/server";
import { autocompletar, googleConfigurado } from "@/lib/google";
import { permitir } from "@/lib/limite";
import { usuarioApi } from "@/lib/api";

export async function GET(req: Request) {
  const u = await usuarioApi();
  if (!u) return NextResponse.json({ error: "Iniciá sesión" }, { status: 401 });
  if (!googleConfigurado()) return NextResponse.json({ error: "Google Maps no está configurado" }, { status: 501 });
  if (!permitir(`places:${u.userId}`, 60)) return NextResponse.json({ error: "Demasiados pedidos, esperá un minuto" }, { status: 429 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 3) return NextResponse.json({ sugerencias: [] });
  try {
    return NextResponse.json({ sugerencias: await autocompletar(q) });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar Google Maps" }, { status: 502 });
  }
}
