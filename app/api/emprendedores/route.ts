import { after } from "next/server";
import { config } from "@/lomas.config.mjs";
import { publicos, crear, limitePorDia, MAX_POR_DIA_EMP } from "@/lib/emprendedores";
import { ipDe } from "@/lib/cuentas";
import { notificarAdmin } from "@/lib/push";

// Público: los emprendimientos vigentes (sin los ocultos por denuncias).
export async function GET() {
  if (!config.secciones.emprendedores.activa) return Response.json([]);
  try {
    return Response.json(await publicos(), { headers: { "Cache-Control": "public, s-maxage=15" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}

// Publicar sin registro y sin aprobación previa. Máximo 3 por día por celular. A mí me llega un aviso por cada publicación nueva.
export async function POST(req: Request) {
  if (!config.secciones.emprendedores.activa) return Response.json({ ok: false }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const dispositivo = String(form?.get("dispositivo") ?? "");
  if (!form || dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false, error: "No se pudo enviar." }, { status: 400 });
  if (!(await limitePorDia(dispositivo, ipDe(req)))) return Response.json({ ok: false, error: `Ya publicaste ${MAX_POR_DIA_EMP} veces hoy. Probá mañana.` }, { status: 429 });
  const r = await crear(form, dispositivo);
  if (!r.ok) return Response.json(r, { status: 400 });
  after(() => notificarAdmin("Nuevo emprendimiento", r.titulo.slice(0, 100), "/panel#emprendedores"));
  return Response.json({ ok: true, id: r.id, token: r.token, enlace: `${new URL(req.url).origin}/emprendedores/${r.token}` });
}
