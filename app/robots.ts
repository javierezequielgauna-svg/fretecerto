import type { MetadataRoute } from "next";

// La app es privada: solo la pantalla de ingreso puede aparecer en buscadores.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/login"], disallow: ["/api/", "/seguimiento/", "/operaciones", "/cotizaciones", "/cobranza", "/alertas", "/configuracion", "/rentabilidad", "/chofer", "/remitos", "/onboarding"] },
  };
}
