import { esAdmin } from "@/lib/cuentas";
import { redis } from "@/lib/servidor";

// Mi panel: lo que la gente buscó y no encontró en los últimos 30 días, con cuántas veces (sin datos personales).
export async function POST(req: Request) {
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const dias = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - 3 * 3600_000 - i * 86400_000).toISOString().slice(0, 10));
  const filas = await redis(dias.map((d) => ["HGETALL", `busq:${d}`]));
  const suma = new Map<string, number>();
  for (const f of filas) {
    const plano = (Array.isArray(f) ? f : []) as string[];
    for (let i = 0; i < plano.length; i += 2) suma.set(plano[i], (suma.get(plano[i]) ?? 0) + Number(plano[i + 1]));
  }
  const lista = [...suma.entries()].map(([texto, veces]) => ({ texto, veces })).sort((a, b) => b.veces - a.veces || a.texto.localeCompare(b.texto, "es")).slice(0, 60);
  return Response.json({ ok: true, lista, total: [...suma.values()].reduce((t, n) => t + n, 0) });
}
