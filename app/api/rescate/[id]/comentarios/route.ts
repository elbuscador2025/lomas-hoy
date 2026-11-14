import { comentar } from "@/lib/rescate";
import { ipDe } from "@/lib/cuentas";

// Responder dentro de una publicación (o contestarle a otro mensaje, con "padre"). Si viene el código secreto de quien publicó, el mensaje sale marcado como "Dueño de la publicación".
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const { id } = await params;
  const c = await req.json().catch(() => ({}));
  const dispositivo = String(c.dispositivo ?? "");
  if (!/^[a-f0-9-]{10}$/.test(id) || dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false, error: "No se pudo enviar." }, { status: 400 });
  const padre = c.padre ? String(c.padre).slice(0, 20) : undefined;
  const r = await comentar(id, c.texto, dispositivo, ipDe(req), c.token, padre);
  return Response.json(r, { status: r.ok ? 200 : 400 });
}
