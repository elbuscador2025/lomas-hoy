// Lectores de cada fuente. Si algo no se entiende, devuelven null o tiran error: nunca inventan.

const decodificar = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// ---- Tren: página de Trenes Argentinos ----
const tieneAlguna = (texto, palabras) => palabras.some((p) => texto.includes(p));
const DISRUPCION = /interrump|suspendid|sin servicio|limitad|demora|no circul|cerrad|no llega|no se detien/i;

export function leerTren(html, cfg) {
  const m = html.match(/<summary>\s*Línea Roca\s*<\/summary>([\s\S]*?)<\/details>/);
  if (!m) throw new Error("No se encontró la sección de la Línea Roca en la página");
  const alertas = [...m[1].matchAll(
    /class="alert alert-(\w+)"[\s\S]*?<h5[^>]*>([\s\S]*?)<\/h5>\s*<p>([\s\S]*?)<\/p>/g
  )];
  const novedades = [];
  for (const [, nivel, t, d] of alertas) {
    const ramal = decodificar(t);
    const motivo = decodificar(d);
    // ¿Afecta al partido? Se mira primero el detalle (qué estaciones nombra) y después el ramal del título.
    const nombraPartido = tieneAlguna(motivo, cfg.tren.estaciones.concat(["Lomas"]));
    const nombraAjena = tieneAlguna(motivo, cfg.tren.estacionesAjenas);
    const ramalDelPartido = tieneAlguna(ramal, cfg.tren.palabrasDelPartido);
    const ramalAjeno = tieneAlguna(ramal, cfg.tren.estacionesAjenas);
    const afecta = nombraPartido || (!nombraAjena && (ramalDelPartido || !ramalAjeno));
    if (!afecta) continue;
    // Fechas dd/mm del texto: "Del 10/10 al 13/10", "Hasta el 19/11", "El lunes 12/10".
    const fechas = [...motivo.matchAll(/(\d{1,2})\/(\d{1,2})/g)].map(([, d, mm]) => `${mm.padStart(2, "0")}-${d.padStart(2, "0")}`);
    const hasta = /\bhasta\b/i.test(motivo) && fechas.length === 1;
    const desde = fechas.length === 0 || hasta ? null : fechas[0];
    const fin = fechas.length === 0 ? null : fechas[fechas.length - 1];
    const texto = `${ramal} ${motivo}`;
    novedades.push({
      ramal,
      motivo,
      disrupcion: DISRUPCION.test(texto),
      grave: nivel === "danger" || /interrump|suspendid|sin servicio/i.test(texto),
      desde, // "MM-DD" o null
      hasta: fin, // "MM-DD" o null (sin fecha = rige ahora, hasta nuevo aviso)
    });
  }
  return { novedades };
}

// ---- Luz: mapa de cortes del ENRE ----
export function leerLuz(js, cfg) {
  if (!js.includes("addressPoints_Cuadro_D")) throw new Error("Formato del ENRE no reconocido");
  const cortes = [];
  for (const [, cuerpo] of js.matchAll(/\[\s*-?\d+\.\d+,\s*-?\d+\.\d+,\s*\d+,\s*"([^"]*)"\s*\]/g)) {
    const campo = (nombre) => cuerpo.match(new RegExp(`${nombre}:\\s*([^,]*)`))?.[1]?.trim() ?? null;
    if (campo("Partido")?.toUpperCase() !== cfg.luz.partido) continue;
    if (!cuerpo.toUpperCase().includes(cfg.luz.empresa)) continue;
    const usuarios = Number(campo("Usuarios afectados"));
    if (!Number.isFinite(usuarios)) continue;
    cortes.push({
      tension: /MEDIA TENSION/i.test(cuerpo) ? "media" : /BAJA TENSION/i.test(cuerpo) ? "baja" : "otra",
      localidad: campo("Localidad")?.replace(/^LAVALLOL$/i, "LLAVALLOL") ?? null,
      usuarios,
      normalizacion: cuerpo.match(/normalizacion:\s*([\d-]+ [\d:]+)/)?.[1] ?? null, // hora de Argentina
    });
  }
  const total = js.match(/EDESUR<\/h3><p>\s*(\d+) usuarios/)?.[1];
  const informado = js.match(/Informacion obtenida el dia ([^<]*?) hs/)?.[1] ?? null;
  return { cortes, informadoPorEnre: informado, totalEdesur: total ? Number(total) : null };
}

// ---- Clima: Open-Meteo ----
export function leerClima(json) {
  const c = json?.current;
  const h = json?.hourly;
  if (!c || !h?.time?.length) throw new Error("Respuesta de clima incompleta");
  const desde = h.time.findIndex((t) => t > c.time);
  const inicio = desde === -1 ? h.time.length : desde;
  const horas = h.time.slice(inicio, inicio + 24).map((hora, i) => ({
    hora,
    temp: h.temperature_2m[inicio + i],
    codigo: h.weather_code[inicio + i],
    lluvia: h.precipitation_probability[inicio + i],
  }));
  return {
    ahora: {
      temp: c.temperature_2m,
      sensacion: c.apparent_temperature,
      humedad: c.relative_humidity_2m,
      viento: c.wind_speed_10m,
      codigo: c.weather_code,
    },
    horas,
  };
}

export const urlClima = (cfg) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${cfg.clima.latitud}&longitude=${cfg.clima.longitud}` +
  `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
  `&hourly=temperature_2m,weather_code,precipitation_probability&forecast_days=2` +
  `&timezone=${encodeURIComponent(cfg.zonaHoraria)}`;

// ---- Colectivos: titulares de diarios (RSS público) ----
const sinTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const escapar = (s) => s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const palabras = (lista, sinAcentos = true) => new RegExp(`\\b(${lista.map((p) => escapar(sinAcentos ? sinTildes(p) : p)).join("|")})\\b`);

export function leerRss(xml, medio) {
  return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)].map(([item]) => {
    const campo = (c) => item.match(new RegExp(`<${c}[^>]*>([\\s\\S]*?)</${c}>`))?.[1]
      ?.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, "").trim();
    return { titular: decodificar(campo("title") ?? ""), link: campo("link") ?? "", fecha: new Date(campo("pubDate") ?? campo("dc:date") ?? ""), medio };
  });
}

export function buscarParos(notas, cfg, ahora = new Date()) {
  const c = cfg.colectivos;
  const paro = palabras(c.palabrasParo, false), bus = palabras(c.palabrasColectivos), ajeno = palabras(c.lugaresAjenos);
  const vistos = new Set();
  return notas
    .filter((n) => n.titular && n.link && !Number.isNaN(n.fecha.getTime()))
    .filter((n) => ahora - n.fecha <= c.diasMaximos * 86400_000 && n.fecha - ahora < 86400_000)
    .filter((n) => { const t = sinTildes(n.titular); return paro.test(n.titular.toLowerCase()) && bus.test(t) && !ajeno.test(t); })
    .filter((n) => !vistos.has(n.link) && vistos.add(n.link))
    .sort((a, b) => b.fecha - a.fecha)
    .map((n) => ({ titular: n.titular, medio: n.medio, link: n.link, fecha: n.fecha.toISOString() }));
}
