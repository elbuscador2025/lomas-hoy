// La franja de feriados de la pantalla principal. Los datos salen de data/feriados.mjs (sitio oficial del Gobierno nacional).
import { feriados } from "@/data/feriados.mjs";

type Dia = { fecha: string; tipo: string; motivo: string; religioso?: boolean; otraZona?: boolean };
const dias = feriados as Dia[];

const esFeriado = (d: Dia) => ["inamovible", "trasladable", "especial"].includes(d.tipo);
// Para Lomas: sin los de otra provincia y sin los días no laborables que son solo para quienes profesan esa religión
const aplica = (d: Dia) => !d.religioso && !d.otraZona;

const sumar = (fecha: string, n: number) => new Date(new Date(`${fecha}T12:00:00Z`).getTime() + n * 86400_000).toISOString().slice(0, 10);
const nombreDia = (fecha: string) =>
  new Date(`${fecha}T12:00:00-03:00`).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric" }).replace(",", "");

// Si el mismo día es feriado y además día no laborable, se muestra el feriado
function delDia(fecha: string): Dia | null {
  const lista = dias.filter((d) => d.fecha === fecha && aplica(d));
  return lista.find(esFeriado) ?? lista[0] ?? null;
}

// hoy: "YYYY-MM-DD" en hora de Argentina. Hoy → un renglón; si no, los de los próximos 3 días.
export function avisosDeFeriado(hoy: string): string[] {
  const h = delDia(hoy);
  if (h) {
    return [esFeriado(h)
      ? "Hoy es feriado. Trenes y colectivos suelen funcionar con horario de domingo"
      : `Hoy es día no laborable (${h.motivo})`];
  }
  const proximos: string[] = [];
  for (let n = 1; n <= 3; n++) {
    const f = sumar(hoy, n), d = delDia(f);
    if (d) proximos.push(`El ${nombreDia(f)} es ${esFeriado(d) ? "feriado" : "día no laborable"} (${d.motivo})`);
  }
  return proximos;
}
