import { correrTareas } from "@/scripts/tareas.mjs";
import { guardarDato, registrarCorrida } from "@/lib/ingesta";
import { vieneDelDespertador } from "@/lib/qstash";

// El cadete principal: un despertador externo (Upstash QStash, gratis) llama acá cada 15 minutos.
// Solo responde si el pedido viene firmado por ese despertador. GitHub Actions queda de respaldo.
export const maxDuration = 60;
export async function POST(req: Request) {
  if (!(await vieneDelDespertador(req))) return Response.json({ ok: false }, { status: 401 });
  const fallos = await correrTareas({ guardar: (clave: string, c: { contenido?: unknown; error?: string }) => guardarDato(clave, c.contenido, c.error) });
  await registrarCorrida("despertador");
  return Response.json({ ok: true, fallos });
}
