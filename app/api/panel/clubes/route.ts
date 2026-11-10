import { randomUUID } from "node:crypto";
import { del } from "@vercel/blob";
import { redis } from "@/lib/servidor";
import { esAdmin } from "@/lib/cuentas";
import { CLAVE_DISC, CLAVE_INST, type Costo, type Institucion } from "@/lib/deportes";
import { disciplinas, todasInstituciones } from "@/lib/deportes-servidor";

// Mi panel → pestaña Deportes: instituciones y disciplinas.
const limpiar = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const url = (v: unknown) => { const t = limpiar(v, 300); return /^https?:\/\//i.test(t) ? t : ""; };

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));

  if (c.accion === "listar") return Response.json({ ok: true, disciplinas: await disciplinas(), instituciones: await todasInstituciones() });

  if (c.accion === "disciplina") {
    const nombre = limpiar(c.nombre, 40);
    if (nombre.length < 3) return Response.json({ ok: false, error: "Escribí el nombre del deporte." }, { status: 400 });
    const lista = await disciplinas();
    if (lista.some((d) => d.toLowerCase() === nombre.toLowerCase())) return Response.json({ ok: false, error: "Ese deporte ya está." }, { status: 400 });
    await redis([["SET", CLAVE_DISC, JSON.stringify([...lista, nombre])]]);
    return Response.json({ ok: true });
  }

  if (c.accion === "guardar") {
    const i = c.institucion ?? {};
    const nombre = limpiar(i.nombre, 120);
    const lista = await disciplinas();
    const discs = (Array.isArray(i.disciplinas) ? i.disciplinas : []).map((d: unknown) => limpiar(d, 40)).filter((d: string) => lista.includes(d));
    if (nombre.length < 3) return Response.json({ ok: false, error: "Escribí el nombre del club." }, { status: 400 });
    if (!discs.length) return Response.json({ ok: false, error: "Elegí al menos un deporte." }, { status: 400 });
    const id = limpiar(i.id, 20) || randomUUID().slice(0, 10);
    const [previo] = await redis([["HGET", CLAVE_INST, id]]);
    const antes = previo ? (JSON.parse(String(previo)) as Institucion) : null;
    const costo: Costo = i.costo === "gratis" || i.costo === "pago" ? i.costo : "";
    const nueva: Institucion = {
      id, nombre, disciplinas: discs, direccion: limpiar(i.direccion, 160), barrio: limpiar(i.barrio, 60), edades: limpiar(i.edades, 80), horarios: limpiar(i.horarios, 300),
      costo, telefono: limpiar(i.telefono, 40), whatsapp: limpiar(i.whatsapp, 40), inscripcion: limpiar(i.inscripcion, 300),
      fuente: limpiar(i.fuente, 120), fuenteUrl: url(i.fuenteUrl), foto: antes?.foto ?? "", activa: i.activa !== false, actualizado: new Date().toISOString(),
    };
    await redis([["HSET", CLAVE_INST, id, JSON.stringify(nueva)]]);
    return Response.json({ ok: true, id });
  }

  if (c.accion === "activar" || c.accion === "quitar-foto") {
    const id = limpiar(c.id, 20);
    const [x] = await redis([["HGET", CLAVE_INST, id]]);
    if (!x) return Response.json({ ok: false }, { status: 404 });
    const i = JSON.parse(String(x)) as Institucion;
    if (c.accion === "activar") await redis([["HSET", CLAVE_INST, id, JSON.stringify({ ...i, activa: !!c.valor, actualizado: new Date().toISOString() })]]);
    else {
      if (i.foto) await del(i.foto).catch(() => {});
      await redis([["HSET", CLAVE_INST, id, JSON.stringify({ ...i, foto: "" })]]);
    }
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 400 });
}
