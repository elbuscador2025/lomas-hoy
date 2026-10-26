import { createHash, randomUUID } from "node:crypto";
import { redis, hoyArgentina } from "@/lib/servidor";
import { ipDe } from "@/lib/cuentas";

// Sugerencias: no son públicas, no piden ningún dato y no mandan notificación. Máximo 3 por día por celular.
const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const c = await req.json().catch(() => ({}));
  const texto = String(c.texto ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  const dispositivo = String(c.dispositivo ?? "");
  if (dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false, error: "No se pudo enviar." }, { status: 400 });
  if (texto.length < 3) return Response.json({ ok: false, error: "Escribí tu idea." }, { status: 400 });
  if (texto.length > 500) return Response.json({ ok: false, error: "Máximo 500 caracteres." }, { status: 400 });
  const dia = hoyArgentina(), kd = `sug:dia:${dia}:d:${sha(dispositivo)}`, ki = `sug:dia:${dia}:ip:${sha(ipDe(req))}`;
  const [d, i] = await redis([["INCR", kd], ["INCR", ki]]);
  await redis([["EXPIRE", kd, 2 * 86400], ["EXPIRE", ki, 2 * 86400]]);
  if (Number(d) > 3 || Number(i) > 9) return Response.json({ ok: false, error: "Ya mandaste 3 ideas hoy. ¡Gracias! Probá mañana." }, { status: 429 });
  const id = randomUUID().slice(0, 10);
  await redis([["HSET", "sugerencias", id, JSON.stringify({ id, texto, t: new Date().toISOString() })]]);
  return Response.json({ ok: true });
}
