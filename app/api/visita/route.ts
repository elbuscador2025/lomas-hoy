import { redis, hoyArgentina } from "@/lib/servidor";
import { esAdmin } from "@/lib/cuentas";

// Guarda solo un número al azar por celu y por día. No hay nombres, ni IP, ni nada personal.
// No se cuentan robots, vistas previas (WhatsApp, redes) ni navegadores automáticos de prueba.
const ROBOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|headless|puppeteer|playwright|selenium|phantom|lighthouse|pagespeed|gtmetrix|uptime|monitor|curl|wget|python|java|go-http|node-fetch|axios|undici|vercel|okhttp|libwww/i;
export async function POST(req: Request) {
  if (ROBOT.test(req.headers.get("user-agent") ?? "")) return Response.json({ ok: true });
  if (await esAdmin(req).catch(() => false)) return Response.json({ ok: true }); // con la sesión del panel abierta, tampoco se cuenta al dueño
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || id.length < 8 || id.length > 64) return Response.json({ ok: false }, { status: 400 });
  const dia = hoyArgentina();
  try {
    const [primera, , previo] = await redis([["HSETNX", "primero", id, dia], ["SADD", `v:${dia}`, id], ["HGET", "primero", id]]);
    if (primera === 0 && typeof previo === "string" && previo < dia) {
      await redis([["SADD", `vuelve:${dia}`, id], ["SADD", "volvieron", id]]);
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
