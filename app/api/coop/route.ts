import { redis } from "@/lib/servidor";
import { COOP_OFICIALES, ordenarCoop } from "@/lib/coop";

// Público: lista de COOP. La primera vez se cargan las oficiales; después se editan desde mi panel.
export async function GET() {
  try {
    const [vals, sembrado] = await redis([["HVALS", "coop"], ["GET", "coop:sembrado"]]);
    let x = vals as string[];
    if (!sembrado) {
      await redis([["HSET", "coop", ...COOP_OFICIALES.flatMap((c) => [c.id, JSON.stringify(c)])], ["SET", "coop:sembrado", "1"]]);
      x = COOP_OFICIALES.map((c) => JSON.stringify(c));
    }
    return Response.json({ coop: ordenarCoop(x.map((j) => JSON.parse(j))) }, { headers: { "Cache-Control": "public, s-maxage=60" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}
