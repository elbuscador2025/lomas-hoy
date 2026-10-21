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
export const urlOpenMeteo = (cfg, punto = cfg.clima) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${punto.latitud}&longitude=${punto.longitud}` +
  `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation,rain,showers` +
  `&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset` +
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

// De noche (entre la puesta y la salida del sol) el sol pasa a ser luna
export const deNoche = (icono) => (icono === "sol" ? "luna" : icono === "solnube" ? "lunanube" : icono);
// sol: [{ fecha, sale: "HH:MM", pone: "HH:MM" }]. hora: "YYYY-MM-DDTHH:mm" en hora de Argentina.
export function esDeNoche(sol, hora) {
  const dia = sol?.find((x) => x.fecha === hora.slice(0, 10));
  if (!dia) return false; // sin datos del sol, se deja el ícono de día
  const hm = hora.slice(11, 16);
  return hm < dia.sale || hm >= dia.pone;
}

// Palabra para un día: "Llueve", "Probable lluvia" o "No llueve"
export const palabraDia = (prob, mm) => ((prob ?? 0) >= 70 && (mm ?? 0) >= 1 ? "Llueve" : (prob ?? 0) >= 40 ? "Probable lluvia" : "No llueve");

// ---- Lluvia: escalones de chance, modelo del SMN y frases ----
// Menos de 10%: no llueve · 10 a 29%: chaparrones aislados · 30 a 59%: probable lluvia · 60% o más: llueve
export const nivelLluvia = (p) => ((p ?? 0) < 10 ? 0 : p < 30 ? 1 : p < 60 ? 2 : 3);
// El modelo del SMN (datos abiertos) da milímetros cada 3 horas, sin probabilidad: se traduce a un escalón (llovizna → aislados, 1 mm → probable, 3 mm → llueve)
export const chanceSmn = (mm) => (mm == null || mm < 0.1 ? 0 : mm < 1 ? 20 : mm < 3 ? 45 : 70);

const MES = { ENE: "01", FEB: "02", MAR: "03", ABR: "04", MAY: "05", JUN: "06", JUL: "07", AGO: "08", SEP: "09", OCT: "10", NOV: "11", DIC: "12" };
// "Pronóstico a 5 días" del SMN (datos abiertos, salida de un modelo numérico): cada 3 horas, temperatura, viento y milímetros de lluvia, por estación
export const URL_SMN_5DIAS = "https://ssl.smn.gob.ar/dpd/zipopendata.php?dato=pron5d";
export function leerPron5d(txt, estacion) {
  const filas = [];
  let actual = null;
  for (const l of txt.split(/\r?\n/)) {
    const t = l.trim();
    if (/^[A-ZÁÉÍÓÚÑ_ ]{3,}$/.test(t) && !/FECHA/.test(t)) { actual = t; continue; }
    if (actual !== estacion) continue;
    const m = l.match(/^\s*(\d{2})\/([A-Z]{3})\/(\d{4})\s+(\d{2})Hs\.\s+(-?[\d.]+)\s+\d+\s*\|\s*(\d+)\s+([\d.]+)/);
    if (m && MES[m[2]]) filas.push({ hora: `${m[3]}-${MES[m[2]]}-${m[1]}T${m[4]}:00`, temp: Number(m[5]), viento: Number(m[6]), mm: Number(m[7]) });
  }
  return filas;
}
// Los milímetros de cada tramo son los acumulados de las 3 horas anteriores: una hora toma el primer tramo que termina en ella o después
const mmDeHora = (filas, hora) => {
  if (!filas?.length) return null;
  const t = Date.parse(`${hora}:00-03:00`);
  const f = filas.find((x) => { const d = Date.parse(`${x.hora}:00-03:00`) - t; return d >= 0 && d < 3 * 3600_000; });
  return f ? f.mm : null;
};

// Dos momentos se enumeran; tres o más es "durante el día"
const cuando = (franjas) => (franjas.length >= 3 ? "durante el día" : unir(franjas));

// Chance de una hora con dos fuentes (Open-Meteo y el modelo del SMN): si coinciden, vale la de Open-Meteo; si una dice mucho menos,
// se baja (como mucho un escalón más que la más baja); y si hay una sola fuente, no pasa de "chaparrones aislados".
export function chanceFinal(pOM, pSmn) {
  if (pOM == null && pSmn == null) return 0;
  if (pOM == null || pSmn == null) return Math.min(pOM ?? pSmn, 29);
  return Math.min(pOM, [9, 29, 59, 100][Math.min(nivelLluvia(pOM), nivelLluvia(pSmn) + 1)]);
}

// Por franja del día, la chance más alta; y de ahí el escalón y el texto. campo: "lluvia" (Lomas) o "lluviaCap" (Capital)
export function textoLluvia(horas, campo = "lluvia") {
  const porFranja = new Map();
  for (const x of horas) {
    if (x[campo] == null) continue;
    const f = franjaDe(Number(x.hora.slice(11, 13)));
    porFranja.set(f, Math.max(porFranja.get(f) ?? 0, x[campo]));
  }
  if (!porFranja.size) return null;
  const max = Math.max(...porFranja.values()), nivel = nivelLluvia(max);
  const franjas = [...porFranja].filter(([, p]) => nivelLluvia(p) === nivel).map(([f]) => f);
  const texto = nivel === 0 ? "no llueve" : nivel === 1 ? "no se descartan chaparrones aislados" : nivel === 2 ? `probable lluvia ${cuando(franjas)}` : `llueve ${cuando(franjas)}`;
  return { nivel, max, texto, franjas };
}
// La frase de lluvia de Lomas y Capital: una sola si es parecida; si no, dice cuál es peor. Null si en los dos no llueve.
export function fraseLluvia(horas) {
  const a = textoLluvia(horas, "lluvia"), b = textoLluvia(horas, "lluviaCap");
  if (!a) return null;
  if (!b || a.nivel === b.nivel) {
    if (a.nivel === 0) return null;
    const set = new Set([...a.franjas, ...(b?.franjas ?? [])]);
    const franjas = FRANJAS.map((f) => f[0]).filter((f) => set.has(f));
    return a.nivel === 1 ? "No se descartan chaparrones aislados" : a.nivel === 2 ? `Probable lluvia ${cuando(franjas)}` : `Llueve ${cuando(franjas)}, llevá paraguas`;
  }
  const paraguas = (t) => (t.nivel >= 2 ? ": llevá paraguas" : "");
  const une = (t) => (/^no /.test(t.texto) ? " " : ", "); // "En Lomas no llueve" · "En Capital, probable lluvia…"
  return b.nivel > a.nivel
    ? `En Lomas${une(a)}${a.texto}. En Capital, ${b.texto}${paraguas(b)}`
    : `En Capital${une(b)}${b.texto}. En Lomas, ${a.texto}${paraguas(a)}`;
}

// Frase de un día entero (hora por hora, de 0 a 23): primero la lluvia; si no, cómo está el día
export function fraseDia(horas) {
  const lluvia = fraseLluvia(horas);
  if (lluvia) return lluvia;
  const dia = horas.filter((x) => Number(x.hora.slice(11, 13)) >= 8 && Number(x.hora.slice(11, 13)) <= 20);
  const base = dia.length ? dia : horas;
  const max = Math.max(...base.map((x) => x.temp));
  const temp = max >= 30 ? "caluroso" : max >= 22 ? "templado" : max >= 16 ? "fresco" : "frío";
  const nubes = base.reduce((t, x) => t + (x.codigo === 0 || x.codigo === 1 ? 0 : x.codigo === 2 ? 1 : 2), 0) / base.length;
  const cielo = nubes < 0.5 ? "soleado" : nubes < 1.4 ? "parcialmente nublado" : "nublado";
  const viento = Math.max(...base.map((x) => x.viento ?? 0)) >= 40 ? ", con mucho viento" : "";
  return `Día ${temp} y ${cielo}${viento}`;
}

// extra (opcional): { capital: respuesta de Open-Meteo para la Ciudad, smn: { lomas: filas, capital: filas } del pronóstico a 5 días del SMN }
export function leerPronostico(json, extra = {}) {
  const c = json?.current, h = json?.hourly, d = json?.daily;
  if (!c || !h?.time?.length || !d?.time?.length) throw new Error("Respuesta de clima incompleta");
  const sol = d.time.map((fecha, i) => ({ fecha, sale: d.sunrise?.[i]?.slice(11, 16), pone: d.sunset?.[i]?.slice(11, 16) })).filter((x) => x.sale && x.pone);
  // Chance de lluvia por hora, combinando Open-Meteo y el modelo del SMN sin exagerar (ver chanceFinal)
  const hc = extra.capital?.hourly;
  const capOM = new Map((hc?.time ?? []).map((t, i) => [t, { p: hc.precipitation_probability?.[i], codigo: hc.weather_code?.[i] }]));
  const hayCap = capOM.size > 0 || !!extra.smn?.capital?.length;
  const smnChance = (filas, hora) => { const mm = mmDeHora(filas, hora); return mm == null ? null : chanceSmn(mm); };
  const lluviaLomas = (k) => chanceFinal(h.precipitation_probability[k], smnChance(extra.smn?.lomas, h.time[k]));
  const lluviaCap = (hora) => (hayCap ? chanceFinal(capOM.get(hora)?.p ?? null, smnChance(extra.smn?.capital, hora)) : undefined);
  // Peligros por hora (prudentes, para no avisar de más): tormenta (código de tormenta y chance alta en las dos fuentes),
  // lluvia fuerte (10 mm en una hora o 25 mm en tres, también con chance alta) y ráfagas de 80 km/h o más (solo las da Open-Meteo, por eso el umbral es alto)
  const capIdx = new Map((hc?.time ?? []).map((t, i) => [t, i]));
  const peligrosDe = (arr, k, chance) => {
    const mm1 = arr.precipitation?.[k] ?? 0, mm3 = [0, 1, 2].reduce((s, d) => s + (arr.precipitation?.[k + d] ?? 0), 0);
    const p = [];
    if (arr.weather_code?.[k] >= 95 && chance >= 50) p.push("tormentas fuertes");
    if ((mm1 >= 10 || mm3 >= 25) && chance >= 50) p.push("lluvia fuerte");
    if ((arr.wind_gusts_10m?.[k] ?? 0) >= 80) p.push("ráfagas fuertes");
    return p;
  };
  const desde = h.time.findIndex((t) => t.slice(0, 13) >= c.time.slice(0, 13)); // desde la hora actual
  const horas = h.time.slice(desde, desde + 48).map((hora, i) => ({
    hora,
    temp: h.temperature_2m[desde + i],
    sensacion: h.apparent_temperature[desde + i],
    viento: h.wind_speed_10m[desde + i],
    lluvia: lluviaLomas(desde + i),
    lluviaCap: lluviaCap(hora),
    pL: peligrosDe(h, desde + i, lluviaLomas(desde + i)),
    pC: capIdx.has(hora) ? peligrosDe(hc, capIdx.get(hora), lluviaCap(hora)) : [],
    mm: h.precipitation[desde + i],
    codigo: h.weather_code[desde + i],
    ...(desdeCodigo(h.weather_code[desde + i]) ?? { icono: "nube", etiqueta: "—" }),
  })).map((x) => (esDeNoche(sol, x.hora) ? { ...x, icono: deNoche(x.icono) } : x));
  // Hoy y 5 días más, hora por hora, de 0 a 23, para la pantalla de cada día
  const porDia = d.time.slice(0, 6).map((fecha, i) => {
    const horasDia = h.time.map((hora, k) => ({ hora, k })).filter((x) => x.hora.startsWith(fecha)).map(({ hora, k }) => ({
      hora, temp: h.temperature_2m[k], sensacion: h.apparent_temperature[k], viento: h.wind_speed_10m[k],
      lluvia: lluviaLomas(k), lluviaCap: lluviaCap(hora), mm: h.precipitation[k], codigo: h.weather_code[k],
      icono: (desdeCodigo(h.weather_code[k]) ?? { icono: "nube" }).icono,
    }));
    const lomas = horasDia.length ? textoLluvia(horasDia, "lluvia") : null, cap = horasDia.length ? textoLluvia(horasDia, "lluviaCap") : null;
    const max = Math.max(lomas?.max ?? 0, cap?.max ?? 0);
    return {
      fecha, min: d.temperature_2m_min[i], max: d.temperature_2m_max[i], lluvia: horasDia.length ? max : d.precipitation_probability_max[i],
      palabra: ["No llueve", "Chaparrones aislados", "Probable lluvia", "Llueve"][nivelLluvia(max)],
      ...(desdeCodigo(d.weather_code[i]) ?? { icono: "nube", etiqueta: "—" }),
      lluviaTexto: lomas ? { lomas: lomas.texto, capital: cap?.texto ?? null } : null,
      frase: horasDia.length ? fraseDia(horasDia) : null,
      horas: horasDia.map((x) => ({ hora: x.hora, temp: Math.round(x.temp), sensacion: x.sensacion == null ? null : Math.round(x.sensacion), viento: x.viento == null ? null : Math.round(x.viento), lluvia: x.lluvia, lluviaCap: x.lluviaCap, icono: esDeNoche(sol, x.hora) ? deNoche(x.icono) : x.icono })),
    };
  });
  const dias = porDia.slice(1, 6).map((x) => ({ fecha: x.fecha, min: x.min, max: x.max, lluvia: x.lluvia, palabra: x.palabra, icono: x.icono, etiqueta: x.etiqueta }));
  const actual = ahoraDesdeOpenMeteo(c);
  if (!actual) throw new Error("No hay estado actual del tiempo");
  return { actual, horas, dias, porDia, sol, fuentes: { smn: !!extra.smn?.lomas?.length, capital: hayCap } };
}

// ---- La frase de arriba: reglas fijas, primero la lluvia ----
const FRANJAS = [["de madrugada", 0, 6], ["temprano", 6, 12], ["a la tarde", 12, 19], ["a la noche", 19, 24]]; // nunca "a la mañana": se confunde con el día siguiente
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

  const lluvia = fraseLluvia(ambito);
  if (lluvia) return dicho(lluvia);

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

// Lluvia de lo que queda de hoy (o de mañana, después de las 20) en Lomas y en Capital, para mostrar en el detalle
function textoRestoDelDia(horas, ahora) {
  const hoy = ahora.slice(0, 10), h = Number(ahora.slice(11, 13)), manana = h >= 20;
  const ambito = horas.filter((x) => { const hh = Number(x.hora.slice(11, 13)); return manana ? x.hora.slice(0, 10) === sumarDia(hoy) && hh >= 6 : x.hora.slice(0, 10) === hoy && hh >= h; });
  const a = textoLluvia(ambito, "lluvia"), b = textoLluvia(ambito, "lluviaCap");
  return a ? { lomas: a.texto, capital: b?.texto ?? null } : null;
}

// Aviso propio por pronóstico (no es una alerta oficial): mira las próximas 12 horas en Lomas y en Capital. Null si no hay nada fuerte.
export function avisoTormenta(horas, ahora) {
  const ventana = horas.filter((x) => x.hora.slice(0, 13) >= ahora.slice(0, 13)).slice(0, 12);
  const malas = ventana.filter((x) => x.pL?.length || x.pC?.length);
  if (!malas.length) return null;
  const peligros = ["tormentas fuertes", "lluvia fuerte", "ráfagas fuertes"].filter((p) => malas.some((x) => x.pL?.includes(p) || x.pC?.includes(p)));
  const zonas = [malas.some((x) => x.pL?.length) && "Lomas", malas.some((x) => x.pC?.length) && "Capital"].filter(Boolean);
  const desde = malas[0].hora, ultima = malas[malas.length - 1].hora;
  const franja = franjaDe(Number(desde.slice(11, 13)));
  const empiezaEnHoras = Math.max(0, ventana.findIndex((x) => x.hora === desde));
  const que = unir(peligros);
  const texto = `Pronóstico de ${que} ${franja} en ${unir(zonas)}.`;
  const hastaH = (Number(ultima.slice(11, 13)) + 1) % 24;
  return {
    desde, hasta: ultima, hastaHora: hastaH, peligros, zonas, franja, empiezaEnHoras, texto,
    titulo: peligros.includes("tormentas fuertes") ? "Pronóstico de tormentas fuertes" : `Pronóstico de ${peligros[0]}`,
    cuerpo: `${texto} Asegurá lo que tengas afuera y evitá zonas que se inundan. Es un pronóstico, no una alerta oficial.`,
  };
}

// Junta lo medido (SMN, si hay) con el pronóstico guardado. ahoraAR: "YYYY-MM-DDTHH:mm".
export function componerClima(pron, medido, ahoraAR) {
  const base = medido ?? pron.actual;
  const ahora = esDeNoche(pron.sol, ahoraAR) ? { ...base, icono: deNoche(base.icono) } : base; // de noche, luna en vez de sol
  return {
    ahora,
    frase: armarFrase({ horas: pron.horas, ahora: ahoraAR, ahoraEstado: ahora }),
    lluvia: textoRestoDelDia(pron.horas, ahoraAR),
    tormenta: avisoTormenta(pron.horas, ahoraAR),
    horas: pron.horas,
    dias: pron.dias,
    porDia: pron.porDia,
    pronosticoEn: pron.consultadoEn,
  };
}
