import { NextResponse } from "next/server";
import { crearAdmin } from "@/lib/supabase/admin";
import { generarAlertas, type AlertaGuardada } from "@/lib/alertas-generar";
import { enviarEmail, htmlResumen } from "@/lib/email";

export const maxDuration = 60;

/**
 * Tarea programada (ver vercel.json). Vercel manda `Authorization: Bearer $CRON_SECRET` si definís CRON_SECRET.
 * Recorre todas las empresas, genera alertas y manda un mail resumen con las nuevas al dueño y a los despachantes.
 */
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) return new NextResponse("No autorizado", { status: 401 });

  const admin = crearAdmin();
  const { data: empresas, error } = await admin.from("empresas").select("id, nombre");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const resumen = { empresas: 0, nuevas: 0, mails: 0, errores: [] as string[] };
  for (const e of empresas ?? []) {
    try {
      const { nuevas } = await generarAlertas(admin, e.id as string);
      resumen.empresas++;
      resumen.nuevas += nuevas.length;
      if (nuevas.length && (await avisarPorMail(admin, e.id as string, e.nombre as string, nuevas))) resumen.mails++;
    } catch (err) {
      resumen.errores.push(`${e.nombre}: ${(err as Error).message}`); // una empresa con error no frena a las demás
    }
  }
  return NextResponse.json({ ok: true, ...resumen });
}

async function avisarPorMail(admin: ReturnType<typeof crearAdmin>, empresaId: string, nombre: string, nuevas: AlertaGuardada[]): Promise<boolean> {
  const { data: miembros } = await admin.from("miembros").select("user_id").eq("empresa_id", empresaId).in("rol", ["dueno", "despachante"]);
  const mails = (
    await Promise.all((miembros ?? []).map(async (m) => (await admin.auth.admin.getUserById(m.user_id as string)).data.user?.email))
  ).filter((x): x is string => !!x);

  const ok = await enviarEmail(mails, `${nombre}: ${nuevas.length} ${nuevas.length === 1 ? "alerta nueva" : "alertas nuevas"}`, htmlResumen(nombre, nuevas, process.env.APP_URL ?? ""));
  if (ok) await admin.from("alertas").update({ notificada_at: new Date().toISOString() }).in("id", nuevas.map((n) => n.id));
  return ok;
}
