import { timingSafeEqual } from "node:crypto";
import { evaluarResumen } from "@/lib/resumen";
import { vieneDelDespertador } from "@/lib/qstash";

// Reloj de Vercel (gratis): una vez por día, a las 7 de la mañana de Argentina. Vercel manda la clave CRON_SECRET.
// Los horarios de GitHub Actions se atrasan o se saltean, por eso el saludo no depende de ellos.
export const maxDuration = 30;
export async function GET(req: Request) {
  const esperada = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ""}`);
  const dada = Buffer.from(req.headers.get("authorization") ?? "");
  if (!process.env.CRON_SECRET || esperada.length !== dada.length || !timingSafeEqual(esperada, dada)) return Response.json({ ok: false }, { status: 401 });
  await evaluarResumen();
  return Response.json({ ok: true });
}

// Vía principal: el despertador (QStash) llama a las 7:00 en punto, hora de Argentina. Solo responde si el pedido viene firmado.
export async function POST(req: Request) {
  if (!(await vieneDelDespertador(req))) return Response.json({ ok: false }, { status: 401 });
  await evaluarResumen();
  return Response.json({ ok: true });
}
