import { esAdmin } from "@/lib/cuentas";
import { paraModerar, aprobar, quitar } from "@/lib/trabajo";
import { dejarPublicada } from "@/lib/moderacion";

// Mi panel → pestaña Trabajo: pendientes y publicadas, aprobar / rechazar / dejar publicada tras revisar denuncias.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  const id = String(c.id ?? "").slice(0, 20);
  switch (c.accion) {
    case "listar": return Response.json({ ok: true, ...(await paraModerar()) });
    case "aprobar": return Response.json({ ok: await aprobar(id) });
    case "rechazar": return Response.json({ ok: await quitar(id) });
    case "dejar": return Response.json({ ok: await dejarPublicada("trabajo", id) });
  }
  return Response.json({ ok: false }, { status: 400 });
}
