import { NextResponse } from "next/server";
import { z } from "zod";
import { getContexto } from "@/lib/contexto";

/** Abre el PDF del remito con un link que dura 60 segundos (el bucket es privado). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new NextResponse("No encontrado", { status: 404 });
  const { supabase } = await getContexto();
  const { data } = await supabase.from("remitos").select("pdf_path").eq("id", id).maybeSingle();
  const ruta = data?.pdf_path as string | null | undefined;
  if (!ruta) return new NextResponse("Este remito no tiene PDF", { status: 404 });
  const { data: firmado, error } = await supabase.storage.from("remitos").createSignedUrl(ruta, 60);
  if (error || !firmado) return new NextResponse("No se pudo abrir el archivo", { status: 500 });
  return NextResponse.redirect(firmado.signedUrl);
}
