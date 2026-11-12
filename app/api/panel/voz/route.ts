import { esAdmin } from "@/lib/cuentas";
import { paraPanel, guardarPregunta, activarPregunta, elegirPregunta, ocultarComentario, dejarComentario, borrarComentario, bloquearAutor } from "@/lib/voz";

// Mi panel → La Voz de Lomas: preguntas, pregunta del día, resultados y comentarios.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  const id = String(c.id ?? "").slice(0, 20), cid = String(c.cid ?? "").slice(0, 20);
  switch (c.accion) {
    case "listar": return Response.json({ ok: true, ...(await paraPanel()) });
    case "guardar": return Response.json(await guardarPregunta(c.pregunta ?? {}));
    case "activar": return Response.json({ ok: await activarPregunta(id, c.activa === true) });
    case "elegir": return Response.json({ ok: await elegirPregunta(id || null, c.cuando === "manana" ? "manana" : "hoy") });
    case "ocultar": return Response.json({ ok: await ocultarComentario(id, cid, c.oculta !== false) });
    case "dejar": return Response.json({ ok: await dejarComentario(id, cid) });
    case "borrar": return Response.json({ ok: await borrarComentario(id, cid) });
    case "bloquear": return Response.json({ ok: await bloquearAutor(id, cid) });
  }
  return Response.json({ ok: false }, { status: 400 });
}
