import { NextResponse } from "next/server";
import { z } from "zod";
import { getContexto } from "@/lib/contexto";

/** Abre la foto del remito firmado con un link que dura 60 segundos (el bucket es privado). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new NextResponse("No encontrado", { status: 404 });

  const { supabase } = await getContexto();
  const { data } = await supabase.from("operaciones").select("remito_conformado_path").eq("id", id).maybeSingle();
  const ruta = data?.remito_conformado_path as string | null | undefined;
  if (!ruta) return new NextResponse("Esta operación no tiene remito firmado", { status: 404 });

  const { data: firmado, error } = await supabase.storage.from("remitos").createSignedUrl(ruta, 60);
  if (error || !firmado) return new NextResponse("No se pudo abrir el archivo", { status: 500 });
  return NextResponse.redirect(firmado.signedUrl);
}
