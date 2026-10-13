import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export const clienteInput = z.object({
  nombre: z.string().trim().min(2, "Poné el nombre del cliente"),
  cuit: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  direccion: z.string().trim().optional(),
  diasPagoAcordado: z.coerce.number().int().min(0).default(30),
});
export type ClienteInput = z.infer<typeof clienteInput>;

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  diasPagoAcordado: number;
}

export interface ClientesRepo {
  listar(): Promise<Cliente[]>;
  crear(empresaId: string, datos: ClienteInput): Promise<void>;
}

export function crearClientesRepo(db: SupabaseClient): ClientesRepo {
  return {
    async listar() {
      const { data, error } = await db.from("clientes").select("id, nombre, telefono, dias_pago_acordado").order("nombre");
      if (error) throw new Error(`No se pudieron cargar los clientes: ${error.message}`);
      return (data ?? []).map((c) => ({
        id: c.id as string,
        nombre: c.nombre as string,
        telefono: (c.telefono as string | null) ?? null,
        diasPagoAcordado: Number(c.dias_pago_acordado),
      }));
    },
    async crear(empresaId, datos) {
      const d = clienteInput.parse(datos);
      const { error } = await db.from("clientes").insert({
        empresa_id: empresaId,
        nombre: d.nombre,
        cuit: d.cuit || null,
        telefono: d.telefono || null,
        direccion: d.direccion || null,
        dias_pago_acordado: d.diasPagoAcordado,
      });
      if (error) throw new Error(error.message);
    },
  };
}
