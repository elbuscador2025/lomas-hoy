import { esAdmin } from "@/lib/cuentas";
import { paraPanel, quitar, borrarComentario, dejarPublicado, bloquear } from "@/lib/emprendedores";

// Mi panel → Emprendedores: ver todo, borrar publicaciones y comentarios, dejar publicado lo ocultado por denuncias y bloquear.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  const id = String(c.id ?? "").slice(0, 20), cid = c.cid ? String(c.cid).slice(0, 20) : undefined;
  switch (c.accion) {
    case "listar": return Response.json({ ok: true, lista: await paraPanel() });
    case "borrar": return Response.json({ ok: cid ? await borrarComentario(id, cid) : await quitar(id) });
    case "dejar": return Response.json({ ok: await dejarPublicado(id, cid) });
    case "bloquear": return Response.json({ ok: await bloquear(id, cid) });
  }
  return Response.json({ ok: false }, { status: 400 });
}
