import { after } from "next/server";
import { validarSuscripcion, guardarSuscripcion, borrarSuscripcion, leerSuscripcion, confirmarSuscripcion } from "@/lib/push";

// Sin registro: solo se guarda la dirección que el navegador da para avisar, el barrio y qué tipos quiere.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const cuerpo = await req.json().catch(() => ({}));
  try {
    if (cuerpo.accion === "borrar") {
      const endpoint = String(cuerpo.endpoint ?? "");
      if (/^https:\/\/[^\s]{10,500}$/.test(endpoint)) await borrarSuscripcion(endpoint);
      return Response.json({ ok: true });
    }
    // El navegador cambió la suscripción por su cuenta: se conservan las preferencias de la anterior
    if (cuerpo.accion === "renovar") {
      const vieja = String(cuerpo.anterior ?? "").startsWith("https://") ? await leerSuscripcion(String(cuerpo.anterior)) : null;
      const n = validarSuscripcion({ subscription: cuerpo.subscription, tipos: vieja?.tipos ?? {}, v: 2, equipo: vieja?.equipo });
      if (typeof n === "string") return Response.json({ ok: false, error: n }, { status: 400 });
      await guardarSuscripcion(n);
      if (vieja && vieja.endpoint !== n.endpoint) await borrarSuscripcion(vieja.endpoint);
      return Response.json({ ok: true });
    }
    const s = validarSuscripcion(cuerpo);
    if (typeof s === "string") return Response.json({ ok: false, error: s }, { status: 400 });
    const nueva = await guardarSuscripcion(s);
    if (nueva) after(() => confirmarSuscripcion(s.endpoint)); // celular nuevo: confirmación solo para él
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "No se pudo guardar. Probá de nuevo." }, { status: 500 });
  }
}
