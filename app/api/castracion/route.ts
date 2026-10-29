import { redis, hoyArgentina } from "@/lib/servidor";
import { vigentes, type Jornada } from "@/lib/castracion";

// Público: solo las jornadas que todavía no pasaron. Las carga el administrador a mano desde el panel.
export async function GET() {
  try {
    const [vals] = await redis([["HVALS", "castracion"]]);
    const todas = (vals as string[]).map((j) => JSON.parse(j) as Jornada);
    return Response.json({ jornadas: vigentes(todas, hoyArgentina()) }, { headers: { "Cache-Control": "public, s-maxage=60" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}
