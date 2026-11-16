import { esAdmin } from "@/lib/cuentas";
import { listar, crear, quitar } from "@/lib/portada";

// Mi panel → Portada: ver las que cargué, subir una nueva (foto + título + texto o enlace) y sacarla.
export async function POST(req: Request) {
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const tipo = req.headers.get("content-type") ?? "";
  if (tipo.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return Response.json({ ok: false, error: "No se pudo leer." }, { status: 400 });
    const r = await crear(form);
    return Response.json(r, { status: r.ok ? 200 : 400 });
  }
  if (!tipo.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const c = await req.json().catch(() => ({}));
  switch (c.accion) {
    case "listar": return Response.json({ ok: true, lista: await listar() });
    case "quitar": return Response.json({ ok: await quitar(String(c.id ?? "").slice(0, 20)) });
  }
  return Response.json({ ok: false }, { status: 400 });
}
