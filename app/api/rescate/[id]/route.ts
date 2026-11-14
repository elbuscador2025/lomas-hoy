import { detalle, marcarRescatado, borrarDelDuenio } from "@/lib/rescate";

const idValido = (id: string) => /^[a-f0-9-]{10}$/.test(id);

// Público: una publicación con su conversación.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = idValido(id) ? await detalle(id).catch(() => null) : null;
  return d ? Response.json(d, { headers: { "Cache-Control": "no-store" } }) : Response.json({ ok: false }, { status: 404 });
}

// Solo quien publicó (con su código secreto): marcar «Ya fue rescatado» o borrar.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const { id } = await params;
  const c = await req.json().catch(() => ({}));
  if (!idValido(id)) return Response.json({ ok: false }, { status: 404 });
  switch (c.accion) {
    case "rescatado": return Response.json({ ok: await marcarRescatado(id, c.token, c.valor !== false) });
    case "borrar": return Response.json({ ok: await borrarDelDuenio(id, c.token) });
  }
  return Response.json({ ok: false }, { status: 400 });
}
