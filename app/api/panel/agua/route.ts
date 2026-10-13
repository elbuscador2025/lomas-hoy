import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { config } from "@/lomas.config.mjs";
import { redis } from "@/lib/servidor";
import { esAdmin } from "@/lib/cuentas";
import { ahoraAR } from "@/lib/avisos";
import { evaluarAgua } from "@/lib/eventos";
import { aguaVisible, type CorteManual } from "@/lib/agua";

// Mi panel → pestaña Agua: carga a mano de un corte (AySA no tiene una fuente pública que se pueda leer sola).
const limpiar = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const FECHA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  if (c.accion === "visible") {
    await redis([["SET", "agua:visible", c.valor ? "1" : "0"]]);
    if (c.valor) after(() => evaluarAgua().catch((e) => console.error("push agua", e)));
    return Response.json({ ok: true });
  }
  if (c.accion === "listar") {
    const [x] = await redis([["HVALS", "agua"]]);
    return Response.json({ ok: true, visible: await aguaVisible(), cortes: (x as string[]).map((j) => JSON.parse(j) as CorteManual).sort((a, b) => b.desde.localeCompare(a.desde)) });
  }
  if (c.accion === "borrar") {
    await redis([["HDEL", "agua", limpiar(c.id, 20)]]);
    return Response.json({ ok: true });
  }
  if (c.accion === "agregar") {
    const localidad = limpiar(c.localidad, 60), zona = limpiar(c.zona, 160), motivo = limpiar(c.motivo, 160);
    const desde = String(c.desde ?? ""), hasta = String(c.hasta ?? "");
    if (!config.localidades.includes(localidad)) return Response.json({ ok: false, error: "Elegí la localidad de la lista." }, { status: 400 });
    if (zona.length < 3) return Response.json({ ok: false, error: "Escribí las calles o la zona afectada." }, { status: 400 });
    if (!FECHA.test(desde) || !FECHA.test(hasta) || Number.isNaN(Date.parse(desde)) || Number.isNaN(Date.parse(hasta))) return Response.json({ ok: false, error: "Poné desde y hasta cuándo es el corte." }, { status: 400 });
    if (hasta <= desde) return Response.json({ ok: false, error: "El “hasta” tiene que ser después del “desde”." }, { status: 400 });
    if (hasta < ahoraAR()) return Response.json({ ok: false, error: "Ese corte ya terminó." }, { status: 400 });
    const id = randomUUID().slice(0, 10);
    const corte: CorteManual = { id, localidad, zona, desde, hasta, motivo, creado: new Date().toISOString() };
    // Se borran los cortes cargados que terminaron hace más de una semana
    const [x] = await redis([["HVALS", "agua"]]);
    const limite = ahoraAR(new Date(Date.now() - 7 * 86400_000));
    const viejos = (x as string[]).map((j) => JSON.parse(j) as CorteManual).filter((k) => k.hasta < limite);
    await redis([["HSET", "agua", id, JSON.stringify(corte)], ...viejos.map((k) => ["HDEL", "agua", k.id])]);
    after(() => evaluarAgua().catch((e) => console.error("push agua", e)));
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 400 });
}
