import { redis, hoyArgentina } from "@/lib/servidor";

// Guarda solo un número al azar por celu y por día. No hay nombres, ni IP, ni nada personal.
export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || id.length < 8 || id.length > 64) return Response.json({ ok: false }, { status: 400 });
  const dia = hoyArgentina();
  try {
    const [primera, , previo] = await redis([["HSETNX", "primero", id, dia], ["SADD", `v:${dia}`, id], ["HGET", "primero", id]]);
    if (primera === 0 && typeof previo === "string" && previo < dia) {
      await redis([["SADD", `vuelve:${dia}`, id], ["SADD", "volvieron", id]]);
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
