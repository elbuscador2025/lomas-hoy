import { esAdmin } from "@/lib/cuentas";
import { agregarBloqueo, listarBloqueos, desbloquear } from "@/lib/moderacion";
import { deQuien as deQuienTrueque, quitarDe as quitarDeTrueque } from "@/lib/trueque";
import { deQuien as deQuienTrabajo, quitarDe as quitarDeTrabajo } from "@/lib/trabajo";

// Mi panel: bloquear a quien publicó (baja todo lo suyo y no puede volver a publicar), ver la lista y desbloquear.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  const id = String(c.id ?? "").slice(0, 20);
  switch (c.accion) {
    case "listar": return Response.json({ ok: true, bloqueados: await listarBloqueos() });
    case "desbloquear": await desbloquear(id); return Response.json({ ok: true });
    case "bloquear": {
      const quien = c.seccion === "trabajo" ? await deQuienTrabajo(id) : await deQuienTrueque(id);
      if (!quien) return Response.json({ ok: false }, { status: 404 });
      await agregarBloqueo(quien.whatsapp, quien.disp, quien.nota);
      await quitarDeTrueque(quien.whatsapp, quien.disp);
      await quitarDeTrabajo(quien.whatsapp, quien.disp);
      return Response.json({ ok: true });
    }
  }
  return Response.json({ ok: false }, { status: 400 });
}
