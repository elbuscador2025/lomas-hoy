import { leerCancion } from "@/lib/estereo";
import { NOMBRE_CANCION_ORIGINAL, URL_CANCION_ORIGINAL } from "@/lib/estereo-comun";

// Público y liviano: qué canción de prueba suena en el estéreo del juego (la que subí desde el panel o la original). El archivo se baja recién al tocar "Jugar".
export async function GET() {
  let c = null;
  try { c = await leerCancion(); } catch {}
  return Response.json(c ? { url: c.url, nombre: c.nombre, tam: c.tam } : { url: URL_CANCION_ORIGINAL, nombre: NOMBRE_CANCION_ORIGINAL, tam: 0 }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=30" } });
}
