import { todosLosAvisos, vigente } from "@/lib/municipio";

// Público: avisos vigentes, sin el usuario que los publicó.
// El barrio es solo una etiqueta del aviso: los avisos le llegan a todos.
export async function GET() {
  try {
    const avisos = (await todosLosAvisos())
      .filter((a) => vigente(a))
      .map(({ autor: _autor, ...publico }) => publico);
    return Response.json(avisos, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}
