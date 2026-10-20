import { after } from "next/server";
import { crearFeria, limitePorDia } from "@/lib/trueque";
import { notificarAdmin } from "@/lib/push";
import { ipDe } from "@/lib/cuentas";

// Avisar de una feria: queda pendiente hasta que yo la apruebe.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const c = await req.json().catch(() => null);
  const dispositivo = String(c?.dispositivo ?? "");
  if (!c || dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false, error: "No se pudo enviar." }, { status: 400 });
  if (!(await limitePorDia(dispositivo, ipDe(req)))) {
    return Response.json({ ok: false, error: "Ya enviaste 3 veces hoy. Probá mañana." }, { status: 429 });
  }
  const r = await crearFeria(c);
  if (!r.ok) return Response.json(r, { status: 400 });
  after(() => notificarAdmin("Nueva feria de trueque para aprobar", String(c.lugar ?? "").slice(0, 80), "/panel#trueque"));
  return Response.json({ ok: true });
}
