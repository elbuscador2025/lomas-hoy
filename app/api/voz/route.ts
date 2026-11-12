import { ver, votar } from "@/lib/voz";
import { esAdmin, ipDe } from "@/lib/cuentas";

// Público: la pregunta de hoy de "La Voz de Lomas". Cada celular ve sus propios datos (si ya votó), por eso nunca se guarda en caché.
const SIN_CACHE = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const d = new URL(req.url).searchParams.get("d") ?? "";
  if (d && (d.length < 8 || d.length > 64)) return Response.json({ ok: false }, { status: 400, headers: SIN_CACHE });
  try {
    const estado = await ver(d);
    return Response.json(estado ?? { ok: true, sinPregunta: true }, { headers: SIN_CACHE });
  } catch (e) {
    console.error("voz", e);
    return Response.json({ ok: false }, { status: 503, headers: SIN_CACHE });
  }
}

// Votar con un solo toque: sin registro ni datos. Un voto por celular y por pregunta, decidido acá en el servidor.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const c = await req.json().catch(() => ({}));
  const dispositivo = String(c.dispositivo ?? "");
  if (dispositivo.length < 8 || dispositivo.length > 64) return Response.json({ ok: false, error: "No se pudo votar." }, { status: 400 });
  try {
    // Mis votos de dueño (sesión del panel abierta, o este celular marcado como mío) se ven pero no suman
    const contar = !(c.dueno === true) && !(await esAdmin(req).catch(() => false));
    const r = await votar(String(c.pregunta ?? ""), String(c.opcion ?? ""), dispositivo, ipDe(req), contar);
    return Response.json(r, { status: r.ok ? 200 : r.status, headers: SIN_CACHE });
  } catch (e) {
    console.error("voz votar", e);
    return Response.json({ ok: false, error: "No se pudo votar. Probá de nuevo." }, { status: 500 });
  }
}
