"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContexto } from "@/lib/contexto";
import { cotizar } from "@/lib/calc/cotizacion";
import { formatoNumero } from "@/lib/numeracion";
import { ars, fechaAR, whatsappLink } from "@/lib/format";
import { mensajeDe } from "@/lib/errores";
import { asegurar, asegurarRuta } from "@/lib/repos/maestros";
import { crearCotizacion } from "@/lib/repos/cotizaciones";

export type ResultadoGuardar = { ok: true; id: string; numero: string; wa: string | null; enviada: boolean } | { ok: false; error: string } | null;

const n0 = z.number().finite().min(0);
const esquema = z
  .object({
    clienteId: z.string(),
    clienteNuevo: z.string().trim(),
    telefono: z.string().trim(),
    origen: z.string().trim().min(2, "Falta el origen"),
    destino: z.string().trim().min(2, "Falta el destino"),
    vigenciaHoras: z.number().int().min(1).max(24 * 30),
    clausula: z.boolean(),
    entrada: z.object({
      km: z.number().finite().gt(0, "Poné los km del viaje"),
      vuelveVacio: z.boolean(),
      consumoL100: n0, precioGasoil: n0, peajes: n0, dias: n0, viaticoDia: n0, costoChoferDia: n0, desgasteKm: n0, otros: n0,
      modo: z.enum(["viaje", "kilo", "paquete"]),
      margen: z.number().min(0).max(0.9), iibb: z.number().min(0).max(0.5),
      kgReales: n0, kgVolumetricos: n0, paquetes: n0, tarifaMinima: n0, capacidadKg: n0, tarifaPrueba: n0,
    }),
  })
  .refine((d) => d.clienteId || d.clienteNuevo.length >= 2, { message: "Elegí un cliente o escribí uno nuevo", path: ["clienteId"] });

/**
 * Guarda la cotización. Los números se recalculan acá con la misma función pura que usa la pantalla:
 * lo que se guarda no depende de lo que mande el navegador.
 */
export async function guardarCotizacion(_previo: ResultadoGuardar, formData: FormData): Promise<ResultadoGuardar> {
  let crudo: unknown;
  try {
    crudo = JSON.parse(String(formData.get("datos") ?? ""));
  } catch {
    return { ok: false, error: "Datos inválidos" };
  }
  const p = esquema.safeParse(crudo);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Revisá los datos" };
  const d = p.data;
  const enviar = formData.get("enviar") === "1";

  let r;
  try {
    r = cotizar(d.entrada);
  } catch (e) {
    return { ok: false, error: mensajeDe(e, "El margen más Ingresos Brutos no puede llegar al 100 %") };
  }

  const { supabase, empresaId } = await getContexto();
  try {
    const clienteId = d.clienteNuevo ? await asegurar(supabase, "clientes", empresaId, d.clienteNuevo) : d.clienteId;
    if (d.telefono) await supabase.from("clientes").update({ telefono: d.telefono }).eq("id", clienteId).is("telefono", null);
    const rutaId = await asegurarRuta(supabase, empresaId, d.origen, d.destino, d.entrada.km);

    const { data: num, error: eNum } = await supabase.rpc("siguiente_numero", { p_empresa: empresaId, p_clave: "cotizacion" });
    if (eNum) throw eNum;
    const numero = formatoNumero("COT", Number(num));
    const vigencia = new Date(Date.now() + d.vigenciaHoras * 3_600_000);

    const id = await crearCotizacion(supabase, {
      empresaId, numero, clienteId, rutaId, modo: d.entrada.modo, vuelveVacio: d.entrada.vuelveVacio,
      kgReales: d.entrada.kgReales, kgVolumetricos: d.entrada.kgVolumetricos, paquetes: Math.round(d.entrada.paquetes),
      tarifaUnitaria: d.entrada.modo !== "viaje" && d.entrada.tarifaPrueba > 0 ? d.entrada.tarifaPrueba : null,
      tarifaMinima: d.entrada.tarifaMinima, costoTotal: r.costos.total, margenObjetivo: d.entrada.margen, precio: r.precioFinal,
      detalleCostos: { costos: r.costos, entrada: d.entrada, precioSugerido: r.precioSugerido, margenReal: r.margen },
      clausulaIndice: d.clausula, vigenciaHasta: vigencia.toISOString(), estado: enviar ? "enviada" : "borrador",
    });

    const detalle =
      r.unidades > 0 && r.tarifaFinal !== null
        ? `${new Intl.NumberFormat("es-AR").format(r.unidades)} ${d.entrada.modo === "kilo" ? "kg a" : "paquetes a"} ${ars(r.tarifaFinal)}${d.entrada.modo === "kilo" ? " por kilo" : " cada uno"}.\n`
        : "";
    const mensaje =
      `Hola! Te paso la cotización ${numero} del flete ${d.origen} a ${d.destino}.\n${detalle}` +
      `Valor: ${ars(r.precioFinal)} + IVA (total ${ars(r.precioConIva)}).\nVálida hasta el ${fechaAR(vigencia)}.` +
      (d.clausula ? "\nIncluye actualización por índice de costos." : "") +
      "\nQuedo atento. Gracias!";

    revalidatePath("/cotizaciones");
    return { ok: true, id, numero, wa: enviar && d.telefono ? whatsappLink(d.telefono, mensaje) : null, enviada: enviar };
  } catch (e) {
    return { ok: false, error: mensajeDe(e, "No se pudo guardar la cotización") };
  }
}
