import { redis, hoyArgentina } from "@/lib/servidor";

// Público: calendario de pagos de ANSES cargado desde mi panel (del mes en curso en adelante).
export async function GET() {
  try {
    const [x, act] = await redis([["HVALS", "anses"], ["GET", "anses:actualizado"]]);
    const desde = hoyArgentina().slice(0, 8) + "01";
    const entradas = (x as string[]).map((j) => JSON.parse(j)).filter((e: { fecha: string }) => e.fecha >= desde)
      .sort((a: { fecha: string }, b: { fecha: string }) => a.fecha.localeCompare(b.fecha));
    return Response.json({ entradas, actualizado: act ?? null }, { headers: { "Cache-Control": "public, s-maxage=60" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}
