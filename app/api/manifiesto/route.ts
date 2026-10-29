// Manifiesto de la app para quien llega por el enlace de una olla: al agregarla a la pantalla de inicio (sobre todo en iPhone),
// la app instalada abre directo en esa olla, sin tener que volver a buscar el enlace.
export async function GET(req: Request) {
  const olla = new URL(req.url).searchParams.get("olla") ?? "";
  const inicio = /^[a-f0-9]{8,32}$/.test(olla) ? `/?olla=${olla}` : "/";
  return Response.json({
    name: "Lomas Hoy", short_name: "Lomas Hoy", description: "Lo que pasa hoy en Lomas de Zamora",
    start_url: inicio, scope: "/", display: "standalone", background_color: "#1F5AD6", theme_color: "#1F5AD6", lang: "es-AR",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }],
  }, { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" } });
}
