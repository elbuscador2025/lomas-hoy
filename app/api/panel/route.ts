import { redis, hoyArgentina } from "@/lib/servidor";
import { esAdmin } from "@/lib/cuentas";
import { estadoControles } from "@/lib/controles";

export async function POST(req: Request) {
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const dias = Array.from({ length: 30 }, (_, i) => hoyArgentina(new Date(Date.now() - i * 86400_000)));
  const r = await redis([
    ...dias.flatMap((d) => [["SCARD", `v:${d}`], ["SCARD", `vuelve:${d}`]] as (string | number)[][]),
    ["HLEN", "primero"],
    ["SCARD", "volvieron"],
    ["LRANGE", "reportes", 0, 99],
    ["LRANGE", "actualizacion:log", 0, 7],
    ["HVALS", "push:subs"],
    ["SETNX", "app:desde", hoyArgentina()], // la fecha desde la que se cuenta la app instalada (queda fija la primera vez)
    ["GET", "app:desde"],
    ["SCARD", "app:instalada"],
    ...dias.map((d) => ["SCARD", `app:${d}`] as (string | number)[]),
  ]);
  const n = dias.length * 2;
  return Response.json({
    ok: true,
    dias: dias.map((dia, i) => ({ dia, visitantes: r[i * 2], volvieron: r[i * 2 + 1], app: r[n + 8 + i] })).filter((d) => d.visitantes),
    resumen: { visitantes_totales: r[n], volvieron_otro_dia: r[n + 1] },
    appInstalada: { total: r[n + 7], desde: r[n + 6] },
    celularesConAvisos: (r[n + 4] as string[]).filter((j) => { try { return JSON.parse(j).equipo !== "compu"; } catch { return true; } }).length,
    reportes: (r[n + 2] as string[]).map((x) => JSON.parse(x)),
    corridas: (r[n + 3] as string[]).map((x) => JSON.parse(x)), // las últimas actualizaciones de datos: { t, o }
    quiniela: await estadoControles().catch(() => null), // último control de la Quiniela y lo que no coincidió hoy
  });
}
