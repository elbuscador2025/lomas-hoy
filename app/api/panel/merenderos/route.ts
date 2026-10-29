import { esAdmin, cerrarSesionesDe } from "@/lib/cuentas";
import { crearInvitacion, listar, cambiarActivo, nuevaClaveTemporal } from "@/lib/merenderos";

// Mi panel → pestaña "Merenderos": invitar, ver la lista, activar/desactivar y dar una contraseña temporal.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  const id = String(c.id ?? "");
  if (c.accion === "listar") return Response.json({ ok: true, merenderos: await listar() });
  if (c.accion === "invitar") {
    const token = await crearInvitacion();
    return Response.json({ ok: true, enlace: `${new URL(req.url).origin}/merendero/registro?i=${token}` });
  }
  if (c.accion === "activo") {
    if (!(await cambiarActivo(id, !!c.activo))) return Response.json({ ok: false }, { status: 404 });
    if (!c.activo) await cerrarSesionesDe("merendero", id);
    return Response.json({ ok: true });
  }
  if (c.accion === "clave") {
    const temporal = await nuevaClaveTemporal(id);
    if (!temporal) return Response.json({ ok: false }, { status: 404 });
    await cerrarSesionesDe("merendero", id);
    return Response.json({ ok: true, temporal });
  }
  return Response.json({ ok: false }, { status: 400 });
}
