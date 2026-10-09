import { config } from "@/lomas.config.mjs";
import { db } from "@/lib/servidor";

export async function POST(req: Request) {
  const { seccion, mensaje } = await req.json().catch(() => ({}));
  if (!(seccion in config.secciones)) return Response.json({ ok: false }, { status: 400 });
  const r = await db("reportes", {
    method: "POST",
    body: JSON.stringify({ seccion, mensaje: String(mensaje ?? "").slice(0, 300) }),
  });
  return Response.json({ ok: r.ok }, { status: r.ok ? 200 : 500 });
}
