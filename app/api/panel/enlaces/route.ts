import { esAdmin } from "@/lib/cuentas";
import { leerEstadoEnlaces, controlarEnlaces } from "@/lib/enlaces";

export const maxDuration = 60;

// Mi panel: resultado del último control semanal de enlaces. "controlar" hace el control ahora mismo.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  if (c.accion === "controlar") return Response.json({ ok: true, estado: await controlarEnlaces() });
  return Response.json({ ok: true, estado: await leerEstadoEnlaces() });
}
