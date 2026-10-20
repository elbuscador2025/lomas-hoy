import { esAdmin } from "@/lib/cuentas";
import { paraModerar, aprobar, quitar, aprobarFeria, quitarFeria } from "@/lib/trueque";

// Mi panel → pestaña Trueque: pendientes y publicadas (publicaciones y ferias), aprobar / rechazar / borrar.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  const id = String(c.id ?? "").slice(0, 20);
  switch (c.accion) {
    case "listar": return Response.json({ ok: true, ...(await paraModerar()) });
    case "aprobar": return Response.json({ ok: await aprobar(id) });
    case "rechazar": return Response.json({ ok: await quitar(id) }); // borra la publicación y su foto
    case "aprobarFeria": return Response.json({ ok: await aprobarFeria(id) });
    case "borrarFeria": return Response.json({ ok: await quitarFeria(id) });
  }
  return Response.json({ ok: false }, { status: 400 });
}
