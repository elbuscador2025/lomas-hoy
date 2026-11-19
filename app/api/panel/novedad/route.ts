import { esAdmin } from "@/lib/cuentas";
import { leerNovedad, publicarNovedad, activarNovedad } from "@/lib/novedad";

// Mi panel → Novedades: ver el aviso actual, publicar uno nuevo (con ID nuevo) y prenderlo o apagarlo.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  switch (c.accion) {
    case "leer": return Response.json({ ok: true, novedad: await leerNovedad() });
    case "publicar": return Response.json(await publicarNovedad(c));
    case "activar": return Response.json({ ok: await activarNovedad(c.valor === true) });
  }
  return Response.json({ ok: false }, { status: 400 });
}
