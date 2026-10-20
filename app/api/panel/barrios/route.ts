import { esAdmin } from "@/lib/cuentas";
import { barriosActuales, guardarBarrios } from "@/lib/barrios";

const limpio = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);

// Mi panel → pestaña Barrios: agregar, renombrar y quitar ("Todo Lomas" siempre está y no se toca).
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  const lista = (await barriosActuales()).filter((b) => b !== "Todo Lomas");
  switch (c.accion) {
    case "listar": return Response.json({ ok: true, barrios: lista });
    case "agregarBarrio": {
      const nombre = limpio(c.nombre, 40);
      if (!nombre || nombre.toLowerCase() === "todo lomas") return Response.json({ ok: false, error: "Poné un nombre." }, { status: 400 });
      if (lista.some((b) => b.toLowerCase() === nombre.toLowerCase())) return Response.json({ ok: false, error: "Ese barrio ya está." }, { status: 409 });
      await guardarBarrios([...lista, nombre]);
      return Response.json({ ok: true });
    }
    case "renombrarBarrio": {
      const viejo = limpio(c.viejo, 40), nuevo = limpio(c.nuevo, 40);
      if (!lista.includes(viejo) || !nuevo || nuevo.toLowerCase() === "todo lomas") return Response.json({ ok: false, error: "No se pudo renombrar." }, { status: 400 });
      if (lista.some((b) => b !== viejo && b.toLowerCase() === nuevo.toLowerCase())) return Response.json({ ok: false, error: "Ese nombre ya existe." }, { status: 409 });
      await guardarBarrios(lista.map((b) => (b === viejo ? nuevo : b)));
      return Response.json({ ok: true });
    }
    case "quitarBarrio": {
      const nombre = limpio(c.nombre, 40);
      await guardarBarrios(lista.filter((b) => b !== nombre));
      return Response.json({ ok: true });
    }
  }
  return Response.json({ ok: false }, { status: 400 });
}
