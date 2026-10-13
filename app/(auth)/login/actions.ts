"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credenciales = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

function leer(formData: FormData) {
  return credenciales.safeParse({ email: formData.get("email"), password: formData.get("password") });
}

export async function ingresar(formData: FormData) {
  const datos = leer(formData);
  if (!datos.success) redirect("/login?e=datos");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(datos.data);
  if (error) redirect("/login?e=credenciales");
  redirect("/operaciones");
}

export async function crearCuenta(formData: FormData) {
  const datos = leer(formData);
  if (!datos.success) redirect("/login?e=datos");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(datos.data);
  if (error) redirect("/login?e=registro");
  // Si el proyecto exige confirmar el mail, todavía no hay sesión.
  if (!data.session) redirect("/login?e=confirmar");
  redirect("/onboarding");
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
