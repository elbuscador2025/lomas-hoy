import { publicos, crear, limitePorDia } from "@/lib/rescate";
import { MAX_POR_DIA_RESCATE } from "@/lib/rescate-comun";
import { ipDe } from "@/lib/cuentas";

// Público: los animales que necesitan ayuda (sin los ocultos por denuncias ni los vencidos).
export async function GET() {
  try {
    return Response.json(await publicos(), { headers: { "Cache-Control": "public, s-maxage=15" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}

// Publicar sin registro y sin aprobación previa. Máximo 3 por día por celular.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const dispositivo = String(form?.get("dispositivo") ?? "");
  if (!form || dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false, error: "No se pudo enviar." }, { status: 400 });
  if (!(await limitePorDia(dispositivo, ipDe(req)))) return Response.json({ ok: false, error: `Ya publicaste ${MAX_POR_DIA_RESCATE} veces hoy. Probá mañana.` }, { status: 429 });
  const r = await crear(form, dispositivo);
  if (!r.ok) return Response.json(r, { status: 400 });
  return Response.json({ ok: true, id: r.id, token: r.token });
}
