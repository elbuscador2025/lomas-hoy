// Jubilados (solo en el servidor): lectura de la base.
import { redis } from "@/lib/servidor";
import { CLAVE_ACTIVIDADES, CLAVE_CENTROS, type Actividad, type Centro, type DatosJubilados } from "@/lib/jubilados";

const porNombre = (a: { nombre?: string; titulo?: string }, b: { nombre?: string; titulo?: string }) => (a.nombre ?? a.titulo ?? "").localeCompare(b.nombre ?? b.titulo ?? "", "es");

export async function todosCentros(): Promise<Centro[]> {
  const [x] = await redis([["HVALS", CLAVE_CENTROS]]);
  return (x as string[]).map((j) => JSON.parse(j) as Centro).sort(porNombre);
}
export async function todasActividades(): Promise<Actividad[]> {
  const [x] = await redis([["HVALS", CLAVE_ACTIVIDADES]]);
  return (x as string[]).map((j) => JSON.parse(j) as Actividad).sort(porNombre);
}
// Lo que ve el vecino: solo lo activo
export async function datosJubilados(): Promise<DatosJubilados> {
  const [c, a] = await Promise.all([todosCentros(), todasActividades()]);
  return { centros: c.filter((x) => x.activo), actividades: a.filter((x) => x.activa) };
}
