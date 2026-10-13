import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FreteCerto",
    short_name: "FreteCerto",
    description: "Gestión logística para transportistas: cotizá, remitá, cobrá y seguí tus cargas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f5f4",
    theme_color: "#0f5c4d",
    lang: "es-AR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mis viajes", url: "/chofer", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Nueva cotización", url: "/cotizaciones/nueva", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
