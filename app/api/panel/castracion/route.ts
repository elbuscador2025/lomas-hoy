import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { redis } from "@/lib/servidor";
import { esAdmin } from "@/lib/cuentas";
import type { Jornada } from "@/lib/castracion";
import { avisarJornada } from "@/lib/castracion-aviso";

// Mi panel → pestaña "Castraciones": cargar, editar y borrar jornadas a mano.
const hora = (v: unknown) => { const t = String(v ?? "").trim(); return /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : ""; };
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
    const j: Jornada = { id: limpio(c.id, 40) || randomUUID().slice(0, 10), fecha: limpio(c.fecha, 10), desde: hora(c.desde), hasta: hora(c.hasta), horario: "", direccion: limpio(c.direccion, 140), barrio: limpio(c.barrio, 60), requisitos: limpio(c.requisitos, 400), modalidad: limpio(c.modalidad, 160) };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(j.fecha)) return Response.json({ ok: false, error: "Elegí la fecha." }, { status: 400 });
    if (!j.desde || !j.hasta) return Response.json({ ok: false, error: "Elegí la hora de inicio y la de fin." }, { status: 400 });
    j.horario = `de ${j.desde.replace(/^0/, "")} a ${j.hasta.replace(/^0/, "")} hs`;
    if (j.direccion.length < 3) return Response.json({ ok: false, error: "Escribí la dirección." }, { status: 400 });
    if (j.barrio.length < 2) return Response.json({ ok: false, error: "Escribí el barrio." }, { status: 400 });
    const [existia] = await redis([["HEXISTS", "castracion", j.id]]);
    await redis([["HSET", "castracion", j.id, JSON.stringify(j)]]);
    if (!existia) after(() => avisarJornada(j)); // solo las jornadas nuevas: si la edito, no se avisa de nuevo
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 400 });
}
