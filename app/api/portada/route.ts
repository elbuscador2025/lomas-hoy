import { listar } from "@/lib/portada";

// Público: las portadas que cargué yo (si hay, reemplazan a la foto automática de la pantalla principal).
export async function GET() {
  try {
    const l = await listar();
    return Response.json(l.map(({ id, titulo, texto, enlace, foto }) => ({ id, titulo, texto, enlace, foto })), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json([]);
  }
}
