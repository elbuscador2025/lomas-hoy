// Alertas oficiales del Servicio Meteorológico Nacional (SMN), por tormentas, lluvias o viento, para Lomas de Zamora y la Ciudad de Buenos Aires.
// Fuente: el feed CAP que el SMN registró en la OMM (https://ssl.smn.gob.ar/CAP/AR.php): una lista de avisos, cada uno con su archivo CAP
// (nivel, horario, descripción, consejos y el polígono de la zona afectada). Se mira si Lomas o la Ciudad quedan dentro del polígono.

const entidades = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
const campo = (xml, nombre) => entidades(xml.match(new RegExp(`<${nombre}>([\\s\\S]*?)</${nombre}>`))?.[1]?.trim() ?? "");
const aAR = (iso) => (Number.isNaN(Date.parse(iso)) ? null : new Date(Date.parse(iso) - 3 * 3600_000).toISOString().slice(0, 16)); // "YYYY-MM-DDTHH:mm" hora de Argentina

// Los links a los archivos CAP que figuran en el feed (el nombre trae cuándo se generó: CAP_AAAAMMDDhhmmss_...)
// El SMN limita a 200 pedidos cada 10 minutos: se leen solo los de la llanura (donde está Lomas) por tormentas, lluvias, viento o granizo,
// y de cada tipo solo las dos tandas más nuevas (los avisos se actualizan con tandas nuevas).
export function linksDelFeed(html, ahora = new Date(), horasAtras = 48) {
  const limite = ahora.getTime() - horasAtras * 3600_000;
  const todos = [...new Set([...html.matchAll(/href="(https:\/\/[^"]*\/xml_generados\/CAP_(\d{14})_([A-Za-z]+)_Llanura_[^"]*\.xml)"/g)]
    .filter(([, , t, tipo]) => /tormenta|lluvia|viento|granizo/i.test(tipo) && Date.parse(`${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}T${t.slice(8, 10)}:${t.slice(10, 12)}:${t.slice(12, 14)}-03:00`) >= limite)
    .map(([, url, t, tipo]) => JSON.stringify([url, t, tipo])))].map((s) => JSON.parse(s));
  const tandas = new Map();
  for (const [, t, tipo] of todos) tandas.set(tipo, [...new Set([...(tandas.get(tipo) ?? []), t])].sort().reverse().slice(0, 2));
  return todos.filter(([, t, tipo]) => tandas.get(tipo).includes(t)).map(([url]) => url);
}

// ¿El punto (lat, lng) está dentro del polígono "lat,lng lat,lng ..."? (rayo)
export function dentroDe(poligono, lat, lng) {
  const p = poligono.trim().split(/\s+/).map((x) => x.split(",").map(Number)).filter((x) => x.length === 2 && x.every(Number.isFinite));
  let dentro = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [yi, xi] = p[i], [yj, xj] = p[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

const NIVELES = { Moderate: "amarilla", Severe: "naranja", Extreme: "roja" }; // niveles del SMN según la severidad CAP
const PESO = { amarilla: 1, naranja: 2, roja: 3 };

// Un archivo CAP → { evento, nivel, desde, hasta, descripcion, instruccion, zonas } (null si no es de tormentas, lluvias o viento, o no toca a Lomas ni a la Ciudad)
export function leerCap(xml, puntos) {
  if (!xml.includes("<alert")) return null;
  const evento = campo(xml, "event") || campo(xml, "headline");
  if (!/tormenta|lluvia|viento|granizo/i.test(evento)) return null;
  if (/Cancel/i.test(campo(xml, "msgType")) || /Excercise|Test/i.test(campo(xml, "status"))) return null;
  const nivel = NIVELES[campo(xml, "severity")];
  if (!nivel) return null; // Minor / Unknown: no es un alerta de nivel amarillo o más
  const poligonos = [...xml.matchAll(/<polygon>([\s\S]*?)<\/polygon>/g)].map((m) => m[1]);
  const zonas = puntos.filter((pt) => poligonos.some((pol) => dentroDe(pol, pt.lat, pt.lng))).map((pt) => pt.nombre);
  if (!zonas.length) return null;
  return {
    id: campo(xml, "identifier"), evento, nivel, desde: aAR(campo(xml, "onset") || campo(xml, "effective") || campo(xml, "sent")), hasta: aAR(campo(xml, "expires")),
    descripcion: campo(xml, "description"), instruccion: campo(xml, "instruction"), zonas,
  };
}

// traer(url) → texto. Devuelve las alertas vigentes (o por empezar en las próximas 12 horas) que tocan Lomas o la Ciudad.
export async function leerAlertas(traer, cfg, ahora = new Date()) {
  const html = await traer(cfg.alertas.url);
  if (!html.includes("RSS CAP") && !html.includes("xml_generados")) throw new Error("Formato del feed CAP del SMN no reconocido");
  const links = linksDelFeed(html, ahora, cfg.alertas.horasAtras);
  const lecturas = await Promise.allSettled(links.map(async (u) => leerCap(await traer(u), cfg.alertas.puntos)));
  if (links.length && lecturas.every((l) => l.status === "rejected")) throw new Error("No se pudo leer ningún aviso CAP del SMN"); // se conserva el último dato bueno
  const hoy = aAR(ahora.toISOString()), limite = aAR(new Date(ahora.getTime() + 12 * 3600_000).toISOString());
  const vigentes = lecturas.flatMap((l) => (l.status === "fulfilled" && l.value ? [l.value] : []))
    .filter((a) => a.hasta && a.hasta >= hoy && (!a.desde || a.desde <= limite));
  // El mismo aviso se actualiza con identificadores nuevos: queda uno por evento y nivel (el más largo)
  const unicas = new Map();
  for (const a of vigentes) { const k = `${a.evento}|${a.nivel}`; if (!unicas.has(k) || a.hasta > unicas.get(k).hasta) unicas.set(k, a); }
  return { alertas: [...unicas.values()].sort((a, b) => PESO[b.nivel] - PESO[a.nivel]), leidas: links.length, fallidas: lecturas.filter((l) => l.status === "rejected").length };
}
