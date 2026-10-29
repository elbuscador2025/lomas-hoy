import { randomUUID } from "node:crypto";
import { redis } from "@/lib/servidor";
import { esAdmin } from "@/lib/cuentas";
import type { Jornada } from "@/lib/castracion";

// Mi panel → pestaña "Castraciones": cargar, editar y borrar jornadas a mano.
const limpio = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n);

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  if (c.accion === "listar") {
    const [vals] = await redis([["HVALS", "castracion"]]);
    const lista = (vals as string[]).map((j) => JSON.parse(j) as Jornada).sort((a, b) => a.fecha.localeCompare(b.fecha));
    return Response.json({ ok: true, jornadas: lista });
  }
  if (c.accion === "borrar") {
    await redis([["HDEL", "castracion", limpio(c.id, 40)]]);
    return Response.json({ ok: true });
  }
  if (c.accion === "guardar") {
    const j: Jornada = { id: limpio(c.id, 40) || randomUUID().slice(0, 10), fecha: limpio(c.fecha, 10), horario: limpio(c.horario, 60), direccion: limpio(c.direccion, 140), barrio: limpio(c.barrio, 60), requisitos: limpio(c.requisitos, 400), modalidad: limpio(c.modalidad, 160) };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(j.fecha)) return Response.json({ ok: false, error: "Elegí la fecha." }, { status: 400 });
    if (j.direccion.length < 3) return Response.json({ ok: false, error: "Escribí la dirección." }, { status: 400 });
    if (j.barrio.length < 2) return Response.json({ ok: false, error: "Escribí el barrio." }, { status: 400 });
    await redis([["HSET", "castracion", j.id, JSON.stringify(j)]]);
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 400 });
}
