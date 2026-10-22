// Cuándo rige una alerta, dicho claro: "esta noche, de 21 a 3 hs", "ahora, hasta las 3 hs", "mañana, de 8 a 14 hs".
// desde / hasta / ahora: "YYYY-MM-DDTHH:mm" en hora de Argentina.
const aHora = (hhmm: string) => {
  let h = Number(hhmm.slice(0, 2)), m = Number(hhmm.slice(3, 5));
  if (m >= 55) { h = (h + 1) % 24; m = 0; } // 02:59 es "las 3"
  return m ? `${h}:${String(m).padStart(2, "0")}` : String(h);
};
const NOMBRE = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const dias = (a: string, b: string) => Math.round((Date.parse(`${b.slice(0, 10)}T12:00:00Z`) - Date.parse(`${a.slice(0, 10)}T12:00:00Z`)) / 86400_000);

export function cuandoAlerta(desde: string | null, hasta: string, ahora: string) {
  const fin = aHora(hasta.slice(11, 16));
  if (!desde || desde <= ahora) return { empezo: true, corto: `ahora, hasta las ${fin} hs`, largo: `Ahora, hasta las ${fin} hs.` };
  const h = Number(desde.slice(11, 13)), inicio = aHora(desde.slice(11, 16)), n = dias(ahora, desde);
  const dia = n === 0 ? (h >= 19 || h < 6 ? "esta noche" : "hoy") : n === 1 ? "mañana" : `el ${NOMBRE[new Date(`${desde.slice(0, 10)}T12:00:00Z`).getUTCDay()]}`;
  return { empezo: false, corto: `${dia}, de ${inicio} a ${fin} hs`, largo: `Desde ${dia} a las ${inicio} hs, hasta las ${fin} hs.` };
}
