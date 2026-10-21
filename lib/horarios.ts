// Estado de un lugar según su horario escrito ("Abierta las 24 hs", "Lun a vie 8 a 18 hs · Sáb, dom y feriados 9 a 12 hs").
// Si el horario no se entiende o no está cargado, no se inventa nada: "Consultá el horario".
import { avisosDeFeriado } from "@/lib/feriados";

export type EstadoHorario = { tipo: "abierta" | "cerrada" | "sin"; texto: string };
type Tramo = { dias: number[]; feriado: boolean; desde: number; hasta: number }; // dias: 0 = domingo ... 6 = sábado; horas en minutos

const DIAS = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
const NOMBRE = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const minutos = (h: string) => { const [a, b] = h.split(":"); return Number(a) * 60 + Number(b ?? 0); };
const hs = (m: number) => (m % 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}` : String(Math.floor(m / 60)));

function leerTramos(horario: string): Tramo[] | "24" | null {
  if (/24\s*hs/i.test(horario)) return "24";
  const tramos: Tramo[] = [];
  for (const seg of horario.split("·")) {
    const m = sinTildes(seg).match(/^(.*?)(\d{1,2}(?::\d{2})?)\s*a\s*(\d{1,2}(?::\d{2})?)\s*hs?\b/);
    if (!m) return null;
    const texto = m[1];
    const dias = new Set<number>();
    const rango = [...texto.matchAll(/\b(lun|mar|mie|jue|vie|sab|dom)[a-z]*\s+a\s+(lun|mar|mie|jue|vie|sab|dom)[a-z]*/g)];
    for (const r of rango) { let i = DIAS.indexOf(r[1]); const f = DIAS.indexOf(r[2]); for (let k = 0; k < 7; k++) { dias.add(i); if (i === f) break; i = (i + 1) % 7; } }
    const sinRangos = texto.replace(/\b(lun|mar|mie|jue|vie|sab|dom)[a-z]*\s+a\s+(lun|mar|mie|jue|vie|sab|dom)[a-z]*/g, " ");
    for (const d of sinRangos.matchAll(/\b(lun|mar|mie|jue|vie|sab|dom)[a-z]*/g)) dias.add(DIAS.indexOf(d[1]));
    const feriado = /feriado/.test(texto);
    if (!dias.size && !feriado) for (let k = 0; k < 7; k++) dias.add(k); // sin días escritos: todos
    tramos.push({ dias: [...dias], feriado, desde: minutos(m[2]), hasta: minutos(m[3]) });
  }
  return tramos.length ? tramos : null;
}

// ahoraAR: "YYYY-MM-DDTHH:mm" (hora de Argentina)
export function estadoHorario(horario: string, ahoraAR: string): EstadoHorario {
  const sin: EstadoHorario = { tipo: "sin", texto: "Consultá el horario" };
  if (!horario?.trim()) return sin;
  const tramos = leerTramos(horario);
  if (!tramos) return sin;
  if (tramos === "24") return { tipo: "abierta", texto: "Abierta ahora" };

  const hoy = ahoraAR.slice(0, 10), ahoraMin = minutos(ahoraAR.slice(11, 16));
  const esFeriado = (f: string) => avisosDeFeriado(f)[0]?.startsWith("Hoy es feriado") ?? false;
  const diaDe = (f: string) => new Date(`${f}T12:00:00Z`).getUTCDay();
  const sumar = (f: string, n: number) => new Date(new Date(`${f}T12:00:00Z`).getTime() + n * 86400_000).toISOString().slice(0, 10);
  // los tramos que rigen un día (un feriado usa los "feriados"; si no hay, los del domingo)
  const delDia = (f: string) => {
    if (esFeriado(f)) { const fer = tramos.filter((t) => t.feriado); return fer.length ? fer : tramos.filter((t) => t.dias.includes(0)); }
    return tramos.filter((t) => t.dias.includes(diaDe(f)));
  };
  if (delDia(hoy).some((t) => ahoraMin >= t.desde && ahoraMin < t.hasta)) return { tipo: "abierta", texto: "Abierta ahora" };

  // próxima apertura: hoy más tarde, o el primer día que abre
  const hoyMas = delDia(hoy).filter((t) => t.desde > ahoraMin).sort((a, b) => a.desde - b.desde)[0];
  if (hoyMas) return { tipo: "cerrada", texto: `Cerrada · abre a las ${hs(hoyMas.desde)}` };
  for (let n = 1; n <= 7; n++) {
    const f = sumar(hoy, n), t = delDia(f).sort((a, b) => a.desde - b.desde)[0];
    if (t) return { tipo: "cerrada", texto: `Cerrada · abre ${n === 1 ? "mañana" : `el ${NOMBRE[diaDe(f)]}`} a las ${hs(t.desde)}` };
  }
  return { tipo: "cerrada", texto: "Cerrada" };
}

// De 20 a 8 hs es de noche (para el aviso de las veterinarias de guardia)
export const esDeNocheVet = (ahoraAR: string) => { const h = Number(ahoraAR.slice(11, 13)); return h >= 20 || h < 8; };
