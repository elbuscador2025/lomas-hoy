import { redis } from "@/lib/servidor";
import { esAdmin } from "@/lib/cuentas";

// Mi panel → "Sugerencias": de la más nueva a la más vieja, con botón para borrar.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));
  if (c.accion === "listar") {
    const [x] = await redis([["HVALS", "sugerencias"]]);
    return Response.json({ ok: true, sugerencias: (x as string[]).map((j) => JSON.parse(j)).sort((a, b) => b.t.localeCompare(a.t)) });
  }
  if (c.accion === "borrar") {
    await redis([["HDEL", "sugerencias", String(c.id ?? "").slice(0, 20)]]);
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 400 });
}
