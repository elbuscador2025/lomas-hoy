import { after } from "next/server";
import { publicas, crearPendiente, limitePorDia } from "@/lib/mascotas";
import { notificarAdmin } from "@/lib/push";
import { ipDe } from "@/lib/cuentas";

// Público: las mascotas aprobadas y vigentes.
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
  const r = await crearPendiente(form);
  if (!r.ok) return Response.json(r, { status: 400 });
  after(() => notificarAdmin("Nueva mascota para aprobar", `${form.get("estado") === "encontrado" ? "Encontrada" : "Perdida"} en ${String(form.get("barrio") ?? "").slice(0, 40)}`, "/panel#mascotas"));
  return Response.json({ ok: true, enlace: `${new URL(req.url).origin}/mascota/${r.token}` });
}
