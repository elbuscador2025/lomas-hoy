import { after } from "next/server";
import { config } from "@/lomas.config.mjs";
import { comentar } from "@/lib/emprendedores";
import { ipDe } from "@/lib/cuentas";

// Preguntar o responder dentro de una publicación (o contestarle a otro mensaje, con "padre"). Si viene el código secreto del dueño, el mensaje sale marcado como "Emprendedor".
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!config.secciones.emprendedores.activa) return Response.json({ ok: false }, { status: 404 });
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const { id } = await params;
  const c = await req.json().catch(() => ({}));
  const dispositivo = String(c.dispositivo ?? "");
  if (!/^[a-f0-9-]{10}$/.test(id) || dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false, error: "No se pudo enviar." }, { status: 400 });
  const padre = c.padre ? String(c.padre).slice(0, 20) : undefined; // si viene, es una respuesta a ese mensaje
  const r = await comentar(id, c.texto, dispositivo, ipDe(req), c.token, padre);
  if (!r.ok) return Response.json(r, { status: 400 });
  if (r.avisar) after(() => r.avisar!().catch((e) => console.error("aviso emprendedor", e)));
  return Response.json({ ok: true });
}
