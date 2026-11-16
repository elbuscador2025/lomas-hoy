import { publicas } from "@/lib/escuelas";

// Público: el listado de escuelas de Lomas (con lo que cambié desde el panel) y el recuadro de inscripciones.
export async function GET() {
  try {
    return Response.json(await publicas(), { headers: { "Cache-Control": "public, s-maxage=120" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}
