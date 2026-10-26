import { publicos, publicar, limitePorDia, MAX_POR_DIA_PASA } from "@/lib/pasa";
import { ipDe } from "@/lib/cuentas";

// Público: los avisos de las últimas 24 horas (sin los ocultos por denuncias).
export async function GET() {
  try {
    return Response.json(await publicos(), { headers: { "Cache-Control": "public, s-maxage=15" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}

// Publicar sin registro y sin aprobación. Máximo 3 por día por celular.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const dispositivo = String(form?.get("dispositivo") ?? "");
  if (!form || dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false, error: "No se pudo enviar." }, { status: 400 });
  // Cada intento cuenta para el máximo de 3 por día
  if (!(await limitePorDia(dispositivo, ipDe(req)))) return Response.json({ ok: false, error: `Ya publicaste ${MAX_POR_DIA_PASA} avisos hoy. Probá mañana.` }, { status: 429 });
  const r = await publicar(form, dispositivo);
  return Response.json(r, { status: r.ok ? 200 : 400 });
}
