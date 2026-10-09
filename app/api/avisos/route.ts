import { todosLosAvisos, vigente, ZONAS } from "@/lib/municipio";

// Público: avisos vigentes, sin el usuario que los publicó.
// ?zona=Banfield trae los de Banfield y los de "Todo Lomas" (queda listo para filtrar notificaciones por zona).
export async function GET(req: Request) {
  try {
    const zona = new URL(req.url).searchParams.get("zona");
    const avisos = (await todosLosAvisos())
      .filter((a) => vigente(a))
      .filter((a) => !zona || !ZONAS.includes(zona) || a.zona === "Todo Lomas" || a.zona === zona)
      .map(({ autor: _autor, ...publico }) => publico);
    return Response.json(avisos, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}
