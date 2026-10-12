import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { notificarAviso } from "@/lib/eventos";
import { redis } from "@/lib/servidor";
import { usuarioDeSesion } from "@/lib/cuentas";
import {
  todosLosAvisos, validarAviso, reservarCupo, topeDiario, publicadosHoy, barriosActuales, FIRMA_POR_DEFECTO, type Aviso,
} from "@/lib/municipio";

// Historial: se ven todos los avisos (con fecha), pero cada usuario edita o borra solo los suyos.
export async function GET(req: Request) {
  const u = await usuarioDeSesion(req);
  if (!u) return Response.json({ ok: false }, { status: 401 });
  const avisos = (await todosLosAvisos()).map(({ autor, ...a }) => ({ ...a, propio: autor === u.usuario }));
  return Response.json({
    ok: true, usuario: { nombre: u.nombre, firma: u.firma || FIRMA_POR_DEFECTO }, avisos, zonas: await barriosActuales(),
    cupo: { publicadosHoy: await publicadosHoy(), tope: await topeDiario() },
  });
}

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  const u = await usuarioDeSesion(req);
  if (!u) return Response.json({ ok: false, error: "Tu sesión venció. Volvé a ingresar." }, { status: 401 });
  const cuerpo = await req.json().catch(() => ({}));

  if (cuerpo.accion === "borrar" && typeof cuerpo.id === "string") {
    const previo = (await todosLosAvisos()).find((a) => a.id === cuerpo.id);
    if (!previo || previo.autor !== u.usuario) return Response.json({ ok: false, error: "No se encontró el aviso." }, { status: 404 });
    await redis([["HDEL", "avisos", previo.id]]);
    return Response.json({ ok: true });
  }

  if (cuerpo.accion === "guardar") {
    const v = validarAviso(cuerpo, await barriosActuales());
    if ("error" in v) return Response.json({ ok: false, error: v.error }, { status: 400 });
    let aviso: Aviso;
    if (typeof cuerpo.id === "string" && cuerpo.id) {
      const previo = (await todosLosAvisos()).find((a) => a.id === cuerpo.id);
      if (!previo || previo.autor !== u.usuario) return Response.json({ ok: false, error: "No se encontró el aviso." }, { status: 404 });
      aviso = { ...previo, ...v.ok, editado: new Date().toISOString() };
    } else {
      if (!(await reservarCupo())) {
        return Response.json({ ok: false, error: "Se llegó al tope de avisos de hoy para todo el municipio. Probá mañana." }, { status: 429 });
      }
      aviso = { id: randomUUID().slice(0, 12), ...v.ok, firma: u.firma || FIRMA_POR_DEFECTO, autor: u.usuario, creado: new Date().toISOString() };
    }
    await redis([["HSET", "avisos", aviso.id, JSON.stringify(aviso)]]);
    // Solo los avisos nuevos notifican, y después de responder: publicar no depende del envío.
    if (!cuerpo.id) after(() => notificarAviso(aviso).catch((e) => console.error("push aviso", e)));
    return Response.json({ ok: true, aviso });
  }
  return Response.json({ ok: false }, { status: 400 });
}
