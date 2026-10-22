import { randomUUID } from "node:crypto";
import { redis } from "@/lib/servidor";
import { esAdmin } from "@/lib/cuentas";
import { COOP_OFICIALES, ordenarCoop } from "@/lib/coop";

// Mi panel → pestaña COOP: agregar, editar y borrar a mano.
const limpio = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, n);
const sembrar = () => ["HSET", "coop", ...COOP_OFICIALES.flatMap((o) => [o.id, JSON.stringify(o)])]; // por si el panel se usa antes de que alguien abra la app

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  const [vals, sembrado] = await redis([["HVALS", "coop"], ["GET", "coop:sembrado"]]);
  if (c.accion === "listar") {
    return Response.json({ ok: true, coop: sembrado ? ordenarCoop((vals as string[]).map((j) => JSON.parse(j))) : COOP_OFICIALES });
  }
  if (c.accion === "borrar") {
    await redis([...(sembrado ? [] : [sembrar()]), ["HDEL", "coop", limpio(c.id, 40)], ["SET", "coop:sembrado", "1"]]);
    return Response.json({ ok: true });
  }
  if (c.accion === "guardar") {
    const coop = { id: limpio(c.id, 40) || randomUUID().slice(0, 10), barrio: limpio(c.barrio, 60), direccion: limpio(c.direccion, 120), horario: limpio(c.horario, 120), telefono: limpio(c.telefono, 30), whatsapp: limpio(c.whatsapp, 30) };
    if (coop.barrio.length < 2) return Response.json({ ok: false, error: "Escribí el barrio." }, { status: 400 });
    if (coop.direccion.length < 3) return Response.json({ ok: false, error: "Escribí la dirección." }, { status: 400 });
    await redis([...(sembrado ? [] : [sembrar()]), ["HSET", "coop", coop.id, JSON.stringify(coop)], ["SET", "coop:sembrado", "1"]]);
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 400 });
}
