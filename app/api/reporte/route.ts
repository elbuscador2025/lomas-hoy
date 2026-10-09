import { config } from "@/lomas.config.mjs";
import { redis } from "@/lib/servidor";

export async function POST(req: Request) {
  const { seccion, mensaje } = await req.json().catch(() => ({}));
  if (!(seccion in config.secciones) && !/^(lugar|aviso):/.test(String(seccion))) return Response.json({ ok: false }, { status: 400 });
  const reporte = { creado_en: new Date().toISOString(), seccion: String(seccion).slice(0, 100), mensaje: String(mensaje ?? "").slice(0, 300) };
  try {
    await redis([["LPUSH", "reportes", JSON.stringify(reporte)], ["LTRIM", "reportes", 0, 999]]);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
