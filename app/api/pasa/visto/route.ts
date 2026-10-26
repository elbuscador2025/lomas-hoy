import { marcarVisto } from "@/lib/pasa";

// "Yo también lo vi": cuenta una sola vez por celular por aviso.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const c = await req.json().catch(() => ({}));
  const id = String(c.id ?? "").slice(0, 20), dispositivo = String(c.dispositivo ?? "");
  if (!id || dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false }, { status: 400 });
  const n = await marcarVisto(id, dispositivo).catch(() => null);
  return n == null ? Response.json({ ok: false }, { status: 404 }) : Response.json({ ok: true, vistos: n });
}
