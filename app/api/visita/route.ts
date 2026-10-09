import { db, hoyArgentina } from "@/lib/servidor";

export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || id.length < 8 || id.length > 64) return Response.json({ ok: false }, { status: 400 });
  const r = await db("visitas?on_conflict=dia,visitante", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({ dia: hoyArgentina(), visitante: id }),
  });
  return Response.json({ ok: r.ok });
}
