import { redis, hoyArgentina, claveDelPanelOk } from "@/lib/servidor";
import { todasLasSuscripciones, enviarPrueba, TIPOS } from "@/lib/push";

// Mi panel: cuántos celulares tienen avisos, cuántas notificaciones salieron, y el botón de prueba.
export async function POST(req: Request) {
  const c = await req.json().catch(() => ({}));
  if (!claveDelPanelOk(c.password)) return Response.json({ ok: false }, { status: 401 });

  if (c.accion === "prueba") {
    const r = await enviarPrueba(String(c.endpoint ?? ""));
    return Response.json({ ok: r.ok, mensaje: r.ok ? "Enviada. Debería llegarte en unos segundos." : `No se pudo enviar. ${"mensaje" in r ? r.mensaje : ""}` });
  }

  const subs = await todasLasSuscripciones();
  const porBarrio: Record<string, number> = {};
  const porTipo: Record<string, number> = Object.fromEntries(TIPOS.map((t) => [t, 0]));
  for (const s of subs) {
    porBarrio[s.barrio] = (porBarrio[s.barrio] ?? 0) + 1;
    for (const t of TIPOS) if (s.tipos[t]) porTipo[t]++;
  }
  const dias = Array.from({ length: 14 }, (_, i) => hoyArgentina(new Date(Date.now() - i * 86400_000)));
  const r = await redis([...dias.map((d) => ["HMGET", `push:dia:${d}`, "enviados", "fallidos"]), ["LRANGE", "push:log", 0, 19]]);
  return Response.json({
    ok: true,
    total: subs.length,
    porBarrio: Object.entries(porBarrio).sort((a, b) => b[1] - a[1]),
    porTipo,
    dias: dias.map((dia, i) => {
      const [e, f] = (r[i] as (string | null)[]) ?? [];
      return { dia, enviados: Number(e) || 0, fallidos: Number(f) || 0 };
    }).filter((d) => d.enviados || d.fallidos),
    registro: (r[dias.length] as string[]).map((x) => JSON.parse(x)),
  });
}
