import { config } from "@/lomas.config.mjs";
import { publicos, publicar, limitePorDia, MAX_POR_DIA_PASA } from "@/lib/pasa";
import { ipDe } from "@/lib/cuentas";
import { notificarAdmin } from "@/lib/push";
import { after } from "next/server";

// Público: los avisos de las últimas 24 horas (sin los ocultos por denuncias).
export async function GET() {
  if (!config.secciones.pasa.activa) return Response.json([]); // sección apagada
  try {
    return Response.json(await publicos(), { headers: { "Cache-Control": "public, s-maxage=15" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}

// Publicar sin registro y sin aprobación. Máximo 3 por día por celular.
export async function POST(req: Request) {
  if (!config.secciones.pasa.activa) return Response.json({ ok: false }, { status: 404 }); // sección apagada
  const form = await req.formData().catch(() => null);
  const dispositivo = String(form?.get("dispositivo") ?? "");
  if (!form || dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false, error: "No se pudo enviar." }, { status: 400 });
  // Cada intento cuenta para el máximo de 3 por día
  if (!(await limitePorDia(dispositivo, ipDe(req)))) return Response.json({ ok: false, error: `Ya publicaste ${MAX_POR_DIA_PASA} avisos hoy. Probá mañana.` }, { status: 429 });
  const r = await publicar(form, dispositivo);
  if (r.ok) after(() => notificarAdmin("Nuevo aviso de vecino", r.texto.slice(0, 100), "/panel#pasa")); // solo me avisa a mí (el dueño); a los vecinos nunca les llega una notificación
  return Response.json(r.ok ? { ok: true, id: r.id } : r, { status: r.ok ? 200 : 400 });
}
