import { esAdmin } from "@/lib/cuentas";
import { paraPanel, quitar, bloquearDe } from "@/lib/pasa";
import { dejarPublicada } from "@/lib/moderacion";

// Mi panel → "Pasa en Lomas": ver todos los avisos, borrar, dejar publicado uno ocultado por denuncias y bloquear a quien lo publicó.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  const id = String(c.id ?? "").slice(0, 20);
  switch (c.accion) {
    case "listar": return Response.json({ ok: true, avisos: await paraPanel() });
    case "borrar": return Response.json({ ok: await quitar(id) });
    case "dejar": return Response.json({ ok: await dejarPublicada("pasa", id) });
    case "bloquear": return Response.json({ ok: await bloquearDe(id) });
  }
  return Response.json({ ok: false }, { status: 400 });
}
