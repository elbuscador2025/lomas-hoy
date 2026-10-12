import { redis, claveDelPanelOk } from "@/lib/servidor";
import {
  hashear, claveValida, usuarioValido, leerUsuario, todosLosAvisos, topeDiario, publicadosHoy, barriosActuales, guardarBarrios, FIRMA_POR_DEFECTO, type UsuarioMuni,
} from "@/lib/municipio";

const limpio = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
const sinSecretos = ({ sal: _sal, hash: _hash, ...u }: UsuarioMuni) => u;

// Mi panel: usuarios del municipio, todos los avisos y el tope diario.
export async function POST(req: Request) {
  const c = await req.json().catch(() => ({}));
  if (!claveDelPanelOk(c.password)) return Response.json({ ok: false }, { status: 401 });

  switch (c.accion) {
    case "listar": {
      const [us] = await redis([["HVALS", "muni:usuarios"]]);
      return Response.json({
        ok: true,
        usuarios: (us as string[]).map((j) => sinSecretos(JSON.parse(j))),
        avisos: await todosLosAvisos(),
        tope: await topeDiario(),
        barrios: (await barriosActuales()).filter((b) => b !== "Todo Lomas"),
        publicadosHoy: await publicadosHoy(),
      });
    }
    case "crearUsuario": {
      const usuario = limpio(c.usuario, 30).toLowerCase();
      if (!usuarioValido(usuario)) return Response.json({ ok: false, error: "Usuario: 3 a 30 letras minúsculas, números, punto o guion." }, { status: 400 });
      if (!claveValida(c.clave)) return Response.json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
      if (await leerUsuario(usuario)) return Response.json({ ok: false, error: "Ese usuario ya existe." }, { status: 409 });
      const u: UsuarioMuni = { usuario, nombre: limpio(c.nombre, 60) || usuario, firma: limpio(c.firma, 60) || FIRMA_POR_DEFECTO, activo: true, ...(await hashear(c.clave)) };
      await redis([["HSET", "muni:usuarios", usuario, JSON.stringify(u)]]);
      return Response.json({ ok: true });
    }
    case "activar": {
      const u = await leerUsuario(limpio(c.usuario, 30));
      if (!u) return Response.json({ ok: false }, { status: 404 });
      await redis([["HSET", "muni:usuarios", u.usuario, JSON.stringify({ ...u, activo: !!c.activo })]]);
      return Response.json({ ok: true });
    }
    case "cambiarClave": {
      const u = await leerUsuario(limpio(c.usuario, 30));
      if (!u) return Response.json({ ok: false }, { status: 404 });
      if (!claveValida(c.clave)) return Response.json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
      await redis([["HSET", "muni:usuarios", u.usuario, JSON.stringify({ ...u, ...(await hashear(c.clave)) })]]);
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
      // los avisos que tenían el nombre viejo pasan al nuevo
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
