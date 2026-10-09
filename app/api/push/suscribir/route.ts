import { validarSuscripcion, guardarSuscripcion, borrarSuscripcion } from "@/lib/push";

// Sin registro: solo se guarda la dirección que el navegador da para avisar, el barrio y qué tipos quiere.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const cuerpo = await req.json().catch(() => ({}));
  try {
    if (cuerpo.accion === "borrar") {
      const endpoint = String(cuerpo.endpoint ?? "");
      if (/^https:\/\/[^\s]{10,500}$/.test(endpoint)) await borrarSuscripcion(endpoint);
      return Response.json({ ok: true });
    }
    const s = validarSuscripcion(cuerpo);
    if (typeof s === "string") return Response.json({ ok: false, error: s }, { status: 400 });
    await guardarSuscripcion(s);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "No se pudo guardar. Probá de nuevo." }, { status: 500 });
  }
}
