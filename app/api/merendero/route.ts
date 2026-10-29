import { after } from "next/server";
import { sesionDe } from "@/lib/cuentas";
import { hoyArgentina } from "@/lib/servidor";
import { leer, personas, limpio, cambiarLista, guardarCena, avisar, type Merendero } from "@/lib/merenderos";

// Panel del merendero (solo con su sesión): ver su olla, publicar o suspender la cena, abrir o cerrar la lista.
async function mio(req: Request): Promise<Merendero | null> {
  const s = await sesionDe(req).catch(() => null);
  if (!s || s.tipo !== "merendero") return null;
  const m = await leer(s.id);
  return m && m.activo ? m : null;
}
const datosPanel = async (m: Merendero) => ({ ok: true, merendero: { id: m.id, nombre: m.nombre, responsable: m.responsable, direccion: m.direccion, abierta: m.abierta, cena: m.cena ?? null, personas: await personas(m.id) } });

export async function GET(req: Request) {
  const m = await mio(req);
  if (!m) return Response.json({ ok: false }, { status: 401 });
  return Response.json(await datosPanel(m), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const m = await mio(req);
  if (!m) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  if (c.accion === "lista") {
    await cambiarLista(m.id, !!c.abierta);
    return Response.json(await datosPanel({ ...m, abierta: !!c.abierta }));
  }
  if (c.accion === "publicar") {
    const queHay = limpio(c.queHay, 200), donde = limpio(c.donde, 140), dia = limpio(c.dia, 10), hora = limpio(c.hora, 5);
    if (queHay.length < 3) return Response.json({ ok: false, error: "Escribí qué hay para comer." }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || dia < hoyArgentina()) return Response.json({ ok: false, error: "Elegí el día (hoy o más adelante)." }, { status: 400 });
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return Response.json({ ok: false, error: "Elegí la hora." }, { status: 400 });
    if (donde.length < 3) return Response.json({ ok: false, error: "Escribí dónde se entrega." }, { status: 400 });
    const r = await guardarCena(m.id, { estado: "hay", queHay, dia, hora, donde });
    if (r) after(() => avisar(r.m, r.cena));
    return Response.json(await datosPanel(r?.m ?? m));
  }
  if (c.accion === "suspender") {
    const antes = m.cena;
    const r = await guardarCena(m.id, { estado: "suspendida", queHay: antes?.queHay ?? "", dia: antes?.dia ?? hoyArgentina(), hora: antes?.hora ?? "", donde: antes?.donde ?? m.direccion });
    if (r) after(() => avisar(r.m, r.cena));
    return Response.json(await datosPanel(r?.m ?? m));
  }
  return Response.json({ ok: false }, { status: 400 });
}
