import { randomUUID } from "node:crypto";
import { redis } from "@/lib/servidor";
import { esAdmin } from "@/lib/cuentas";

// Mi panel → pestaña ANSES: carga simple por mes (prestación, terminación de DNI, fecha).
// ANSES no tiene una fuente pública que se pueda leer sola (su sitio bloquea los accesos automáticos).
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  if (c.accion === "listar") {
    const [x] = await redis([["HVALS", "anses"]]);
    return Response.json({ ok: true, entradas: (x as string[]).map((j) => JSON.parse(j)).sort((a, b) => a.fecha.localeCompare(b.fecha)) });
  }
  if (c.accion === "borrar") {
    await redis([["HDEL", "anses", String(c.id ?? "").slice(0, 20)], ["SET", "anses:actualizado", new Date().toISOString()]]);
    return Response.json({ ok: true });
  }
  if (c.accion === "agregar") {
    const prestacion = String(c.prestacion ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80);
    const dnis = [...new Set(String(c.dnis ?? "").replace(/[^0-9]/g, "").split("").map(Number))].sort((a, b) => a - b); // "4 y 5" → [4, 5]
    const fecha = String(c.fecha ?? "");
    if (prestacion.length < 2) return Response.json({ ok: false, error: "Escribí la prestación (por ejemplo Jubilaciones)." }, { status: 400 });
    if (!dnis.length) return Response.json({ ok: false, error: "Poné las terminaciones de DNI (por ejemplo 4 y 5)." }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha))) return Response.json({ ok: false, error: "La fecha no es válida." }, { status: 400 });
    const id = randomUUID().slice(0, 10);
    await redis([["HSET", "anses", id, JSON.stringify({ id, prestacion, dnis, fecha })], ["SET", "anses:actualizado", new Date().toISOString()]]);
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 400 });
}
