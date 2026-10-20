import { esAdmin } from "@/lib/cuentas";
import { listarDenunciasLibres, marcarBloqueada, agregarBloqueo } from "@/lib/moderacion";
import { quitarDe as quitarDeTrueque } from "@/lib/trueque";
import { quitarDe as quitarDeTrabajo } from "@/lib/trabajo";

// Mi panel → pestaña Denuncias: las denuncias de estafa que mandaron los vecinos, y "Bloquear número".
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  if (c.accion === "listar") return Response.json({ ok: true, denuncias: await listarDenunciasLibres() });
  if (c.accion === "bloquear") {
    const d = await marcarBloqueada(String(c.id ?? "").slice(0, 20));
    if (!d || !d.whatsapp) return Response.json({ ok: false }, { status: 404 });
    await agregarBloqueo(d.whatsapp, "", d.publicacion || d.motivo);
    await quitarDeTrueque(d.whatsapp, "");
    await quitarDeTrabajo(d.whatsapp, "");
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 400 });
}
