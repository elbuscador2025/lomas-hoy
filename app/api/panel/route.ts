import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/servidor";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  const esperada = Buffer.from(process.env.PANEL_PASSWORD ?? "");
  const dada = Buffer.from(String(password ?? ""));
  if (!esperada.length || esperada.length !== dada.length || !timingSafeEqual(esperada, dada)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const [dias, resumen, reportes] = await Promise.all([
    db("panel_dias").then((r) => r.json()),
    db("panel_resumen").then((r) => r.json()),
    db("reportes?select=creado_en,seccion,mensaje&order=id.desc&limit=100").then((r) => r.json()),
  ]);
  return Response.json({ ok: true, dias, resumen: resumen[0] ?? null, reportes });
}
