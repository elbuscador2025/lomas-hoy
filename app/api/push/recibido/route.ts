import { redis } from "@/lib/servidor";
import { idDe } from "@/lib/push";

// El celular avisa que le llegó y mostró una notificación (lo manda el service worker). Solo se cuenta si el celular tiene los avisos activados.
// Sirve para que en mi panel se vea cuántas notificaciones llegaron de verdad, no solo cuántas aceptó Google. No se guarda nada personal.
export async function POST(req: Request) {
  const c = await req.json().catch(() => ({}));
  const endpoint = String(c.endpoint ?? ""), tag = String(c.tag ?? "").slice(0, 80);
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 600 || !tag) return Response.json({ ok: false }, { status: 400 });
  const id = idDe(endpoint);
  const [existe] = await redis([["HEXISTS", "push:subs", id]]);
  if (Number(existe) !== 1) return Response.json({ ok: false }, { status: 404 });
  await redis([["HSET", `push:rec:${tag}`, id, new Date().toISOString()], ["EXPIRE", `push:rec:${tag}`, 3 * 86400]]);
  return Response.json({ ok: true });
}
