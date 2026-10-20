import { redis, hoyArgentina } from "@/lib/servidor";
import { esAdmin } from "@/lib/cuentas";
import { todasLasSuscripciones, enviarPrueba } from "@/lib/push";
import { enviarResumenAhora } from "@/lib/resumen";

// Mi panel: cuántos celulares tienen avisos, cuántas notificaciones salieron, y el botón de prueba.
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false }, { status: 415 });
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const c = await req.json().catch(() => ({}));

  if (c.accion === "prueba") {
    const r = await enviarPrueba(String(c.endpoint ?? ""));
    return Response.json({ ok: r.ok, mensaje: r.ok ? "Enviada. Debería llegarte en unos segundos." : `No se pudo enviar. ${"mensaje" in r ? r.mensaje : ""}` });
  }

  if (c.accion === "resumen") {
    const r = await enviarResumenAhora(String(c.endpoint ?? ""));
    return Response.json({ ok: r.ok, mensaje: r.ok ? "Enviado. Debería llegarte en unos segundos." : `No se pudo enviar. ${"mensaje" in r ? r.mensaje : ""}` });
  }

  const subs = await todasLasSuscripciones();
  const dias = Array.from({ length: 14 }, (_, i) => hoyArgentina(new Date(Date.now() - i * 86400_000)));
  const r = await redis([...dias.map((d) => ["HMGET", `push:dia:${d}`, "enviados", "fallidos"]), ["LRANGE", "push:log", 0, 19]]);
  return Response.json({
    ok: true,
    total: subs.length,
    dias: dias.map((dia, i) => {
      const [e, f] = (r[i] as (string | null)[]) ?? [];
      return { dia, enviados: Number(e) || 0, fallidos: Number(f) || 0 };
    }).filter((d) => d.enviados || d.fallidos),
    registro: (r[dias.length] as string[]).map((x) => JSON.parse(x)),
  });
}
