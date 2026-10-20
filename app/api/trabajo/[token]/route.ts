import { porToken, baja } from "@/lib/trabajo";

// "Ya conseguí" / "Ya lo cubrí": quien publicó la baja con su enlace propio (se borra también la foto).
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const { token } = await params;
  const r = await porToken(token);
  if (!r) return Response.json({ ok: false }, { status: 404 });
  await baja(r.id);
  return Response.json({ ok: true });
}
