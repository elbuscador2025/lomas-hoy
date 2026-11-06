// Cortes de luz: de las coordenadas que informa el ENRE se saca el barrio y la calle aproximada con OpenStreetMap (Nominatim: gratis, sin clave).
// Cada consulta se guarda en Redis (por punto de ~100 m) para no repetirla: un corte que dura horas se consulta una sola vez. Nunca tira error: si algo falla, el corte se muestra igual sin barrio.
import { redis } from "@/lib/servidor";
import { gruposDeCortes, type Luz } from "@/lib/datos";

type Lugar = { barrio: string | null; calle: string | null };
const DIAS = 86400;
const MAX_CONSULTAS_POR_VEZ = 4; // Nominatim pide como máximo una por segundo: el resto queda para la próxima lectura
const PAUSA = 1100;
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clave = (lat: number, lng: number) => `geo:osm:${lat.toFixed(3)},${lng.toFixed(3)}`;

async function consultar(lat: number, lng: number): Promise<Lugar | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=es&lat=${lat}&lon=${lng}`, {
      headers: { "User-Agent": "LomasHoy/1.0 (https://lomas-hoy.vercel.app)" }, signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const a = ((await r.json()) as { address?: Record<string, string> }).address ?? {};
    return { barrio: a.neighbourhood ?? a.suburb ?? a.quarter ?? a.city_district ?? a.village ?? a.hamlet ?? null, calle: a.road ?? a.pedestrian ?? a.footway ?? null };
  } catch { return null; }
}

export async function enriquecerLuz(contenido: Luz): Promise<Luz> {
  const grupos = gruposDeCortes(contenido.cortes);
  const puntos = grupos.map((g) => g.miembros[0]).map((m) => (m.lat != null && m.lng != null ? { lat: m.lat, lng: m.lng } : null));
  const guardados = await redis(puntos.map((p) => ["GET", p ? clave(p.lat, p.lng) : "geo:osm:nada"]));
  let consultas = 0;
  const lugares: (Lugar | null)[] = [];
  for (const [i, p] of puntos.entries()) {
    let lugar: Lugar | null = guardados[i] ? (JSON.parse(guardados[i] as string) as Lugar) : null;
    if (!lugar && p && consultas < MAX_CONSULTAS_POR_VEZ) {
      if (consultas++) await dormir(PAUSA);
      lugar = await consultar(p.lat, p.lng);
      if (lugar) await redis([["SET", clave(p.lat, p.lng), JSON.stringify(lugar), "EX", (lugar.barrio || lugar.calle ? 90 : 0.25) * DIAS]]);
    }
    lugares.push(lugar);
  }
  // el barrio y la calle del corte se les ponen a todos los registros de ese corte
  const cortes = contenido.cortes.map((c) => {
    const i = grupos.findIndex((g) => g.miembros.includes(c));
    const l = i >= 0 ? lugares[i] : null;
    return l ? { ...c, barrio: l.barrio, calle: l.calle } : c;
  });
  return { ...contenido, cortes };
}
