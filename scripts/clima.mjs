// Clima: "ahora" medido por el SMN (Ezeiza) si se puede leer bien; si no, el servicio Open-Meteo.
// Las horas y los días siguientes son pronóstico de Open-Meteo. Si algo no se puede leer, queda vacío: no se inventa.
import { inflateRawSync } from "node:zlib";

const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const sinTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ---- Código de Open-Meteo (WMO) -> ícono y palabra ----
export function desdeCodigo(c) {
  if (c === 0) return { icono: "sol", etiqueta: "Despejado" };
  if (c === 1) return { icono: "solnube", etiqueta: "Mayormente despejado" };
  if (c === 2) return { icono: "solnube", etiqueta: "Parcialmente nublado" };
  if (c === 3) return { icono: "nube", etiqueta: "Nublado" };
  if (c === 45 || c === 48) return { icono: "niebla", etiqueta: "Niebla" };
  if (c >= 51 && c <= 57) return { icono: "lluvia", etiqueta: "Llovizna" };
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return { icono: "lluvia", etiqueta: c === 65 || c === 82 ? "Lluvia fuerte" : c >= 80 ? "Chubascos" : "Lluvia" };
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return { icono: "nieve", etiqueta: "Nevada" };
  if (c >= 95) return { icono: "tormenta", etiqueta: "Tormenta" };
  return null; // código que no conocemos: no se muestra un estado inventado
}

// ---- Observación del SMN (datos abiertos de "tiempo presente") ----
export const URL_SMN = "https://ssl.smn.gob.ar/dpd/zipopendata.php?dato=tiepre";

// Frase del SMN ("Cubierto con lluvia") -> ícono y palabra. Lluvia "en la hora anterior" o "a la vista" no cuenta como ahora.
export function desdeTextoSmn(texto) {
  const t = sinTildes(texto).replace(/(con )?\w+( y \w+)? (en la hora anterior|a la vista)/g, "");
  if (/tormenta/.test(t)) return { icono: "tormenta", etiqueta: "Tormenta" };
  if (/lluvia/.test(t)) return { icono: "lluvia", etiqueta: "Lluvia" };
  if (/llovizna/.test(t)) return { icono: "lluvia", etiqueta: "Llovizna" };
  if (/nevada/.test(t)) return { icono: "nieve", etiqueta: "Nevada" };
  if (/neblina|niebla|bruma/.test(t)) return { icono: "niebla", etiqueta: "Neblina" };
  if (/despejado/.test(t)) return { icono: "sol", etiqueta: "Despejado" };
  if (/algo nublado/.test(t)) return { icono: "solnube", etiqueta: "Algo nublado" };
  if (/parcialmente nublado/.test(t)) return { icono: "solnube", etiqueta: "Parcialmente nublado" };
  if (/cubierto/.test(t)) return { icono: "nube", etiqueta: "Cubierto" };
  if (/nublado/.test(t)) return { icono: "nube", etiqueta: "Nublado" };
  return null;
}

// El archivo es un .zip con un solo .txt (Latin-1), una estación por línea separada con ";"
export function leerZipSmn(buffer) {
  const nombre = buffer.readUInt16LE(26), extra = buffer.readUInt16LE(28);
  return inflateRawSync(buffer.subarray(30 + nombre + extra)).toString("latin1");
}

// Devuelve la observación de la estación, o null si no está, es vieja o no se entiende.
export function leerObservacionSmn(txt, estacion, ahora = new Date()) {
  const fila = txt.split("\n").map((l) => l.split(";").map((x) => x.trim())).find((c) => sinTildes(c[0]) === sinTildes(estacion));
  if (!fila || fila.length < 9) return null;
  const [, fecha, hhmm, estadoTxt, , tempTxt, sensTxt, humTxt, vientoTxt] = fila;
  const f = fecha.match(/^(\d{1,2})-([a-záéíóú]+)-(\d{4})$/i);
  const mes = f && MESES[sinTildes(f[2])];
  if (!mes || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const medidoEn = new Date(`${f[3]}-${String(mes).padStart(2, "0")}-${f[1].padStart(2, "0")}T${hhmm}:00-03:00`);
  const minutos = (ahora - medidoEn) / 60000;
  if (Number.isNaN(minutos) || minutos > 120 || minutos < -10) return null; // vieja o con fecha rara
  const temp = Number(tempTxt);
  const estado = desdeTextoSmn(estadoTxt);
  if (!Number.isFinite(temp) || tempTxt === "" || !estado) return null;
  const num = (x) => (x !== "" && Number.isFinite(Number(x)) ? Number(x) : null);
  return {
    temp,
    sensacion: num(sensTxt),
    humedad: num(humTxt),
    viento: /calma/i.test(vientoTxt) ? 0 : num(vientoTxt.match(/(\d+)\s*$/)?.[1] ?? ""),
    ...estado,
    medidoEn: hhmm,
    estacion,
  };
}

// ---- Pronóstico (Open-Meteo) ----
// Lo trae el proceso automático cada ~20 minutos y queda guardado: no se consulta Open-Meteo por cada visita.
export const urlOpenMeteo = (cfg) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${cfg.clima.latitud}&longitude=${cfg.clima.longitud}` +
  `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation,rain,showers` +
  `&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability,precipitation,wind_speed_10m` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum` +
  `&forecast_days=7&timezone=${encodeURIComponent(cfg.zonaHoraria)}`;

// "Ahora" según Open-Meteo. Si está cayendo agua en este momento, se dice aunque el código general diga "nublado".
export function ahoraDesdeOpenMeteo(c) {
  const mm = Math.max(c.rain ?? 0, 0) + Math.max(c.showers ?? 0, 0) || Math.max(c.precipitation ?? 0, 0);
  const base = desdeCodigo(c.weather_code);
  const llueve = mm > 0 && !(c.weather_code >= 51 && c.weather_code <= 99);
  const estado = c.weather_code >= 95 ? base
    : llueve ? { icono: "lluvia", etiqueta: mm < 0.5 ? "Llovizna" : "Lluvia" }
    : base;
  if (!estado) return null;
  return { temp: c.temperature_2m, sensacion: c.apparent_temperature, humedad: c.relative_humidity_2m, viento: c.wind_speed_10m, ...estado, medidoEn: null, estacion: null };
}

// Palabra para un día: "Llueve", "Probable lluvia" o "No llueve"
export const palabraDia = (prob, mm) => ((prob ?? 0) >= 70 && (mm ?? 0) >= 1 ? "Llueve" : (prob ?? 0) >= 40 ? "Probable lluvia" : "No llueve");

export function leerPronostico(json) {
  const c = json?.current, h = json?.hourly, d = json?.daily;
  if (!c || !h?.time?.length || !d?.time?.length) throw new Error("Respuesta de clima incompleta");
  const desde = h.time.findIndex((t) => t.slice(0, 13) >= c.time.slice(0, 13)); // desde la hora actual
  const horas = h.time.slice(desde, desde + 48).map((hora, i) => ({
    hora,
    temp: h.temperature_2m[desde + i],
    sensacion: h.apparent_temperature[desde + i],
    viento: h.wind_speed_10m[desde + i],
    lluvia: h.precipitation_probability[desde + i],
    mm: h.precipitation[desde + i],
    codigo: h.weather_code[desde + i],
    ...(desdeCodigo(h.weather_code[desde + i]) ?? { icono: "nube", etiqueta: "—" }),
  }));
  const dias = d.time.slice(1, 6).map((fecha, i) => ({
    fecha, min: d.temperature_2m_min[i + 1], max: d.temperature_2m_max[i + 1], lluvia: d.precipitation_probability_max[i + 1],
    palabra: palabraDia(d.precipitation_probability_max[i + 1], d.precipitation_sum[i + 1]),
    ...(desdeCodigo(d.weather_code[i + 1]) ?? { icono: "nube", etiqueta: "—" }),
  }));
  const actual = ahoraDesdeOpenMeteo(c);
  if (!actual) throw new Error("No hay estado actual del tiempo");
  return { actual, horas, dias };
}

// ---- La frase de arriba: reglas fijas, primero la lluvia ----
const FRANJAS = [["de madrugada", 0, 6], ["a la mañana", 6, 12], ["a la tarde", 12, 19], ["a la noche", 19, 24]];
const franjaDe = (hora) => FRANJAS.find(([, a, b]) => hora >= a && hora < b)[0];
const unir = (l) => (l.length > 1 ? `${l.slice(0, -1).join(", ")} y ${l[l.length - 1]}` : l[0]);
const sumarDia = (f) => new Date(new Date(`${f}T12:00:00Z`).getTime() + 86400_000).toISOString().slice(0, 10);

// ahora: "YYYY-MM-DDTHH:mm" (hora de Argentina). Hasta las 20 habla de lo que queda de hoy; después, de mañana.
export function armarFrase({ horas, ahora, ahoraEstado }) {
  if (ahoraEstado?.icono === "tormenta") return "Hay tormenta ahora";
  if (ahoraEstado?.icono === "lluvia") return "Está lloviendo ahora, llevá paraguas";
  const hoy = ahora.slice(0, 10), h = Number(ahora.slice(11, 13));
  const manana = h >= 20;
  const ambito = horas.filter((x) => {
    const hh = Number(x.hora.slice(11, 13));
    return manana ? x.hora.slice(0, 10) === sumarDia(hoy) && hh >= 6 : x.hora.slice(0, 10) === hoy && hh >= h;
  });
  if (!ambito.length) return null; // sin datos: no se inventa una frase
  const dicho = (t) => (manana ? `Mañana, ${t.charAt(0).toLowerCase()}${t.slice(1)}` : t);

  const seguras = new Set(), probables = new Set();
  for (const x of ambito) {
    const franja = franjaDe(Number(x.hora.slice(11, 13)));
    if (x.codigo >= 95 || ((x.lluvia ?? 0) >= 70 && (x.mm ?? 0) >= 0.2)) seguras.add(franja);
    else if ((x.lluvia ?? 0) >= 40) probables.add(franja);
  }
  if (seguras.size) return manana ? `Mañana llueve ${unir([...seguras])}, llevá paraguas` : `Llueve ${unir([...seguras])}, llevá paraguas`;
  if (probables.size) return dicho(`Probable lluvia ${unir([...probables])}`);

  const maxSens = Math.max(...ambito.map((x) => x.sensacion)), minSens = Math.min(...ambito.map((x) => x.sensacion));
  const masViento = ambito.reduce((a, b) => (b.viento > a.viento ? b : a));
  const viento = masViento.viento, cuando = franjaDe(Number(masViento.hora.slice(11, 13)));
  if (maxSens >= 35) return dicho("Mucho calor, tomá agua");
  if (viento >= 50) return dicho(`Mucho viento ${cuando}`);
  if (minSens <= 5) return dicho("Mucho frío, abrigate bien");
  if (maxSens >= 30) return dicho("Hace calor, salí liviano");
  if (viento >= 40) return dicho(`Mucho viento ${cuando}`);
  if (minSens <= 12) return manana ? "Mañana fresca, salí abrigado" : "Hoy hace fresco, salí abrigado";
  return manana ? "Mañana no llueve" : "Hoy no llueve";
}

// ---- Observación del SMN (se pide aparte, una sola vez para todos) ----
export async function consultarSmn(cfg, traer = fetch) {
  const r = await traer(URL_SMN, { headers: { "User-Agent": "Mozilla/5.0 (LomasHoy)" }, signal: AbortSignal.timeout(7000) });
  if (!r.ok) throw new Error(`SMN ${r.status}`);
  return leerObservacionSmn(leerZipSmn(Buffer.from(await r.arrayBuffer())), cfg.clima.estacionSmn);
}

// Junta lo medido (SMN, si hay) con el pronóstico guardado. ahoraAR: "YYYY-MM-DDTHH:mm".
export function componerClima(pron, medido, ahoraAR) {
  const ahora = medido ?? pron.actual;
  return {
    ahora,
    frase: armarFrase({ horas: pron.horas, ahora: ahoraAR, ahoraEstado: ahora }),
    horas: pron.horas,
    dias: pron.dias,
    pronosticoEn: pron.consultadoEn,
  };
}
