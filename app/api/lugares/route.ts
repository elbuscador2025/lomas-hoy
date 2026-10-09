import { redis } from "@/lib/servidor";

export async function GET() {
  try {
    const [todos] = await redis([["HVALS", "lugares"]]);
    const lugares = (todos as string[]).map((x) => JSON.parse(x));
    return Response.json(lugares, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}
