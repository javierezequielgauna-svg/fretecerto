"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const esquema = z.object({ clave: z.string().min(8, "La clave debe tener al menos 8 caracteres"), repetir: z.string() }).refine((d) => d.clave === d.repetir, { message: "Las claves no coinciden", path: ["repetir"] });

export async function cambiarClave(formData: FormData) {
  const r = esquema.safeParse(Object.fromEntries(formData));
  if (!r.success) return redirect(`/chofer/clave?e=${encodeURIComponent(r.error.issues[0]?.message ?? "Revisá los datos")}`);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: r.data.clave });
  if (error) return redirect(`/chofer/clave?e=${encodeURIComponent("No pudimos cambiar la clave. Probá con otra.")}`);
  redirect("/chofer?clave=ok");
}
