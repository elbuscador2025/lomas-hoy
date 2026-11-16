import { esAdmin } from "@/lib/cuentas";
import { paraPanel, editar, desactivar, volverAlOriginal, agregar, borrarManual, guardarInscripciones, restaurarInscripciones, actualizarListado } from "@/lib/escuelas";

export const maxDuration = 60; // bajar y leer el padrón oficial (16 MB) puede tardar

// Mi panel → Escuelas: ver, editar, desactivar y agregar establecimientos; editar el recuadro de inscripciones; actualizar el listado oficial.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  const id = String(c.id ?? "").slice(0, 40);
  switch (c.accion) {
    case "listar": return Response.json({ ok: true, ...(await paraPanel()) });
    case "editar": return Response.json(await editar(id, c.datos ?? {}));
    case "desactivar": return Response.json({ ok: await desactivar(id, c.valor !== false) });
    case "original": return Response.json({ ok: await volverAlOriginal(id) });
    case "agregar": return Response.json(await agregar(c.datos ?? {}));
    case "borrar": return Response.json({ ok: await borrarManual(id) });
    case "inscripciones": return Response.json(await guardarInscripciones(c.datos ?? {}));
    case "inscripciones-original": await restaurarInscripciones(); return Response.json({ ok: true });
    case "actualizar": return Response.json(await actualizarListado());
  }
  return Response.json({ ok: false }, { status: 400 });
}
