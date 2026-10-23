import { correrTareas } from "@/scripts/tareas.mjs";
import { guardarDato, registrarCorrida } from "@/lib/ingesta";
import { vieneDelDespertador, asegurarSaludo } from "@/lib/qstash";
import { todasLasSuscripciones, enviarPrueba } from "@/lib/push";
import { redis } from "@/lib/servidor";

// El cadete principal: un despertador externo (Upstash QStash, gratis) llama acá cada 15 minutos.
// Solo responde si el pedido viene firmado por ese despertador. GitHub Actions queda de respaldo.
export const maxDuration = 60;
export async function POST(req: Request) {
  if (!(await vieneDelDespertador(req))) return Response.json({ ok: false }, { status: 401 });
  const fallos = await correrTareas({ guardar: (clave: string, c: { contenido?: unknown; error?: string }) => guardarDato(clave, c.contenido, c.error) });
  await registrarCorrida("despertador");
  await asegurarSaludo().catch((e) => console.error("saludo:", e));
  // TEMPORAL (23/10): prueba única a todos los celulares anotados
  const [uno] = await redis([["SET", "prueba:unica:2026-10-23", "1", "NX", "EX", 86400]]);
  if (uno === "OK") {
    const out = [];
    for (const s of await todasLasSuscripciones()) out.push({ equipo: s.equipo ?? "?", creado: s.creado, r: await enviarPrueba(s.endpoint).catch((e) => ({ ok: false, mensaje: String(e) })) });
    await redis([["SET", "prueba:resultado", JSON.stringify(out), "EX", 86400]]);
  }
  return Response.json({ ok: true, fallos });
}
