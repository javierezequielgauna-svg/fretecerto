"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getContexto } from "@/lib/contexto";
import { ars, fechaAR } from "@/lib/format";
import { mensajeDe } from "@/lib/errores";
import { obtenerEmpresa } from "@/lib/repos/configuracion";
import { construirRemitoPdf } from "@/lib/pdf/remito";

const txt = z.string().trim();
const esquema = z.object({
  operacionId: z.string().uuid(),
  destNombre: txt.min(2, "Falta el nombre de quien recibe"),
  destCuit: txt, destDom: txt, chofer: txt, patente: txt, obs: txt,
  valor: z.coerce.number().min(0),
});
const FILAS = 5;

/** Genera el PDF del remito X, lo guarda en Storage y registra el comprobante con su número correlativo. */
export async function emitirRemito(formData: FormData) {
  const p = esquema.safeParse(Object.fromEntries(formData));
  if (!p.success) return redirect("/operaciones");
  const d = p.data;
  const volver = (m: string): never => redirect(`/operaciones/${d.operacionId}/remito?e=${encodeURIComponent(m)}`);

  const items = Array.from({ length: FILAS }, (_, i) => ({
    descripcion: String(formData.get(`desc${i}`) ?? "").trim(),
    bultos: Math.max(0, Number(formData.get(`bul${i}`)) || 0),
    kg: Math.max(0, Number(formData.get(`kg${i}`)) || 0),
  })).filter((it) => it.descripcion);
  if (!d.destNombre) return volver("Falta el nombre de quien recibe");
  if (!items.length) return volver("Cargá al menos un ítem con descripción");

  const { supabase, empresaId } = await getContexto();
  let remitoId: string;
  try {
    const empresa = await obtenerEmpresa(supabase, empresaId);
    const { data: n, error: eNum } = await supabase.rpc("siguiente_numero", { p_empresa: empresaId, p_clave: `remito-${empresa.puntoVenta}` });
    if (eNum) throw eNum;
    const numero = `${empresa.puntoVenta}-${String(n).padStart(8, "0")}`;

    const remitente = { nombre: empresa.nombre, cuit: empresa.cuit ?? "", domicilio: empresa.domicilio ?? "" };
    const destinatario = { nombre: d.destNombre, cuit: d.destCuit, domicilio: d.destDom };
    const pdf = construirRemitoPdf({
      numero, fecha: fechaAR(new Date()), remitente, destinatario, chofer: d.chofer, patente: d.patente.toUpperCase(),
      items, valorDeclarado: d.valor > 0 ? ars(d.valor) : null, observaciones: d.obs,
    });

    const ruta = `${empresaId}/${d.operacionId}/remito-${numero}.pdf`;
    const subida = await supabase.storage.from("remitos").upload(ruta, new Uint8Array(pdf), { contentType: "application/pdf" });
    if (subida.error) throw subida.error;

    const { data, error } = await supabase.from("remitos").insert({
      empresa_id: empresaId, operacion_id: d.operacionId, punto_venta: empresa.puntoVenta, numero: Number(n),
      remitente, destinatario, items, valor_declarado: d.valor > 0 ? d.valor : null, observaciones: d.obs || null, pdf_path: ruta,
    }).select("id").single();
    if (error) throw error;
    remitoId = data.id as string;
  } catch (e) {
    return volver(mensajeDe(e, "No se pudo emitir el remito"));
  }
  redirect(`/operaciones/${d.operacionId}/remito?r=${remitoId}`);
}
