import { redis } from "@/lib/servidor";

const CLAVES = ["tren", "luz", "clima", "colectivos"];

export async function GET() {
  try {
    const filas = await redis(CLAVES.map((k) => ["GET", `datos:${k}`]));
    const datos = filas.filter(Boolean).map((f) => JSON.parse(f as string));
    return Response.json(datos, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}
