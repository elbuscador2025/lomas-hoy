import { leerNovedad } from "@/lib/novedad";

// Público y liviano: el aviso de novedades que está activo (o {} si no hay ninguno).
export async function GET() {
  try {
    const n = await leerNovedad();
    const cuerpo = n?.activo ? { id: n.id, texto: n.texto, enlace: n.enlace } : {};
    return Response.json(cuerpo, { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } });
  } catch {
    return Response.json({});
  }
}
