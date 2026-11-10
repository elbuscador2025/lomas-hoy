// Deportes para chicos (solo en el servidor): lectura de la base y datos para el vecino.
import { redis } from "@/lib/servidor";
import { CLAVE_DISC, CLAVE_INST, DISCIPLINAS_INICIALES, type DatosDeportes, type Institucion } from "@/lib/deportes";

export async function disciplinas(): Promise<string[]> {
  const [d] = await redis([["GET", CLAVE_DISC]]);
  try { const l = JSON.parse(String(d)); if (Array.isArray(l) && l.length) return l.map(String); } catch {}
  return DISCIPLINAS_INICIALES;
}
export async function todasInstituciones(): Promise<Institucion[]> {
  const [x] = await redis([["HVALS", CLAVE_INST]]);
  return (x as string[]).map((j) => JSON.parse(j) as Institucion).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
// Lo que ve el vecino: las instituciones activas. La sección es pública siempre.
export async function datosDeportes(): Promise<DatosDeportes> {
  const [d, todas] = await Promise.all([disciplinas(), todasInstituciones()]);
  return { visible: true, soloDueno: false, disciplinas: d, instituciones: todas.filter((i) => i.activa) };
}
