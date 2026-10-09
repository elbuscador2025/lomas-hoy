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
export const urlOpenMeteo = (cfg) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${cfg.clima.latitud}&longitude=${cfg.clima.longitud}` +
  `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation,rain,showers` +
  `&hourly=temperature_2m,weather_code,precipitation_probability` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
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

export function leerPronostico(json) {
  const c = json?.current, h = json?.hourly, d = json?.daily;
  if (!c || !h?.time?.length || !d?.time?.length) throw new Error("Respuesta de clima incompleta");
  const desde = h.time.findIndex((t) => t.slice(0, 13) >= c.time.slice(0, 13)); // desde la hora actual
  const horas = h.time.slice(desde, desde + 26).map((hora, i) => ({
    hora, temp: h.temperature_2m[desde + i], ...(desdeCodigo(h.weather_code[desde + i]) ?? { icono: "nube", etiqueta: "—" }),
    lluvia: h.precipitation_probability[desde + i],
  }));
  const dias = d.time.slice(1, 6).map((fecha, i) => ({
    fecha, min: d.temperature_2m_min[i + 1], max: d.temperature_2m_max[i + 1], lluvia: d.precipitation_probability_max[i + 1],
    ...(desdeCodigo(d.weather_code[i + 1]) ?? { icono: "nube", etiqueta: "—" }),
  }));
  return { ahora: ahoraDesdeOpenMeteo(c), horas, dias };
}

// Arma el clima completo. El SMN es opcional: si falla, se sigue con Open-Meteo.
export async function consultarClima(cfg, traer = fetch) {
  const [om, smn] = await Promise.allSettled([
    traer(urlOpenMeteo(cfg), { signal: AbortSignal.timeout(7000) }).then((r) => { if (!r.ok) throw new Error(`Open-Meteo ${r.status}`); return r.json(); }),
    traer(URL_SMN, { headers: { "User-Agent": "Mozilla/5.0 (LomasHoy)" }, signal: AbortSignal.timeout(7000) })
      .then(async (r) => { if (!r.ok) throw new Error(`SMN ${r.status}`); return leerObservacionSmn(leerZipSmn(Buffer.from(await r.arrayBuffer())), cfg.clima.estacionSmn); }),
  ]);
  if (om.status === "rejected") throw om.reason;
  const clima = leerPronostico(om.value);
  const medido = smn.status === "fulfilled" ? smn.value : null;
  if (medido) clima.ahora = medido;
  if (!clima.ahora) throw new Error("No hay estado actual del tiempo");
  return clima;
}
