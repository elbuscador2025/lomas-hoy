// "Hoy cobran": el calendario de pagos de ANSES cargado desde mi panel. Si no hay datos del mes, se dice y no se inventa nada.
export type PagoAnses = { id: string; prestacion: string; dnis: number[]; fecha: string }; // fecha: "YYYY-MM-DD"
// La página del calendario cambió de dirección y la vieja daba "no existe": se usa la página principal de ANSES.
export const URL_ANSES = "https://www.anses.gob.ar";

// [4, 5] → "4 y 5"; [0, 1, 2] → "0, 1 y 2"
export const terminaciones = (d: number[]) => (d.length > 1 ? `${d.slice(0, -1).join(", ")} y ${d[d.length - 1]}` : String(d[0]));
const diaLargo = (fecha: string) =>
  new Date(`${fecha}T12:00:00-03:00`).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric" }).replace(",", "");
export const fechaPago = diaLargo;

// hoy: "YYYY-MM-DD" en hora de Argentina
export function resumenAnses(pagos: PagoAnses[], hoy: string) {
  const delMes = pagos.filter((p) => p.fecha.slice(0, 7) === hoy.slice(0, 7));
  const deHoy = delMes.filter((p) => p.fecha === hoy);
  const proximo = pagos.filter((p) => p.fecha > hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const lineasHoy = deHoy.map((p) => `${p.prestacion}: DNI terminado en ${terminaciones(p.dnis)}`);
  let texto: string;
  if (!delMes.length) texto = "Calendario de este mes todavía sin publicar";
  else if (lineasHoy.length) texto = lineasHoy.join(" · ");
  else texto = proximo ? `Hoy no hay pagos · Próximo: ${diaLargo(proximo.fecha)}` : "Hoy no hay pagos";
  return { texto, hayHoy: lineasHoy.length > 0, sinDatos: !delMes.length, lineasHoy, delMes };
}
