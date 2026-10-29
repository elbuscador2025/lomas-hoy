import { sesionDe } from "@/lib/cuentas";

// Para el enlace del pie de la pantalla principal: "Ingresar" o "Mi panel".
export async function GET(req: Request) {
  if (!req.headers.get("cookie")?.includes("sesion=")) return Response.json({ destino: null });
  const s = await sesionDe(req).catch(() => null);
  return Response.json({ destino: s ? (s.tipo === "merendero" ? "/merendero" : "/panel") : null }, { headers: { "Cache-Control": "no-store" } });
}
