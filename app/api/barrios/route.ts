import { barriosActuales } from "@/lib/barrios";

// Público: los barrios (la lista que administro desde mi panel), "Todo Lomas" aparte.
export async function GET() {
  try {
    return Response.json((await barriosActuales()).filter((b) => b !== "Todo Lomas"), { headers: { "Cache-Control": "public, s-maxage=300" } });
  } catch {
    return Response.json({ error: "sin base" }, { status: 503 });
  }
}
