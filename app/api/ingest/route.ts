import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { evaluarTren, evaluarLuz } from "@/lib/eventos";
import { redis } from "@/lib/servidor";

// Lo llama el proceso automático (GitHub Actions) con la clave secreta.
export async function POST(req: Request) {
  const esperada = Buffer.from(`Bearer ${process.env.INGEST_SECRET ?? ""}`);
  const dada = Buffer.from(req.headers.get("authorization") ?? "");
  if (!process.env.INGEST_SECRET || esperada.length !== dada.length || !timingSafeEqual(esperada, dada)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const { clave, contenido, error } = await req.json().catch(() => ({}));
  if (!["tren", "luz", "clima", "colectivos"].includes(clave)) return Response.json({ ok: false }, { status: 400 });

  const ahora = new Date().toISOString();
  const llave = `datos:${clave}`;
  if (contenido) {
    await redis([["SET", llave, JSON.stringify({ clave, contenido, ok_en: ahora, intento_en: ahora, error: null })]]);
    // Las notificaciones salen después de responder: si fallan, el dato ya quedó guardado.
    if (clave === "tren") after(() => evaluarTren(contenido).catch((e) => console.error("push tren", e)));
    if (clave === "luz") after(() => evaluarLuz(contenido).catch((e) => console.error("push luz", e)));
  } else {
    // Falló la lectura: se conserva el último dato bueno y solo se anota el error.
    const [previo] = await redis([["GET", llave]]);
    const base = previo ? JSON.parse(previo as string) : { clave, contenido: null, ok_en: null };
    await redis([["SET", llave, JSON.stringify({ ...base, intento_en: ahora, error: String(error ?? "error").slice(0, 300) })]]);
  }
  return Response.json({ ok: true });
}
