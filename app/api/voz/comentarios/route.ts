import { comentar } from "@/lib/voz";
import { ipDe } from "@/lib/cuentas";

// Comentario corto (hasta 200 caracteres) debajo de la pregunta del día, o respuesta a un comentario ("padre"). Sin enlaces ni teléfonos. 3 comentarios y 10 respuestas por día por celular.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const c = await req.json().catch(() => ({}));
  const dispositivo = String(c.dispositivo ?? "");
  if (dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false, error: "No se pudo enviar." }, { status: 400 });
  try {
    const padre = c.padre ? String(c.padre).slice(0, 20) : undefined; // si viene, es una respuesta a ese comentario
    const r = await comentar(c.texto, dispositivo, ipDe(req), padre);
    return Response.json(r, { status: r.ok ? 200 : r.status });
  } catch (e) {
    console.error("voz comentar", e);
    return Response.json({ ok: false, error: "No se pudo enviar. Probá de nuevo." }, { status: 500 });
  }
}
