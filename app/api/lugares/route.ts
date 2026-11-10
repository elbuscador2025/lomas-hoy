import { redis } from "@/lib/servidor";
import { datosDeportes } from "@/lib/deportes-servidor";

export async function GET(req: Request) {
  try {
    // Con ?guia=chicos devuelve la guía de Deportes para chicos (por la misma dirección que ya usa la app para los lugares)
    if (new URL(req.url).searchParams.get("guia") === "chicos") return Response.json(await datosDeportes(), { headers: { "Cache-Control": "public, s-maxage=60" } });
    const [todos] = await redis([["HVALS", "lugares"]]);
    const lugares = (todos as string[]).map((x) => JSON.parse(x));
    return Response.json(lugares, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}
