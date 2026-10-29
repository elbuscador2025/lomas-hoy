import { leer, vistaPublica, anotar } from "@/lib/merenderos";

// Público: lo que ve quien abre el enlace de una olla (nombre, dirección, si la lista está abierta y la última cena).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await leer(id).catch(() => null);
  if (!m || !m.activo) return Response.json({ ok: false }, { status: 404 });
  return Response.json({ ok: true, olla: vistaPublica(m) }, { headers: { "Cache-Control": "no-store" } });
}

// Anotar un celular en la lista de esa olla. No se pide nombre ni ningún dato: solo la dirección del celular para mandarle el aviso.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const { id } = await params;
  const cuerpo = await req.json().catch(() => ({}));
  try {
    const r = await anotar(id, cuerpo);
    if ("error" in r) return Response.json({ ok: false, error: r.error }, { status: r.estado });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "No se pudo anotar. Probá de nuevo." }, { status: 500 });
  }
}
