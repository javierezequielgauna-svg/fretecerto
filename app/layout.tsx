import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { RegistrarSW } from "@/components/registrar-sw";
import "./globals.css";

const fuente = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

const descripcion = "Gestión logística para transportistas de Córdoba: cotizá, remitá, cobrá y seguí tus cargas desde el celular.";

export const metadata: Metadata = {
  metadataBase: process.env.APP_URL ? new URL(process.env.APP_URL) : undefined,
  title: { default: "FreteCerto", template: "%s · FreteCerto" },
  description: descripcion,
  applicationName: "FreteCerto",
  appleWebApp: { capable: true, title: "FreteCerto", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  openGraph: { title: "FreteCerto", description: descripcion, siteName: "FreteCerto", locale: "es_AR", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "FreteCerto" }] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1815" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={fuente.variable}>
      <body className="min-h-screen font-sans antialiased">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
