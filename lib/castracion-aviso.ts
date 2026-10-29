// Aviso de jornadas de castración: una sola notificación por jornada, solo a quienes tocaron "Avisarme cuando haya castración".
// Si la jornada se carga entre las 23 y las 7, queda pendiente y se manda después de las 7 (el silencio se respeta).
import { config } from "@/lomas.config.mjs";
import { redis, hoyArgentina } from "@/lib/servidor";
import { ahoraAR } from "@/lib/avisos";
import { notificarSeguro } from "@/lib/push";
import type { Jornada } from "@/lib/castracion";

const enSilencio = () => { const h = Number(ahoraAR().slice(11, 13)); return h >= config.push.silencioDesde || h < config.push.silencioHasta; };
const hh = (t: string) => t.replace(/^0/, "");
export function diaYFecha(fecha: string) {
  const t = new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
// "Sábado 31 de octubre, de 9:00 a 13:00, en Temperley (Calle 123)"
export const cuerpoAviso = (j: Jornada) => `${diaYFecha(j.fecha)}, de ${hh(j.desde)} a ${hh(j.hasta)}, en ${j.barrio} (${j.direccion})`;

async function mandar(j: Jornada) {
  await notificarSeguro({ tipo: "castracion", clave: `castracion:${j.id}`, ttl: 120 * 86400, titulo: "🐾 Castración gratuita", cuerpo: cuerpoAviso(j), url: "/?v=castracion" });
}

// Jornada recién cargada. Nunca tira error.
export async function avisarJornada(j: Jornada) {
  try {
    if (j.fecha < hoyArgentina()) return; // una jornada que ya pasó no se avisa
    if (enSilencio()) { await redis([["HSET", "castracion:pend", j.id, "1"]]); return; }
    await mandar(j);
  } catch (e) {
    console.error("castracion aviso:", e);
  }
}

// Cada 15 minutos: manda las que quedaron pendientes por el silencio (si ya la borré o pasó, se descarta).
export async function enviarPendientes() {
  try {
    if (enSilencio()) return;
    const [ids] = await redis([["HKEYS", "castracion:pend"]]);
    for (const id of (ids as string[]) ?? []) {
      const [j] = await redis([["HGET", "castracion", id]]);
      await redis([["HDEL", "castracion:pend", id]]);
      if (!j) continue;
      const jornada = JSON.parse(j as string) as Jornada;
      if (jornada.fecha >= hoyArgentina()) await mandar(jornada);
    }
  } catch (e) {
    console.error("castracion pendientes:", e);
  }
}
