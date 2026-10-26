// Lectores de cada fuente. Si algo no se entiende, devuelven null o tiran error: nunca inventan.
import { createHash } from "node:crypto";

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
  for (const [, lat, lng, cuerpo] of js.matchAll(/\[\s*(-?\d+\.\d+),\s*(-?\d+\.\d+),\s*\d+,\s*"([^"]*)"\s*\]/g)) {
    const campo = (nombre) => cuerpo.match(new RegExp(`${nombre}:\\s*([^,]*)`))?.[1]?.trim() ?? null;
    if (campo("Partido")?.toUpperCase() !== cfg.luz.partido) continue;
    if (!cuerpo.toUpperCase().includes(cfg.luz.empresa)) continue;
    const usuarios = Number(campo("Usuarios afectados"));
    if (!Number.isFinite(usuarios)) continue;
    cortes.push({
      tension: /MEDIA TENSION/i.test(cuerpo) ? "media" : /BAJA TENSION/i.test(cuerpo) ? "baja" : "otra",
      localidad: campo("Localidad")?.replace(/^LAVALLOL$/i, "LLAVALLOL") ?? null,
      usuarios,
      lat: Number(lat), lng: Number(lng), // punto que informa el ENRE para ese corte (sirve para ubicar la localidad en el mapa)
      normalizacion: cuerpo.match(/normalizacion:\s*([\d-]+ [\d:]+)/)?.[1] ?? null, // hora de Argentina
    });
  }
  const total = js.match(/EDESUR<\/h3><p>\s*(\d+) usuarios/)?.[1];
  const informado = js.match(/Informacion obtenida el dia ([^<]*?) hs/)?.[1] ?? null;
  return { cortes, informadoPorEnre: informado, totalEdesur: total ? Number(total) : null };
}

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

// A quién afecta un paro, según el titular: una o varias líneas, una empresa, o todo el AMBA
export function alcanceParo(titular) {
  const t = sinTildes(titular);
  const lineas = t.match(/\blineas?\s+((?:\d{1,3}\s*(?:,|y|e)?\s*)+)/);
  const nums = lineas ? lineas[1].match(/\d{1,3}/g) : null;
  if (nums?.length === 1) return { alcance: `línea ${nums[0]}`, resumen: `Paro de la línea ${nums[0]}` };
  if (nums?.length > 1) { const l = nums.slice(0, -1).join(", ") + " y " + nums[nums.length - 1]; return { alcance: `líneas ${l}`, resumen: `Paro de las líneas ${l}` }; }
  const empresa = titular.match(/\bempresa\s+([A-ZÁÉÍÓÚ][\wÁÉÍÓÚáéíóúñ.]*(?:\s+[A-ZÁÉÍÓÚ][\wÁÉÍÓÚáéíóúñ.]*)?)/);
  if (empresa) return { alcance: `empresa ${empresa[1]}`, resumen: `Paro en la empresa ${empresa[1]}` };
  if (/\buta\b|\bamba\b|area metropolitana|gran buenos aires|conurbano|todo el pais|capital federal|colectivos del/.test(t)) return { alcance: "todo el AMBA", resumen: "Paro de colectivos en todo el AMBA" };
  return { alcance: "colectivos del AMBA", resumen: "Paro de colectivos" };
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
    .map((n) => ({ titular: n.titular, medio: n.medio, link: n.link, fecha: n.fecha.toISOString(), ...alcanceParo(n.titular) }));
}

// ---- Cortes programados de Edesur ----
const distancia = (a, b) => {
  const f = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) f[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      f[i][j] = Math.min(f[i - 1][j] + 1, f[i][j - 1] + 1, f[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return f[a.length][b.length];
};
const CAJA = { latMin: -34.86, latMax: -34.68, lngMin: -58.52, lngMax: -58.3 }; // alrededor del partido
const fechaEdesur = (s) => { // "09/10/2026 08:00:00" (hora de Argentina) -> "2026-10-09T08:00"
  const m = String(s ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}` : null;
};
const ahoraArgentina = (zona, ahora) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: zona, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(ahora).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
};

// Se queda con los cortes del partido que todavía no terminaron. Edesur escribe la localidad a su manera
// ("BANDFIELD"): se acepta igual si es la misma salvo una letra. Si algo no se entiende, se descarta (no se inventa).
export function leerProgramados(json, cfg, ahora = new Date()) {
  if (!Array.isArray(json)) throw new Error("Formato de Edesur no reconocido");
  const nombres = cfg.localidades.map((n) => ({ canon: n, norm: sinTildes(n) }));
  const ahoraAR = ahoraArgentina(cfg.zonaHoraria, ahora);
  const limite = ahoraArgentina(cfg.zonaHoraria, new Date(ahora.getTime() + cfg.programados.diasAdelante * 86400_000));
  const salida = new Map();
  for (const x of json) {
    const loc = sinTildes(String(x.localidad ?? "")).replace(/\s+/g, " ").trim();
    const n = nombres.find((k) => loc === k.norm || loc.startsWith(k.norm + " ") || (k.norm.length >= 7 && distancia(loc, k.norm) <= 1));
    const lat = Number(x.latitud), lng = Number(x.longitud);
    if (!n || !(lat > CAJA.latMin && lat < CAJA.latMax && lng > CAJA.lngMin && lng < CAJA.lngMax)) continue;
    const inicio = fechaEdesur(x.fechaInicio), fin = fechaEdesur(x.fechaFin);
    if (!inicio || !fin || fin < ahoraAR || inicio > limite) continue;
    const clientes = Number(x.clientesAfectados);
    const id = createHash("sha1").update([n.canon, x.latitud, x.longitud, clientes, x.motivo].join("|")).digest("hex").slice(0, 12);
    if (!salida.has(`${id}|${inicio}|${fin}`))
      salida.set(`${id}|${inicio}|${fin}`, { id, localidad: n.canon, lat, lng, inicio, fin, clientes: Number.isFinite(clientes) ? clientes : null, motivo: decodificar(String(x.motivo ?? "")) });
  }
  return { cortes: [...salida.values()].sort((a, b) => a.inicio.localeCompare(b.inicio)) };
}

// ---- Cortes de agua: titulares de diarios (AySA no tiene una fuente que se pueda leer sola) ----
// El titular tiene que hablar de un corte de agua (o de AySA) y nombrar Lomas o una localidad del partido. Nada más: no se inventa horario ni zona.
export function buscarAgua(notas, cfg, ahora = new Date()) {
  const c = cfg.agua;
  const corte = palabras(c.palabrasCorte);
  const lugares = [...cfg.localidades.map((n) => ({ canon: n, re: palabras([n]) })), ...c.palabrasLugar.map((n) => ({ canon: cfg.ciudad, re: palabras([n]) }))];
  const vistos = new Set();
  return notas
    .filter((n) => n.titular && n.link && !Number.isNaN(n.fecha.getTime()))
    .filter((n) => ahora - n.fecha <= c.diasMaximos * 86400_000 && n.fecha - ahora < 86400_000)
    .map((n) => { const t = sinTildes(n.titular); return corte.test(t) ? { n, lugar: lugares.map((l) => ({ ...l, pos: t.search(l.re) })).filter((l) => l.pos >= 0).sort((x, y) => x.pos - y.pos)[0] } : null; })
    .filter((x) => x && x.lugar)
    .filter((x) => !vistos.has(x.n.link) && vistos.add(x.n.link))
    .sort((a, b) => b.n.fecha - a.n.fecha)
    .map(({ n, lugar }) => ({ titular: n.titular, medio: n.medio, link: n.link, fecha: n.fecha.toISOString(), localidad: lugar.canon }));
}

// ---- Subte: estado de las líneas según la API de transporte de la Ciudad (alertas de servicio, formato GTFS-realtime en JSON) ----
// Hace falta una clave gratuita (client_id y client_secret). Si el formato no se entiende, tira error y no se pisa el último dato bueno.
const texto1 = (x) => { const t = x?.translation; return Array.isArray(t) ? (t.find((k) => /es/i.test(k.language ?? "")) ?? t[0])?.text ?? "" : ""; };
const lineaDe = (s) => {
  const m = String(s ?? "").match(/premetro|\blinea\s*([a-eh])\b|^linea\s*([a-eh])$|^([a-eh])$/i);
  return !m ? null : /premetro/i.test(m[0]) ? "Premetro" : (m[1] ?? m[2] ?? m[3]).toUpperCase();
};
export function leerSubte(json, cfg, ahora = new Date()) {
  const entidades = json?.entity ?? json?.entities;
  if (!Array.isArray(entidades)) throw new Error("Formato de la API del subte no reconocido");
  const lineas = cfg.subte.lineas.map((id) => ({ id, estado: "normal", texto: "", desde: null }));
  const peor = { normal: 0, demora: 1, interrumpida: 2, paro: 3 };
  for (const e of entidades) {
    const a = e.alert ?? e;
    const titulo = texto1(a.header_text), detalle = texto1(a.description_text);
    const todo = sinTildes(`${titulo} ${detalle}`);
    const periodos = a.active_period ?? [];
    const inicio = Number(periodos[0]?.start) ? new Date(Number(periodos[0].start) * 1000) : null, fin = Number(periodos[0]?.end) ? new Date(Number(periodos[0].end) * 1000) : null;
    if (fin && fin < ahora) continue; // ya terminó
    if (inicio && inicio > new Date(ahora.getTime() + 6 * 3600_000)) continue; // todavía falta mucho
    let afectadas = (a.informed_entity ?? []).map((i) => lineaDe(i.route_id ?? i.routeId)).filter(Boolean);
    if (!afectadas.length) {
      afectadas = [...new Set([...todo.matchAll(/linea\s*([a-eh])\b/g)].map((m) => m[1].toUpperCase()).concat(/premetro/.test(todo) ? ["Premetro"] : []))];
      if (!afectadas.length && /todas las lineas/.test(todo)) afectadas = lineas.map((l) => l.id);
    }
    const efecto = String(a.effect ?? "").toUpperCase();
    const estado = /\bpar[o]\b|medida de fuerza|asamblea/.test(todo) ? "paro"
      : efecto === "NO_SERVICE" || efecto === "1" || /interrump|sin servicio|suspendid|cerrad|no funciona/.test(todo) ? "interrumpida"
      : "demora";
    for (const id of new Set(afectadas)) {
      const l = lineas.find((x) => x.id === id);
      if (!l || peor[estado] <= peor[l.estado]) continue;
      l.estado = estado; l.texto = (detalle || titulo).trim().slice(0, 240); l.desde = inicio ? inicio.toISOString() : null;
    }
  }
  return { lineas };
}

// ---- Noticias de Lomas: título, diario y enlace de cada nota (sin copiar la nota) ----
const sentencia = (t) => (t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(t) ? t.charAt(0) + t.slice(1).toLowerCase() : t); // "AYSA QUIERE SUBIR..." → "Aysa quiere subir..."
export function armarNoticias(porDiario, maximo = 30) {
  const vistos = new Set();
  const notas = porDiario.flatMap((x) => x)
    .filter((n) => n.titular && /^https?:\/\//.test(n.link) && !Number.isNaN(n.fecha.getTime()))
    .map((n) => ({ titulo: sentencia(n.titular.replace(/\s+/g, " ").trim()).slice(0, 220), link: n.link, medio: n.medio, fecha: n.fecha.toISOString() }))
    .filter((n) => { if (vistos.has(n.link)) return false; vistos.add(n.link); return true; })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  return notas.slice(0, maximo);
}
