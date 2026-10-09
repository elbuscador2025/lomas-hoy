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
export function leerTren(html, cfg) {
  const m = html.match(/<summary>\s*Línea Roca\s*<\/summary>([\s\S]*?)<\/details>/);
  if (!m) throw new Error("No se encontró la sección de la Línea Roca en la página");
  const alertas = [...m[1].matchAll(
    /class="alert alert-(\w+)"[\s\S]*?<h5[^>]*>([\s\S]*?)<\/h5>\s*<p>([\s\S]*?)<\/p>/g
  )];
  const novedades = [];
  for (const [, nivel, t, d] of alertas) {
    const titulo = decodificar(t);
    const detalle = decodificar(d);
    const texto = `${titulo} ${detalle}`;
    const esNuestra = cfg.tren.palabrasDelPartido.some((p) => texto.includes(p));
    const esAjena = cfg.tren.palabrasAjenas.some((p) => texto.includes(p));
    if (esAjena && !esNuestra) continue;
    const grave = nivel === "danger" || /interrump|suspendid|sin servicio/i.test(texto);
    novedades.push({ gravedad: grave ? "grave" : "aviso", ramal: titulo, motivo: detalle });
  }
  return { novedades };
}

// ---- Luz: mapa de cortes del ENRE ----
export function leerLuz(js, cfg) {
  if (!js.includes("addressPoints_Cuadro_D")) throw new Error("Formato del ENRE no reconocido");
  const cortes = [];
  for (const [, cuerpo] of js.matchAll(/\[\s*-?\d+\.\d+,\s*-?\d+\.\d+,\s*\d+,\s*"([^"]*)"\s*\]/g)) {
    const campo = (nombre) => cuerpo.match(new RegExp(`${nombre}:\s*([^,]*)`))?.[1]?.trim() ?? null;
    if (campo("Partido")?.toUpperCase() !== cfg.luz.partido) continue;
    if (!cuerpo.toUpperCase().includes(cfg.luz.empresa)) continue;
    const usuarios = Number(campo("Usuarios afectados"));
    if (!Number.isFinite(usuarios)) continue;
    cortes.push({
      tension: /MEDIA TENSION/i.test(cuerpo) ? "media" : /BAJA TENSION/i.test(cuerpo) ? "baja" : "otra",
      localidad: campo("Localidad"),
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
