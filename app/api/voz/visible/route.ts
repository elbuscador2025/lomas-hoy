import { vozVisible } from "@/lib/voz";

// Público: ¿La Voz de Lomas está prendida en la pantalla principal? (se prende y apaga desde mi panel)
export async function GET() {
  try {
    return Response.json({ visible: await vozVisible() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ visible: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
