import { redis } from "@/lib/servidor";
import { OFICINAS_ANSES, ordenarOficinas } from "@/lib/ansesof";

// Público: oficinas de ANSES. La primera vez se cargan las oficiales; después se editan desde mi panel.
export async function GET() {
  try {
    const [vals, sembrado] = await redis([["HVALS", "ansesof"], ["GET", "ansesof:sembrado"]]);
    let x = vals as string[];
    if (!sembrado) {
      await redis([["HSET", "ansesof", ...OFICINAS_ANSES.flatMap((o) => [o.id, JSON.stringify(o)])], ["SET", "ansesof:sembrado", "1"]]);
      x = OFICINAS_ANSES.map((o) => JSON.stringify(o));
    }
    return Response.json({ oficinas: ordenarOficinas(x.map((j) => JSON.parse(j))) }, { headers: { "Cache-Control": "public, s-maxage=60" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}
