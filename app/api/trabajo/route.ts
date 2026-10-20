import { after } from "next/server";
import { publicas, crearPendiente, limitePorDia } from "@/lib/trabajo";
import { notificarAdmin } from "@/lib/push";
import { ipDe } from "@/lib/cuentas";

// Público: las publicaciones aprobadas, vigentes y sin ocultar por denuncias.
export async function GET() {
  try {
    return Response.json(await publicas(), { headers: { "Cache-Control": "public, s-maxage=30" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}

// Publicar sin registro: queda pendiente hasta que yo la apruebe. Máximo 3 por día por celular.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const dispositivo = String(form?.get("dispositivo") ?? "");
  if (!form || dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false, error: "No se pudo enviar." }, { status: 400 });
  if (!(await limitePorDia(dispositivo, ipDe(req)))) {
    return Response.json({ ok: false, error: "Ya publicaste 3 veces hoy. Probá mañana." }, { status: 429 });
  }
  const r = await crearPendiente(form, dispositivo);
  if (!r.ok) return Response.json(r, { status: 400 });
  after(() => notificarAdmin(r.modo === "ofrezco" ? "Nuevo trabajo para aprobar" : "Nueva búsqueda de trabajo para aprobar", `${String(form.get("texto") ?? "").slice(0, 80)}${r.posibleEstafa ? " · Posible estafa" : ""}`, "/panel#trabajo"));
  return Response.json({ ok: true, enlace: `${new URL(req.url).origin}/trabajo/${r.token}` });
}
