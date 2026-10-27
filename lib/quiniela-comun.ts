// Quiniela y Quini 6: tipos y cuentas chicas que usan la pantalla y el cuadradito. Solo resultados.
import { SORTEOS } from "@/scripts/quiniela.mjs";

export type SorteoQ = { hora: string; nacional: string[] | null; provincia: string[] | null };
export type DiaQ = { fecha: string; sorteos: Record<string, SorteoQ> };
export type Quiniela = { dias: DiaQ[] };
export type QuiniSorteo = { sorteo: number; fecha: string; modalidades: { nombre: string; numeros: string[] }[] };
export type Quini6 = { sorteos: QuiniSorteo[] };
export type Jurisdiccion = "provincia" | "nacional";

// Hoy y el último día anterior con sorteos (los domingos no hay): siempre según la fecha de hoy, nunca un número viejo como si fuera de hoy
export function diasDe(q: Quiniela | undefined | null, hoy: string) {
  const dias = q?.dias ?? [];
  return { hoy: dias.find((d) => d.fecha === hoy) ?? null, ayer: [...dias].filter((d) => d.fecha < hoy && Object.keys(d.sorteos).length).sort((a, b) => a.fecha.localeCompare(b.fecha)).pop() ?? null };
}
// El último sorteo que salió en una jurisdicción dentro de un día
export function ultimoDe(dia: DiaQ | null | undefined, j: Jurisdiccion) {
  for (const s of [...SORTEOS].reverse()) { const r = dia?.sorteos[s.id]?.[j]; if (r) return { ...s, fecha: dia!.fecha, numeros: r }; }
  return null;
}
// Para el cuadradito: "Nocturna Provincia: 1234" (el último de hoy; si hoy no salió ninguno, el último de ayer)
export function ultimoResultado(q: Quiniela | undefined | null, hoy: string) {
  const { hoy: h, ayer } = diasDe(q, hoy);
  const u = ultimoDe(h, "provincia") ?? ultimoDe(ayer, "provincia");
  return u ? `${u.nombre} Provincia: ${u.numeros[0]}` : null;
}
export const fechaLinda = (f: string) => {
  const t = new Date(`${f}T12:00:00-03:00`).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric" }).replace(",", "");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
