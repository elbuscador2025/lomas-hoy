import { randomUUID } from "node:crypto";
import { redis } from "@/lib/servidor";
import { esAdmin } from "@/lib/cuentas";
import { OFICINAS_ANSES, ordenarOficinas } from "@/lib/ansesof";

// Mi panel → pestaña "Oficinas ANSES": agregar, editar y borrar a mano.
const limpio = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, n);
const numero = (v: unknown) => { const n = Number(v); return v !== "" && v != null && Number.isFinite(n) ? n : undefined; };
const sembrar = () => ["HSET", "ansesof", ...OFICINAS_ANSES.flatMap((o) => [o.id, JSON.stringify(o)])];

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  const [vals, sembrado] = await redis([["HVALS", "ansesof"], ["GET", "ansesof:sembrado"]]);
  if (c.accion === "listar") return Response.json({ ok: true, oficinas: sembrado ? ordenarOficinas((vals as string[]).map((j) => JSON.parse(j))) : OFICINAS_ANSES });
  if (c.accion === "borrar") {
    await redis([...(sembrado ? [] : [sembrar()]), ["HDEL", "ansesof", limpio(c.id, 40)], ["SET", "ansesof:sembrado", "1"]]);
    return Response.json({ ok: true });
  }
  if (c.accion === "guardar") {
    const o = { id: limpio(c.id, 40) || randomUUID().slice(0, 10), nombre: limpio(c.nombre, 80), direccion: limpio(c.direccion, 120), localidad: limpio(c.localidad, 60), horario: limpio(c.horario, 80), lat: numero(c.lat), lng: numero(c.lng) };
    if (o.nombre.length < 2) return Response.json({ ok: false, error: "Escribí el nombre." }, { status: 400 });
    if (o.direccion.length < 3) return Response.json({ ok: false, error: "Escribí la dirección." }, { status: 400 });
    await redis([...(sembrado ? [] : [sembrar()]), ["HSET", "ansesof", o.id, JSON.stringify(o)], ["SET", "ansesof:sembrado", "1"]]);
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 400 });
}
