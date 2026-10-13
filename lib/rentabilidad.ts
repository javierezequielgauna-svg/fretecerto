/** Diagnóstico de rentabilidad: qué conviene mantener, revisar o rechazar. Funciones puras. */
export interface FilaRentabilidad {
  clave: string | null;
  nombre: string;
  viajes: number;
  ingresos: number;
  costos: number;
  margen: number | null; // fracción
  costoKm: number | null;
  pctVacio: number | null; // 0 a 100
  pctATiempo: number | null; // 0 a 100
}

export type Accion = "rechazar" | "revisar" | "mantener";
export interface Diagnostico { nivel: "ok" | "atencion" | "urgente"; accion: Accion; avisos: string[] }

const pct = (x: number, dec = 1) => `${x.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec })} %`;
const VACIO_ALTO = 40;
const A_TIEMPO_BAJO = 80;

/**
 * `minViajes`: con menos viajes que esto no se recomienda rechazar a nadie (pocos datos),
 * salvo para avisar que se está perdiendo plata.
 */
export function diagnosticar(f: FilaRentabilidad, objetivo: number, minViajes = 3): Diagnostico {
  const avisos: string[] = [];
  let nivel: Diagnostico["nivel"] = "ok";
  let accion: Accion = "mantener";
  const subir = (n: Diagnostico["nivel"]) => {
    if (n === "urgente" || (n === "atencion" && nivel === "ok")) nivel = n;
  };

  if (f.margen !== null) {
    if (f.margen < 0) {
      subir("urgente");
      accion = f.viajes >= minViajes ? "rechazar" : "revisar";
      avisos.push(`Perdés plata: margen de ${pct(f.margen * 100)}.`);
    } else if (f.margen < objetivo / 2) {
      subir("urgente");
      accion = "revisar";
      avisos.push(`Margen muy bajo (${pct(f.margen * 100)}, tu objetivo es ${pct(objetivo * 100, 0)}). Subí la tarifa o rechazalo.`);
    } else if (f.margen + 1e-4 < objetivo) {
      subir("atencion");
      accion = "revisar";
      avisos.push(`Margen de ${pct(f.margen * 100)}, bajo tu objetivo de ${pct(objetivo * 100, 0)}.`);
    }
  }
  if (f.pctVacio !== null && f.pctVacio > VACIO_ALTO) {
    subir("atencion");
    avisos.push(`Vuelve vacío en el ${pct(f.pctVacio, 0)} de los km: buscá cargas de retorno.`);
  }
  if (f.pctATiempo !== null && f.pctATiempo < A_TIEMPO_BAJO) {
    subir("atencion");
    avisos.push(`Solo el ${pct(f.pctATiempo, 0)} llega a horario.`);
  }
  if (f.viajes < minViajes && accion !== "mantener") avisos.push(`Son pocos viajes (${f.viajes}): tomalo como una señal, no como una conclusión.`);
  return { nivel, accion, avisos };
}

export function resumenRentabilidad(filas: FilaRentabilidad[]) {
  const ingresos = filas.reduce((a, f) => a + f.ingresos, 0);
  const costos = filas.reduce((a, f) => a + f.costos, 0);
  return { viajes: filas.reduce((a, f) => a + f.viajes, 0), ingresos, costos, margen: ingresos > 0 ? (ingresos - costos) / ingresos : null };
}
