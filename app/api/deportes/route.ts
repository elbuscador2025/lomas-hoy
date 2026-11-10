import { datosDeportes } from "@/lib/deportes-servidor";

// Público: las instituciones activas.
export async function GET() {
  try {
    return Response.json(await datosDeportes(), { headers: { "Cache-Control": "public, s-maxage=60" } });
  } catch {
    return Response.json({ visible: false, soloDueno: false, disciplinas: [], instituciones: [] });
  }
}
