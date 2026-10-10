import { randomUUID } from "node:crypto";
import { redis, claveDelPanelOk } from "@/lib/servidor";
import { geocodificar } from "@/scripts/geocodificar.mjs";

const CATEGORIAS = ["veterinarias", "guardias", "salitas", "comisarias", "bomberos", "servicios"];
const texto = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

// Panel: listar, guardar (crear o corregir) y borrar lugares. Pide la contraseña en cada llamada.
export async function POST(req: Request) {
  const { password, accion, lugar, id } = await req.json().catch(() => ({}));
  if (!claveDelPanelOk(password)) return Response.json({ ok: false }, { status: 401 });

  if (accion === "listar") {
    const [todos] = await redis([["HVALS", "lugares"]]);
    return Response.json({ ok: true, lugares: (todos as string[]).map((x) => JSON.parse(x)) });
  }
  if (accion === "borrar" && typeof id === "string") {
    await redis([["HDEL", "lugares", id]]);
    return Response.json({ ok: true });
  }
  if (accion === "guardar" && lugar && CATEGORIAS.includes(lugar.categoria) && texto(lugar.nombre)) {
    const nuevo = {
      id: texto(lugar.id, 80) || randomUUID().slice(0, 8),
      categoria: lugar.categoria,
      nombre: texto(lugar.nombre),
      direccion: texto(lugar.direccion),
      localidad: texto(lugar.localidad),
      telefonos: (Array.isArray(lugar.telefonos) ? lugar.telefonos : []).map((t: unknown) => texto(t, 30)).filter(Boolean),
      horario: texto(lugar.horario),
      etiqueta: texto(lugar.etiqueta, 40),
      fuente: texto(lugar.fuente),
      fuenteUrl: texto(lugar.fuenteUrl, 400),
    } as Record<string, unknown>;
    // Coordenadas solo para ordenar por cercanía: se buscan si hay dirección y todavía no hay.
    const coordenadas = Number.isFinite(lugar.lat) && Number.isFinite(lugar.lng) ? { lat: lugar.lat, lng: lugar.lng } : null;
    const direccionCambio = !coordenadas || lugar.direccionCambio;
    const c = direccionCambio && nuevo.direccion ? await geocodificar(nuevo.direccion as string, nuevo.localidad as string) : coordenadas;
    if (c) Object.assign(nuevo, c);
    await redis([["HSET", "lugares", nuevo.id as string, JSON.stringify(nuevo)]]);
    return Response.json({ ok: true, lugar: nuevo });
  }
  return Response.json({ ok: false }, { status: 400 });
}
