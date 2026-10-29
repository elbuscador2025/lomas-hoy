import { esAdmin, cerrarSesionesDe } from "@/lib/cuentas";
import { crearInvitacion, listar, cambiarActivo, nuevaClaveTemporal, leer, personas } from "@/lib/merenderos";

// Mi panel → pestaña "Merenderos": invitar, ver la lista, activar/desactivar y dar una contraseña temporal.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  const id = String(c.id ?? "");
  if (c.accion === "listar") return Response.json({ ok: true, merenderos: await listar() });
  // Solo para mirar: el panel de esa olla como lo ve ella (sin tocar nada de su cuenta)
  if (c.accion === "ver") {
    const m = await leer(id);
    if (!m) return Response.json({ ok: false }, { status: 404 });
    return Response.json({ ok: true, merendero: { id: m.id, nombre: m.nombre, responsable: m.responsable, direccion: m.direccion, abierta: m.abierta, cena: m.cena ?? null, personas: await personas(m.id) } });
  }
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
