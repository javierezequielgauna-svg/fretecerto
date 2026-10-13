"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContexto } from "@/lib/contexto";
import { mensajeDe } from "@/lib/errores";
import { crearAdmin } from "@/lib/supabase/admin";
import { generarClave } from "@/lib/clave";
import { guardarChofer, guardarEmpresa, guardarParametros, guardarUnidad } from "@/lib/repos/configuracion";

const num = z.coerce.number().min(0, "No puede ser negativo");
const pct = z.coerce.number().min(0, "No puede ser negativo").max(100, "Máximo 100 %");

/** Ejecuta, y vuelve a Configuración con un aviso de éxito o de error. */
async function ejecutar(trabajo: () => Promise<void>): Promise<never> {
  try {
    await trabajo();
  } catch (e) {
    redirect(`/configuracion?e=${encodeURIComponent(mensajeDe(e))}`);
  }
  revalidatePath("/configuracion");
  revalidatePath("/cotizaciones/nueva");
  redirect("/configuracion?ok=1");
}

function leer<T extends z.ZodTypeAny>(esquema: T, f: FormData): z.infer<T> {
  const r = esquema.safeParse(Object.fromEntries(f));
  if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Revisá los datos");
  return r.data;
}

export async function guardarDatosEmpresa(formData: FormData) {
  const { supabase, empresaId } = await getContexto();
  return ejecutar(async () => {
    const d = leer(z.object({ cuit: z.string().trim(), domicilio: z.string().trim(), puntoVenta: z.string().trim().regex(/^\d{1,4}$/, "El punto de venta son hasta 4 números"), objetivo: pct }), formData);
    await guardarEmpresa(supabase, empresaId, { cuit: d.cuit, domicilio: d.domicilio, puntoVenta: d.puntoVenta.padStart(4, "0"), objetivoMargen: d.objetivo / 100 });
  });
}

export async function guardarCostos(formData: FormData) {
  const { supabase, empresaId } = await getContexto();
  return ejecutar(async () => {
    const d = leer(z.object({ gasoil: num, viatico: num, iibb: pct, indice: z.string().trim() }), formData);
    await guardarParametros(supabase, empresaId, { precioGasoil: d.gasoil, viaticoDia: d.viatico, iibbPct: d.iibb / 100, indiceCostos: d.indice ? Number(d.indice) || null : null });
  });
}

export async function guardarCostosUnidad(formData: FormData) {
  const { supabase } = await getContexto();
  return ejecutar(async () => {
    const d = leer(z.object({ id: z.string().uuid(), consumo: num, capacidad: num, amortizacion: num, cubiertas: num, mantenimiento: num }), formData);
    await guardarUnidad(supabase, d.id, { consumoL100: d.consumo, capacidadKg: d.capacidad, amortizacionKm: d.amortizacion, cubiertasKm: d.cubiertas, mantenimientoKm: d.mantenimiento });
  });
}

export async function guardarCostoChofer(formData: FormData) {
  const { supabase } = await getContexto();
  return ejecutar(async () => {
    const d = leer(z.object({ id: z.string().uuid(), costoDia: num }), formData);
    await guardarChofer(supabase, d.id, d.costoDia);
  });
}

export type ResultadoAcceso = { ok: true; email: string; clave: string } | { ok: false; error: string } | null;

/**
 * El dueño le da acceso a un chofer: crea la cuenta con una clave temporal y lo vincula a su ficha.
 * La clave se devuelve una sola vez (no se guarda ni viaja por la URL). Usa la clave de servicio solo para crear el usuario.
 */
export async function crearAccesoChofer(_previo: ResultadoAcceso, formData: FormData): Promise<ResultadoAcceso> {
  const { supabase, empresaId, rol } = await getContexto();
  if (rol !== "dueno") return { ok: false, error: "Solo el dueño puede dar accesos" };
  const d = z.object({ choferId: z.string().uuid(), email: z.string().trim().toLowerCase().email("Poné un mail válido") }).safeParse(Object.fromEntries(formData));
  if (!d.success) return { ok: false, error: d.error.issues[0]?.message ?? "Revisá los datos" };

  const { data: ch } = await supabase.from("choferes").select("id, nombre, telefono, user_id").eq("id", d.data.choferId).maybeSingle();
  if (!ch) return { ok: false, error: "No encontramos al chofer" };
  if (ch.user_id) return { ok: false, error: "Este chofer ya tiene acceso" };

  const clave = generarClave();
  try {
    const admin = crearAdmin();
    const { data: u, error } = await admin.auth.admin.createUser({ email: d.data.email, password: clave, email_confirm: true });
    if (error || !u.user) return { ok: false, error: /already|registered/i.test(error?.message ?? "") ? "Ese mail ya tiene una cuenta" : mensajeDe(error, "No se pudo crear la cuenta") };
    const uid = u.user.id;
    const deshacer = async () => {
      await supabase.from("miembros").delete().eq("user_id", uid);
      await admin.auth.admin.deleteUser(uid);
    };
    const { error: e2 } = await supabase.from("miembros").insert({ empresa_id: empresaId, user_id: uid, rol: "chofer", nombre: ch.nombre, telefono: ch.telefono });
    if (e2) {
      await deshacer();
      return { ok: false, error: mensajeDe(e2) };
    }
    const { error: e3 } = await supabase.from("choferes").update({ user_id: uid }).eq("id", ch.id);
    if (e3) {
      await deshacer();
      return { ok: false, error: mensajeDe(e3) };
    }
  } catch (e) {
    return { ok: false, error: mensajeDe(e, "No se pudo crear el acceso") };
  }
  revalidatePath("/configuracion");
  return { ok: true, email: d.data.email, clave };
}
