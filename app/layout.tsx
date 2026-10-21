import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lomas Hoy",
  description: "Lo que pasa hoy en Lomas de Zamora: tren, luz, clima y teléfonos útiles.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Lomas Hoy" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-32.png", sizes: "32x32", type: "image/png" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
};
export const viewport: Viewport = { themeColor: "#1F5AD6", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
