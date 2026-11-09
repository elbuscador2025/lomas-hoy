import { createHash } from "node:crypto";
import { redis, hoyArgentina } from "@/lib/servidor";
import { ipDe } from "@/lib/cuentas";
import { limpiar } from "@/lib/buscador";

// Búsquedas sin resultado: se anota solo el texto (sin tildes ni mayúsculas) y cuántas veces se buscó cada día. No se guarda quién lo escribió.
// Se descartan los textos con números largos (teléfonos, DNI), con arroba o muy cortos. Se guardan 35 días.
const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const c = await req.json().catch(() => ({}));
  const crudo = String(c.texto ?? "");
  const texto = limpiar(crudo).slice(0, 40).trim();
  if (texto.length < 3 || !/[a-z]{3}/.test(texto) || /\d{6,}/.test(texto.replace(/\s/g, "")) || crudo.includes("@")) return Response.json({ ok: true });
  const dia = hoyArgentina(), lim = `busq:lim:${dia}:${sha(ipDe(req))}`; // solo para frenar abusos (vence en 2 días)
  const [n] = await redis([["INCR", lim]]);
  await redis([["EXPIRE", lim, 2 * 86400]]);
  if (Number(n) > 40) return Response.json({ ok: true });
  await redis([["HINCRBY", `busq:${dia}`, texto, 1], ["EXPIRE", `busq:${dia}`, 35 * 86400]]);
  return Response.json({ ok: true });
}
