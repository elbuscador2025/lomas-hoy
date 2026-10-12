import { redis } from "@/lib/servidor";
import { esAdmin, crearEnlace, cerrarSesionesDe } from "@/lib/cuentas";
import { todosLosAvisos, topeDiario, publicadosHoy, barriosActuales, guardarBarrios, leerUsuario, type UsuarioMuni } from "@/lib/municipio";

const limpio = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
const sinSecretos = ({ sal: _sal, hash: _hash, ...u }: UsuarioMuni) => u;

// Mi panel → pestaña Municipio: gente, invitaciones, barrios, avisos y tope diario.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  const origen = new URL(req.url).origin;

  switch (c.accion) {
    case "listar": {
      const [us] = await redis([["HVALS", "muni:usuarios"]]);
      const avisos = await todosLosAvisos();
      return Response.json({
        ok: true,
        usuarios: (us as string[]).map((j) => {
          const u = sinSecretos(JSON.parse(j));
          return { ...u, avisos: avisos.filter((a) => a.autor === u.usuario).length };
        }),
        avisos,
        tope: await topeDiario(),
        barrios: (await barriosActuales()).filter((b) => b !== "Todo Lomas"),
        publicadosHoy: await publicadosHoy(),
      });
    }
    // Enlace para que una persona del municipio se registre: sirve una sola vez y vence a los 7 días
    case "invitar": {
      const token = await crearEnlace("invitacion", { creada: new Date().toISOString() }, 7 * 86400);
      return Response.json({ ok: true, url: `${origen}/invitacion/${token}` });
    }
    // Enlace para que una persona elija una contraseña nueva: una sola vez, vence a las 24 horas
    case "nuevaClave": {
      const u = await leerUsuario(limpio(c.usuario, 80));
      if (!u) return Response.json({ ok: false }, { status: 404 });
      const token = await crearEnlace("reset", { usuario: u.usuario }, 86400);
      return Response.json({ ok: true, url: `${origen}/restablecer/${token}` });
    }
    // Dar de baja (o volver a dar de alta). La baja cierra sus sesiones.
    case "activar": {
      const u = await leerUsuario(limpio(c.usuario, 80));
      if (!u) return Response.json({ ok: false }, { status: 404 });
      await redis([["HSET", "muni:usuarios", u.usuario, JSON.stringify({ ...u, activo: !!c.activo })]]);
      if (!c.activo) await cerrarSesionesDe("muni", u.usuario);
      return Response.json({ ok: true });
    }
    case "borrarAviso": {
      await redis([["HDEL", "avisos", limpio(c.id, 40)]]);
      return Response.json({ ok: true });
    }
    // Barrios: agregar, renombrar y quitar ("Todo Lomas" siempre está y no se toca)
    case "agregarBarrio": {
      const nombre = limpio(c.nombre, 40);
      const lista = (await barriosActuales()).filter((b) => b !== "Todo Lomas");
      if (!nombre || nombre.toLowerCase() === "todo lomas") return Response.json({ ok: false, error: "Poné un nombre." }, { status: 400 });
      if (lista.some((b) => b.toLowerCase() === nombre.toLowerCase())) return Response.json({ ok: false, error: "Ese barrio ya está." }, { status: 409 });
      await guardarBarrios([...lista, nombre]);
      return Response.json({ ok: true });
    }
    case "renombrarBarrio": {
      const viejo = limpio(c.viejo, 40), nuevo = limpio(c.nuevo, 40);
      const lista = (await barriosActuales()).filter((b) => b !== "Todo Lomas");
      if (!lista.includes(viejo) || !nuevo || nuevo.toLowerCase() === "todo lomas") return Response.json({ ok: false, error: "No se pudo renombrar." }, { status: 400 });
      if (lista.some((b) => b !== viejo && b.toLowerCase() === nuevo.toLowerCase())) return Response.json({ ok: false, error: "Ese nombre ya existe." }, { status: 409 });
      await guardarBarrios(lista.map((b) => (b === viejo ? nuevo : b)));
      for (const a of await todosLosAvisos()) if (a.zona === viejo) await redis([["HSET", "avisos", a.id, JSON.stringify({ ...a, zona: nuevo })]]);
      return Response.json({ ok: true });
    }
    case "quitarBarrio": {
      const nombre = limpio(c.nombre, 40);
      await guardarBarrios((await barriosActuales()).filter((b) => b !== "Todo Lomas" && b !== nombre));
      return Response.json({ ok: true });
    }
    case "tope": {
      const n = Number(c.tope);
      if (!Number.isInteger(n) || n < 0 || n > 100) return Response.json({ ok: false, error: "Poné un número entre 0 y 100." }, { status: 400 });
      await redis([["SET", "muni:tope", n]]);
      return Response.json({ ok: true });
    }
  }
  return Response.json({ ok: false }, { status: 400 });
}
