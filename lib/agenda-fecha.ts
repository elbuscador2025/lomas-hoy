// Agenda de Lomas, tarjeta de la pantalla principal: qué día es el evento, solo si el título lo dice ("este viernes", "el sábado", "15 de noviembre", "hoy", "mañana").
// Las notas no traen la fecha del evento como dato aparte, y no se inventa: sin día en el título, la nota no cuenta como evento con fecha.
// Sin dependencias: así se puede probar solo.
export type NotaCorta = { titulo: string; medio: string; link: string; fecha: string };
export type EventoVisto = NotaCorta & { dia: string | null; lugar: string; esNota: boolean }; // dia = "AAAA-MM-DD" del evento (o null)

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ZONA = "America/Argentina/Buenos_Aires";

/** Día "AAAA-MM-DD" de un instante, en hora de Argentina. */
export const diaAR = (cuando: Date | string | number): string => new Date(cuando).toLocaleDateString("en-CA", { timeZone: ZONA });
const aMediodia = (dia: string) => new Date(`${dia}T12:00:00-03:00`);
const sumarDias = (dia: string, n: number) => diaAR(new Date(aMediodia(dia).getTime() + n * 86400_000));
const diaSemana = (dia: string) => aMediodia(dia).getUTCDay(); // 12:00 de Argentina es 15:00 UTC: mismo día en UTC

/** El día del evento según el título (o null). `notaDia` = día en que se publicó la nota. */
export function diaDelEvento(titulo: string, notaDia: string): string | null {
  const t = sinTildes(titulo);
  // 1) "15 de noviembre"
  const exp = new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${MESES.join("|")})\\b`).exec(t);
  if (exp) {
    const dd = Number(exp[1]), mes = MESES.indexOf(exp[2]);
    if (dd >= 1 && dd <= 31) {
      const [y, m] = notaDia.split("-").map(Number);
      const anio = mes + 1 < m - 6 ? y + 1 : mes + 1 > m + 6 ? y - 1 : y;
      const dia = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      if (!Number.isNaN(aMediodia(dia).getTime()) && diaAR(aMediodia(dia)) === dia) return dia;
    }
  }
  // 2) "hoy" / "mañana"
  if (/\bhoy\b/.test(t)) return notaDia;
  if (/\bmanana\b/.test(t)) return sumarDias(notaDia, 1);
  // 3) "este viernes", "el sábado", "próximo domingo": el primer día con ese nombre desde el día de la nota
  const sem = new RegExp(`\\b(?:este|el|proximo|proxima|del)\\s+(${DIAS.join("|")})\\b`).exec(t);
  if (sem) {
    const falta = (DIAS.indexOf(sem[1]) - diaSemana(notaDia) + 7) % 7;
    return sumarDias(notaDia, falta);
  }
  return null;
}

/** "Sáb 15" */
export function diaCorto(dia: string): string {
  const d = aMediodia(dia);
  const nombre = d.toLocaleDateString("es-AR", { timeZone: ZONA, weekday: "short" }).replace(".", "");
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${Number(dia.slice(8, 10))}`;
}

/** Barrio o localidad que nombra el título (de la lista de la app); si no hay, vacío. */
export function lugarDeTitulo(titulo: string, localidades: string[]): string {
  const t = sinTildes(titulo);
  const hallada = [...localidades].sort((a, b) => b.length - a.length).find((l) => new RegExp(`\\b${sinTildes(l).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t));
  return hallada ?? "";
}

/**
 * Los 3 que muestra la tarjeta: primero los eventos con día (de hoy en adelante), el más próximo primero; si faltan, se completa con las notas más nuevas.
 * `hoy` = día de hoy "AAAA-MM-DD" (Argentina).
 */
export function proximosEventos(notas: NotaCorta[], hoy: string, localidades: string[], cuantos = 3): EventoVisto[] {
  const todas: EventoVisto[] = notas.map((n) => ({ ...n, dia: diaDelEvento(n.titulo, diaAR(n.fecha)), lugar: lugarDeTitulo(n.titulo, localidades), esNota: false }));
  const conDia = todas.filter((e) => e.dia && e.dia >= hoy).sort((a, b) => a.dia!.localeCompare(b.dia!) || b.fecha.localeCompare(a.fecha));
  const elegidos = conDia.slice(0, cuantos);
  const resto = todas.filter((e) => !elegidos.includes(e)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  for (const e of resto) { if (elegidos.length >= cuantos) break; elegidos.push({ ...e, dia: diaAR(e.fecha), esNota: true }); }
  return elegidos;
}
