import { randomUUID } from "node:crypto";
import { redis } from "@/lib/servidor";
import { esAdmin } from "@/lib/cuentas";
import { CLAVE_ACTIVIDADES, CLAVE_CENTROS, type Actividad, type Centro } from "@/lib/jubilados";
import { todasActividades, todosCentros } from "@/lib/jubilados-servidor";

// Mi panel → pestaña Jubilados: agregar, editar y desactivar centros de jubilados y actividades.
const limpiar = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const url = (v: unknown) => { const t = limpiar(v, 300); return /^https?:\/\//i.test(t) ? t : ""; };
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n !== 0 ? n : undefined; };

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));

  if (c.accion === "listar") return Response.json({ ok: true, centros: await todosCentros(), actividades: await todasActividades() });

  if (c.accion === "guardar-centro") {
    const i = c.centro ?? {};
    const nombre = limpiar(i.nombre, 120);
    if (nombre.length < 3) return Response.json({ ok: false, error: "Escribí el nombre del centro." }, { status: 400 });
    const id = limpiar(i.id, 20) || randomUUID().slice(0, 10);
    const [previo] = await redis([["HGET", CLAVE_CENTROS, id]]);
    const antes = previo ? (JSON.parse(String(previo)) as Centro) : null;
    const lat = num(i.lat) ?? antes?.lat, lng = num(i.lng) ?? antes?.lng;
    const nuevo: Centro = {
      id, nombre, direccion: limpiar(i.direccion, 160), barrio: limpiar(i.barrio, 60), ...(lat && lng ? { lat, lng } : {}),
      actividades: limpiar(i.actividades, 300), horarios: limpiar(i.horarios, 300), telefono: limpiar(i.telefono, 40),
      fuente: limpiar(i.fuente, 120), fuenteUrl: url(i.fuenteUrl), activo: i.activo !== false, actualizado: new Date().toISOString(),
    };
    await redis([["HSET", CLAVE_CENTROS, id, JSON.stringify(nuevo)]]);
    return Response.json({ ok: true, id });
  }

  if (c.accion === "guardar-actividad") {
    const i = c.actividad ?? {};
    const titulo = limpiar(i.titulo, 120);
    if (titulo.length < 3) return Response.json({ ok: false, error: "Escribí el nombre de la actividad." }, { status: 400 });
    const id = limpiar(i.id, 20) || randomUUID().slice(0, 10);
    const nueva: Actividad = {
      id, titulo, descripcion: limpiar(i.descripcion, 400), donde: limpiar(i.donde, 200), cuando: limpiar(i.cuando, 200), telefono: limpiar(i.telefono, 40),
      fuente: limpiar(i.fuente, 120), fuenteUrl: url(i.fuenteUrl), activa: i.activa !== false, actualizado: new Date().toISOString(),
    };
    await redis([["HSET", CLAVE_ACTIVIDADES, id, JSON.stringify(nueva)]]);
    return Response.json({ ok: true, id });
  }

  if (c.accion === "activar-centro" || c.accion === "activar-actividad") {
    const clave = c.accion === "activar-centro" ? CLAVE_CENTROS : CLAVE_ACTIVIDADES, id = limpiar(c.id, 20);
    const [x] = await redis([["HGET", clave, id]]);
    if (!x) return Response.json({ ok: false }, { status: 404 });
    const campo = c.accion === "activar-centro" ? "activo" : "activa";
    await redis([["HSET", clave, id, JSON.stringify({ ...JSON.parse(String(x)), [campo]: !!c.valor, actualizado: new Date().toISOString() })]]);
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 400 });
}
