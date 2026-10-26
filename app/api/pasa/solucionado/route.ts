import { marcarSolucionado } from "@/lib/pasa";

// "Ya se solucionó": un toque por celular por aviso. Con el toque de quien lo publicó, o de 2 celulares distintos, el aviso queda solucionado.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const c = await req.json().catch(() => ({}));
  const id = String(c.id ?? "").slice(0, 20), dispositivo = String(c.dispositivo ?? "");
  if (!id || dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false }, { status: 400 });
  const listo = await marcarSolucionado(id, dispositivo).catch(() => null);
  return listo == null ? Response.json({ ok: false }, { status: 404 }) : Response.json({ ok: true, solucionado: listo });
}
