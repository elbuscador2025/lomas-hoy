import { config } from "@/lomas.config.mjs";
import { detalle, editar, renovar, borrarDelDuenio } from "@/lib/emprendedores";

const idValido = (id: string) => /^[a-f0-9-]{10}$/.test(id);

// Público: una publicación con su conversación.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!config.secciones.emprendedores.activa) return Response.json({ ok: false }, { status: 404 });
  const { id } = await params;
  const d = idValido(id) ? await detalle(id).catch(() => null) : null;
  return d ? Response.json(d, { headers: { "Cache-Control": "no-store" } }) : Response.json({ ok: false }, { status: 404 });
}

// Solo el dueño (con su código secreto): editar, renovar y borrar.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!config.secciones.emprendedores.activa) return Response.json({ ok: false }, { status: 404 });
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const { id } = await params;
  const c = await req.json().catch(() => ({}));
  if (!idValido(id)) return Response.json({ ok: false }, { status: 404 });
  switch (c.accion) {
    case "editar": { const r = await editar(id, c.token, c); return Response.json(r, { status: r.ok ? 200 : 400 }); }
    case "renovar": { const vence = await renovar(id, c.token); return vence ? Response.json({ ok: true, vence }) : Response.json({ ok: false }, { status: 403 }); }
    case "borrar": return Response.json({ ok: await borrarDelDuenio(id, c.token) });
  }
  return Response.json({ ok: false }, { status: 400 });
}
