import { esAdmin } from "@/lib/cuentas";

// Temporal: crea (una sola vez) la programación del despertador en QStash. Solo para mí (panel). No devuelve claves.
export async function POST(req: Request) {
  if (!(await esAdmin(req))) return Response.json({ ok: false }, { status: 401 });
  const base = (process.env.QSTASH_URL ?? "https://qstash.upstash.io").replace(/\/$/, ""), token = process.env.QSTASH_TOKEN;
  if (!token) return Response.json({ ok: false, error: "falta QSTASH_TOKEN" });
  const destino = "https://lomas-hoy.vercel.app/api/actualizar";
  const h = { Authorization: `Bearer ${token}` };
  const lista = await (await fetch(`${base}/v2/schedules`, { headers: h })).json().catch(() => []);
  const previos = (Array.isArray(lista) ? lista : []).filter((s: { destination?: string }) => s.destination === destino);
  if (previos.length) return Response.json({ ok: true, yaExistia: true, programaciones: previos.map((s: { scheduleId: string; cron: string }) => ({ id: s.scheduleId, cron: s.cron })) });
  const r = await fetch(`${base}/v2/schedules/${destino}`, { method: "POST", headers: { ...h, "Upstash-Cron": "*/15 * * * *", "Content-Type": "application/json" }, body: "{}" });
  return Response.json({ ok: r.ok, estado: r.status, respuesta: await r.json().catch(() => null) });
}
