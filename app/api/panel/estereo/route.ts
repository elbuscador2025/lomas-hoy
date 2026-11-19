import { esAdmin } from "@/lib/cuentas";
import { leerCancion, guardarCancion, quitarCancion } from "@/lib/estereo";
import { NOMBRE_CANCION_ORIGINAL, URL_CANCION_ORIGINAL } from "@/lib/estereo-comun";

// Mi panel → Estéreo: ver qué canción está cargada, confirmar la que acabo de subir y volver a la original.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  switch (c.accion) {
    case "leer": {
      const actual = await leerCancion();
      if (actual) return Response.json({ ok: true, actual: { ...actual, original: false } });
      let tam = 0;
      try { tam = Number((await fetch(new URL(URL_CANCION_ORIGINAL, req.url), { method: "HEAD" })).headers.get("content-length")) || 0; } catch {}
      return Response.json({ ok: true, actual: { url: URL_CANCION_ORIGINAL, nombre: NOMBRE_CANCION_ORIGINAL, tam, subido: "", original: true } });
    }
    case "guardar": return Response.json(await guardarCancion(c.url, c.nombre));
    case "original": await quitarCancion(); return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 400 });
}
