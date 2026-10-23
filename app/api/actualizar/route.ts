import { correrTareas } from "@/scripts/tareas.mjs";
import { guardarDato, registrarCorrida } from "@/lib/ingesta";
import { vieneDelDespertador, asegurarSaludo } from "@/lib/qstash";
import { evaluarResumen } from "@/lib/resumen";
import { redis } from "@/lib/servidor";

// El cadete principal: un despertador externo (Upstash QStash, gratis) llama acá cada 15 minutos.
// Solo responde si el pedido viene firmado por ese despertador. GitHub Actions queda de respaldo.
export const maxDuration = 60;
export async function POST(req: Request) {
  if (!(await vieneDelDespertador(req))) return Response.json({ ok: false }, { status: 401 });
  const fallos = await correrTareas({ guardar: (clave: string, c: { contenido?: unknown; error?: string }) => guardarDato(clave, c.contenido, c.error) });
  await registrarCorrida("despertador");
  await asegurarSaludo().catch((e) => console.error("saludo:", e));
  // TEMPORAL (23/10): reenvío único del saludo de hoy, con prioridad alta
  const [nuevo] = await redis([["SET", "reenvio:saludo:2026-10-23", "1", "NX", "EX", 3 * 86400]]);
  if (nuevo === "OK") await evaluarResumen(":reenvio");
  return Response.json({ ok: true, fallos });
}
