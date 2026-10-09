import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lomas Hoy",
  description: "Lo que pasa hoy en Lomas de Zamora: tren, luz, clima y teléfonos útiles.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Lomas Hoy" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};
export const viewport: Viewport = { themeColor: "#0b5cad", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
