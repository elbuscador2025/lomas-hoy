// Cuándo rige una alerta, dicho claro y siempre con el momento del día y el día:
// "esta madrugada (martes), de 3 a 9 hs (madrugada y mañana)", "mañana martes, de 15 a 21 hs (tarde y noche)", "ahora, hasta las 3 de la madrugada del martes".
// desde / hasta / ahora: "YYYY-MM-DDTHH:mm" en hora de Argentina.
const NOMBRE = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const nombreDia = (f: string) => NOMBRE[new Date(`${f.slice(0, 10)}T12:00:00Z`).getUTCDay()];
const dias = (a: string, b: string) => Math.round((Date.parse(`${b.slice(0, 10)}T12:00:00Z`) - Date.parse(`${a.slice(0, 10)}T12:00:00Z`)) / 86400_000);
const minutos = (a: string, b: string) => Math.round((Date.parse(`${b.slice(0, 16)}:00Z`) - Date.parse(`${a.slice(0, 16)}:00Z`)) / 60_000);

// 02:59 es "las 3"
const redondeada = (hhmm: string) => {
  let h = Number(hhmm.slice(0, 2)), m = Number(hhmm.slice(3, 5));
  if (m >= 55) { h = (h + 1) % 24; m = 0; }
  return { h, m, texto: m ? `${h}:${String(m).padStart(2, "0")}` : String(h) };
};
// madrugada 0 a 6, mañana 6 a 12, tarde 12 a 20, noche 20 a 24
type Parte = "madrugada" | "mañana" | "tarde" | "noche";
const parteDe = (h: number): Parte => (h < 6 ? "madrugada" : h < 12 ? "mañana" : h < 20 ? "tarde" : "noche");
const ORDEN: Parte[] = ["madrugada", "mañana", "tarde", "noche"];
const lista = (p: Parte[]) => (p.length === 1 ? p[0] : `${p.slice(0, -1).join(", ")} y ${p[p.length - 1]}`);
// las partes del día que cubre el horario, de la primera a la última ("tarde y noche"); si cruza la medianoche, sigue de la noche a la madrugada
function partesEntre(desde: string, hasta: string): Parte[] {
  const out: Parte[] = [];
  const t0 = Date.parse(`${desde.slice(0, 16)}:00Z`), t1 = Date.parse(`${hasta.slice(0, 16)}:00Z`) - 60_000; // hasta las 20:00 todavía es tarde
  for (let t = t0; t <= Math.max(t0, t1); t += 30 * 60_000) {
    const p = parteDe(new Date(t).getUTCHours());
    if (!out.includes(p)) out.push(p);
  }
  const fin = parteDe(new Date(Math.max(t0, t1)).getUTCHours());
  if (!out.includes(fin)) out.push(fin);
  return out;
}
const hace = (min: number) => {
  if (min < 60) return `${Math.max(min, 1)} ${min <= 1 ? "minuto" : "minutos"}`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.round(min / 1440);
  return `${d} días`;
};
const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function cuandoAlerta(desde: string | null, hasta: string, ahora: string) {
  const fin = redondeada(hasta.slice(11, 16));
  const parteFin = parteDe(redondeada(new Date(Date.parse(`${hasta.slice(0, 16)}:00Z`) - 60_000).toISOString().slice(11, 16)).h);
  if (!desde || desde <= ahora) {
    const cuando = dias(ahora, hasta) > 0 ? ` del ${nombreDia(hasta)}` : "";
    const corto = `ahora, hasta las ${fin.texto} de la ${parteFin}${cuando}`;
    return { empezo: true, corto, largo: `${mayus(corto)}.`, empieza: "Está en vigencia ahora" };
  }
  const ini = redondeada(desde.slice(11, 16)), n = dias(ahora, desde), horaAhora = Number(ahora.slice(11, 13));
  const parteIni = parteDe(ini.h);
  const dia = parteIni === "madrugada"
    ? (n === 0 || (n === 1 && horaAhora >= 12) ? `esta madrugada (${nombreDia(desde)})` : n === 1 ? `mañana de madrugada (${nombreDia(desde)})` : `el ${nombreDia(desde)} de madrugada`)
    : n === 0 ? (parteIni === "noche" ? `esta noche (${nombreDia(desde)})` : `hoy ${nombreDia(desde)}`)
    : n === 1 ? `mañana ${nombreDia(desde)}`
    : `el ${nombreDia(desde)}`;
  const partes = partesEntre(desde, hasta).sort((a, b) => (desde.slice(0, 10) === hasta.slice(0, 10) ? ORDEN.indexOf(a) - ORDEN.indexOf(b) : 0));
  const cruza = hasta.slice(0, 10) !== desde.slice(0, 10);
  const cuando = partes.length === 1 ? `de ${ini.texto} a ${fin.texto} de la ${partes[0]}` : `de ${ini.texto} a ${fin.texto} hs (${lista(partes)})`;
  const corto = `${dia}, ${cuando}${cruza ? `, hasta el ${nombreDia(hasta)}` : ""}`;
  return { empezo: false, corto, largo: `${mayus(corto)}.`, empieza: `Empieza en ${hace(minutos(ahora, desde))}` };
}
