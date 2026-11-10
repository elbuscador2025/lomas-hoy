import { esAdmin } from "@/lib/cuentas";
import { datosDeportes } from "@/lib/deportes-servidor";

// Público: las instituciones activas, solo si la sección está prendida (o si entra el dueño con su sesión).
export async function GET(req: Request) {
  try {
    return Response.json(await datosDeportes(await esAdmin(req)), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ visible: false, soloDueno: false, disciplinas: [], instituciones: [] });
  }
}
