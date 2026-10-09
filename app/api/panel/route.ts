import { redis, hoyArgentina, claveDelPanelOk } from "@/lib/servidor";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  if (!claveDelPanelOk(password)) return Response.json({ ok: false }, { status: 401 });
  const dias = Array.from({ length: 30 }, (_, i) => hoyArgentina(new Date(Date.now() - i * 86400_000)));
  const r = await redis([
    ...dias.flatMap((d) => [["SCARD", `v:${d}`], ["SCARD", `vuelve:${d}`]] as (string | number)[][]),
    ["HLEN", "primero"],
    ["SCARD", "volvieron"],
    ["LRANGE", "reportes", 0, 99],
  ]);
  const n = dias.length * 2;
  return Response.json({
    ok: true,
    dias: dias.map((dia, i) => ({ dia, visitantes: r[i * 2], volvieron: r[i * 2 + 1] })).filter((d) => d.visitantes),
    resumen: { visitantes_totales: r[n], volvieron_otro_dia: r[n + 1] },
    reportes: (r[n + 2] as string[]).map((x) => JSON.parse(x)),
  });
}
