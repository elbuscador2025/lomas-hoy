// Control básico de la Quiniela y el Quini 6: lo que no pasa el control no se muestra. Sin avisos; solo queda el estado que ve mi panel.
import { redis, hoyArgentina } from "@/lib/servidor";

export type Problema = { quiniela: string; sorteo: string; fecha: string; motivo?: string };
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const fechaCorta = (f: string) => { const d = new Date(`${f}T12:00:00-03:00`); return `${DIAS[d.getUTCDay()]} ${Number(f.slice(8, 10))}`; };

export async function registrarControles(controles: Problema[]) {
  const hoy = hoyArgentina();
  for (const c of controles) await redis([["HSET", `qc:hoy:${hoy}`, `${c.quiniela}:${c.sorteo}:${c.fecha}`, `${c.quiniela} ${c.sorteo} (${fechaCorta(c.fecha)}): no pasó el control`], ["EXPIRE", `qc:hoy:${hoy}`, 3 * 86400]]);
  await redis([["SET", "qc:ultimo", new Date().toISOString()]]);
}

// Para mi panel: "Quiniela: último control OK a las HH:MM", o la lista de lo que no pasó el control hoy
export async function estadoControles() {
  const [ultimo, hoyLista] = await redis([["GET", "qc:ultimo"], ["HVALS", `qc:hoy:${hoyArgentina()}`]]);
  return { ultimo: (ultimo as string | null) ?? null, problemas: (hoyLista as string[]) ?? [] };
}
