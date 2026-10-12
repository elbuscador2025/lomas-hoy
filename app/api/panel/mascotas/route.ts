import { esAdmin } from "@/lib/cuentas";
import { paraModerar, aprobar, quitar } from "@/lib/mascotas";
import { guardarSuscripcionAdmin } from "@/lib/push";

// Mi panel → pestaña Mascotas: pendientes y aprobadas, aprobar / rechazar, y avisos de nuevas en este celular.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  const id = String(c.id ?? "").slice(0, 20);
  switch (c.accion) {
    case "listar": return Response.json({ ok: true, ...(await paraModerar()) });
    case "aprobar": return Response.json({ ok: await aprobar(id) });
    case "rechazar": return Response.json({ ok: await quitar(id) }); // borra la publicación y su foto
    case "suscribir": {
      const error = await guardarSuscripcionAdmin(c);
      return Response.json({ ok: !error, error });
    }
  }
  return Response.json({ ok: false }, { status: 400 });
}
