import { barrioCercano } from "@/lib/pasa";

// En qué barrio está el celular (para el renglón "Estás en …" del formulario). Solo devuelve el nombre del barrio; no guarda nada.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const lat = Number(u.searchParams.get("lat")), lng = Number(u.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -35.2 || lat > -34.4 || lng < -58.8 || lng > -58.1) return Response.json({ barrio: "" });
  return Response.json({ barrio: await barrioCercano(lat, lng).catch(() => "") });
}
