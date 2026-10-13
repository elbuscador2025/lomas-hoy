import { redis } from "@/lib/servidor";
import { asegurarClima } from "@/lib/clima";
import { filaAgua } from "@/lib/agua";

const CLAVES = ["tren", "luz", "colectivos", "programados"];

export async function GET() {
  try {
    const filas = await redis([...CLAVES, "clima", "pronostico"].map((k) => ["GET", `datos:${k}`]));
    const [tren, luz, colectivos, programados, climaGuardado, pronostico] = filas.map((f) => (f ? JSON.parse(f as string) : null));
    const clima = await asegurarClima(climaGuardado, pronostico).catch(() => climaGuardado);
    // Cache corto en la red de Vercel: el clima, que se renueva a los 4 min, nunca llega a los 10.
    const agua = await filaAgua().catch(() => null);
    return Response.json([tren, luz, colectivos, programados, agua, clima].filter(Boolean), { headers: { "Cache-Control": "public, s-maxage=60" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}
