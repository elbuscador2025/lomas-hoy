import { config } from "@/lomas.config.mjs";
import { vigenteMascota, type MascotaPublica } from "@/lib/mascotas-comun";
import { vigenteTrueque, type TruequePublico } from "@/lib/trueque-comun";
import { vigenteTrabajo, type PublicacionTrabajo } from "@/lib/trabajo-comun";
import type { PagoAnses } from "@/lib/anses";
export type Fila<T> = { clave: string; contenido: T | null; ok_en: string | null; intento_en: string | null; error: string | null };
export type AvisoTren = {
  ramal: string; motivo: string; disrupcion: boolean; grave: boolean;
  desde: string | null; hasta: string | null; // "MM-DD"
};
export type Tren = { novedades: AvisoTren[] };
export type Luz = {
  cortes: { tension: "media" | "baja" | "otra"; localidad: string | null; usuarios: number; normalizacion: string | null; lat?: number; lng?: number; subestacion?: string | null; alimentador?: string | null; barrio?: string | null; calle?: string | null }[]; // barrio y calle los agrega el sitio (OpenStreetMap) a partir del punto que informa el ENRE
};
export type EstadoClima = { icono: string; etiqueta: string };
export type HoraClima = { hora: string; temp: number; sensacion: number | null; viento: number | null; lluvia: number | null; lluviaCap?: number } & EstadoClima;
export type DiaClima = { fecha: string; min: number; max: number; lluvia: number | null; palabra: string } & EstadoClima;
export type HoraDia = { hora: string; temp: number; sensacion: number | null; viento: number | null; lluvia: number | null; lluviaCap?: number; mm?: number; etiqueta?: string; icono: string };
export type DiaDetalle = { fecha: string; min: number; max: number; lluvia: number | null; palabra: string; icono: string; etiqueta: string; frase: string | null; lluviaTexto?: { lomas: string; capital: string | null } | null; horas: HoraDia[] };
export type AvisoTormenta = { desde: string; hasta: string; hastaHora: number; peligros: string[]; zonas: string[]; franja: string; empiezaEnHoras: number; texto: string; titulo: string; cuerpo: string };
export type Clima = {
  ahora: {
    temp: number; sensacion: number | null; humedad: number | null; viento: number | null;
    medidoEn: string | null; estacion: string | null; medidoISO?: string | null; estaciones?: string[] | null; // si vino del SMN: "HH:MM" y estación
  } & EstadoClima;
  frase: string | null; // "Llueve a la tarde, llevá paraguas"
  lluvia?: { lomas: string; capital: string | null } | null; // la lluvia de lo que queda de hoy, en Lomas y en Capital
  tormenta?: AvisoTormenta | null; // aviso propio por pronóstico (no oficial): tormentas, lluvia o ráfagas fuertes en las próximas 12 horas
  horas: HoraClima[]; // desde la hora actual, hasta 48
  dias: DiaClima[];
  porDia?: DiaDetalle[]; // hoy y 5 días más, hora por hora (puede faltar hasta la próxima vuelta del proceso automático)
  pronosticoEn: string;
};
export type Colectivos = {
  paros: { titular: string; medio: string; link: string; fecha: string; alcance?: string; resumen?: string }[];
  diariosLeidos: string[]; diariosSinLeer: string[];
};
export type Programados = { cortes: { id: string; localidad: string; lat?: number; lng?: number; inicio: string; fin: string; clientes: number | null; motivo: string }[] };
// Cortes de agua: cargados a mano (con desde y hasta) o notas de diarios (sin horario: desde y hasta vacíos).
export type CorteAgua = { id: string; localidad: string; zona: string; desde: string | null; hasta: string | null; motivo: string; fuente: string; fecha: string; link?: string; barrios?: string[]; cuando?: string | null };
// Cómo se dice un aviso de corte de agua de un diario: los barrios que nombra la nota (hasta 4 y "y otros") y el día u horario si lo dice.
export function textoCorteAgua(c: { barrios?: string[]; cuando?: string | null }) {
  const b = c.barrios ?? [];
  if (!b.length) return { linea: "💧 Corte de agua en Lomas · tocá para ver las zonas", notif: "💧 Corte de agua en Lomas: tocá para ver las zonas" };
  const lista = b.length > 4 ? `${b.slice(0, 4).join(", ")} y otros` : b.join(", ");
  return { linea: `💧 Corte de agua: ${lista}${c.cuando ? ` · ${c.cuando}` : ""}`, notif: `💧 Corte de agua: ${lista}` };
}
export type Agua = { cortes: CorteAgua[]; diariosSinLeer: string[] };
export type Lugar = {
  id: string; categoria: string; nombre: string; direccion: string; localidad: string;
  telefonos: string[]; horario: string; etiqueta?: string; fuente: string; fuenteUrl: string; lat?: number; lng?: number;
};
export type Subte = { lineas: { id: string; estado: "normal" | "demora" | "interrumpida" | "paro"; texto: string; desde: string | null }[] };
export type AlertaSmn = { id: string; evento: string; nivel: "amarilla" | "naranja" | "roja"; desde: string | null; hasta: string; descripcion: string; instruccion: string; zonas: string[] };
export type Alertas = { alertas: AlertaSmn[]; leidas: number; fallidas: number };
export type Noticias = { notas: { titulo: string; link: string; medio: string; fecha: string }[]; diariosLeidos: string[]; diariosSinLeer: string[] };
export type Todo = { quiniela?: Fila<import("@/lib/quiniela-comun").Quiniela>; quini6?: Fila<import("@/lib/quiniela-comun").Quini6>; noticias?: Fila<Noticias>; alertas?: Fila<Alertas>; subte?: Fila<Subte>; tren?: Fila<Tren>; luz?: Fila<Luz>; clima?: Fila<Clima>; colectivos?: Fila<Colectivos>; programados?: Fila<Programados>; agua?: Fila<Agua> };

const CLAVE_CACHE = "lomas-hoy:datos";
const CLAVE_LUGARES = "lomas-hoy:lugares";
const CLAVE_MASCOTAS = "lomas-hoy:mascotas";
const CLAVE_TRUEQUE = "lomas-hoy:trueque";
const CLAVE_TRABAJO = "lomas-hoy:trabajo";
const CLAVE_ANSES = "lomas-hoy:anses";

const leerCache = <T,>(clave: string, vacio: T): T => {
  try { return JSON.parse(localStorage.getItem(clave) ?? "null") ?? vacio; } catch { return vacio; }
};
const guardarCache = (clave: string, valor: unknown) => {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch {}
};

// Lee del sitio (que lee la base); si no hay internet, devuelve lo último que se guardó en el celu.
export type Anses = { entradas: PagoAnses[]; actualizado: string | null };
export async function cargarDatos(): Promise<{ datos: Todo; lugares: Lugar[]; mascotas: MascotaPublica[]; trueque: TruequePublico; trabajo: PublicacionTrabajo[]; anses: Anses; sinConexion: boolean }> {
  const [d, l, m, t, tb, a] = await Promise.allSettled([
    fetch("/api/datos").then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<Fila<unknown>[]>; }),
    fetch("/api/lugares").then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<Lugar[]>; }),
    fetch("/api/mascotas").then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<MascotaPublica[]>; }),
    fetch("/api/trueque").then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<TruequePublico>; }),
    fetch("/api/trabajo").then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<PublicacionTrabajo[]>; }),
    fetch("/api/anses").then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<Anses>; }),
  ]);
  let datos: Todo, lugares: Lugar[], mascotas: MascotaPublica[], trueque: TruequePublico, trabajo: PublicacionTrabajo[], anses: Anses;
  if (d.status === "fulfilled") {
    datos = Object.fromEntries(d.value.map((f) => [f.clave, f])) as Todo;
    guardarCache(CLAVE_CACHE, datos);
  } else datos = leerCache<Todo>(CLAVE_CACHE, {});
  if (l.status === "fulfilled") {
    lugares = l.value;
    guardarCache(CLAVE_LUGARES, lugares);
  } else lugares = leerCache<Lugar[]>(CLAVE_LUGARES, []);
  if (m.status === "fulfilled") {
    mascotas = m.value;
    guardarCache(CLAVE_MASCOTAS, mascotas);
  } else mascotas = leerCache<MascotaPublica[]>(CLAVE_MASCOTAS, []);
  mascotas = mascotas.filter((x) => vigenteMascota(x));
  if (t.status === "fulfilled") {
    trueque = t.value;
    guardarCache(CLAVE_TRUEQUE, trueque);
  } else trueque = leerCache<TruequePublico>(CLAVE_TRUEQUE, { publicaciones: [], ferias: [] });
  trueque = { ...trueque, publicaciones: trueque.publicaciones.filter((x) => vigenteTrueque(x)) };
  if (tb.status === "fulfilled") {
    trabajo = tb.value;
    guardarCache(CLAVE_TRABAJO, trabajo);
  } else trabajo = leerCache<PublicacionTrabajo[]>(CLAVE_TRABAJO, []);
  trabajo = trabajo.filter((x) => vigenteTrabajo(x));
  if (a.status === "fulfilled") {
    anses = a.value;
    guardarCache(CLAVE_ANSES, anses);
  } else anses = leerCache<Anses>(CLAVE_ANSES, { entradas: [], actualizado: null });
  lugares = lugares.map((x) => (x.localidad === "General Lamadrid" ? { ...x, localidad: "Villa Lamadrid" } : x)); // así lo conocen los vecinos
  return { datos, lugares, mascotas, trueque, trabajo, anses, sinConexion: d.status === "rejected" && l.status === "rejected" };
}

export const ZONA = "America/Argentina/Buenos_Aires";
export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-AR", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false });
export const fechaLarga = () =>
  new Date().toLocaleDateString("es-AR", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" }).replace(",", "");
// "MM-DD" de hoy en Argentina
export const hoyMMDD = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, month: "2-digit", day: "2-digit" }).format(new Date()).replace("/", "-");

export type Novedad = { id: string; vista: "tren" | "luz"; gravedad: "grave" | "aviso"; titulo: string; detalle: string };

// Tren: arriba lo que pasa HOY (interrupción, demora o servicio limitado de un solo día o sin fecha de fin);
// abajo "Obras y avisos" (lo que dura varios días, o no es una interrupción). Lo ya vencido se descarta.
export function clasificarTren(avisos: AvisoTren[], hoy: string) {
  const delDia: AvisoTren[] = [], obras: AvisoTren[] = [];
  for (const a of avisos) {
    if (a.hasta && a.hasta < hoy && !(a.desde && a.desde > a.hasta)) continue; // ya pasó
    const rigeHoy = (!a.desde || a.desde <= hoy) && (!a.hasta || a.hasta >= hoy);
    const variosDias = !!a.hasta && a.hasta !== (a.desde ?? a.hasta) || (!a.desde && !!a.hasta && a.hasta !== hoy);
    (a.disrupcion && rigeHoy && !variosDias ? delDia : obras).push(a);
  }
  return { delDia, obras };
}

export function armarNovedades(d: Todo, luz: { alertaDesdeUsuarios: number; graveDesdeUsuarios: number }, activas: { tren: boolean; luz: boolean }) {
  const novedades: Novedad[] = [];
  const normales: string[] = [];
  if (activas.tren && d.tren?.contenido) {
    const { delDia } = clasificarTren(d.tren.contenido.novedades, hoyMMDD());
    delDia.forEach((x, i) =>
      novedades.push({ id: `tren${i}`, vista: "tren", gravedad: x.grave ? "grave" : "aviso", titulo: `Roca: ${x.ramal}`, detalle: x.motivo }));
  }
  if (activas.luz && d.luz?.contenido) {
    for (const a of eventosLuz(d.luz.contenido.cortes)) {
      if (a.usuarios < luz.alertaDesdeUsuarios) continue; // los cortes chicos solo se ven dentro de Luz
      novedades.push({
        vista: "luz",
        id: `luz${a.id}`,
        gravedad: a.usuarios >= luz.graveDesdeUsuarios ? "grave" : "aviso",
        titulo: a.titulo,
        detalle: `${a.usuarios} ${a.usuarios === 1 ? "usuario afectado" : "usuarios afectados"}` + (a.hasta ? ` · hasta las ${a.hasta.slice(11, 16)} hs` : ""),
      });
    }
  }
  novedades.sort((a, b) => (a.gravedad === b.gravedad ? 0 : a.gravedad === "grave" ? -1 : 1));
  return { novedades, normales };
}

export const nombreLindo = (s: string) =>
  s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()).replace(/^Lavallol$/, "Llavallol");

// ---- Lugares ----
// "claves" son palabras extra con las que el buscador también encuentra la categoría.
export const CATEGORIAS: { id: string; titulo: string; claves?: string }[] = [
  { id: "guardias", titulo: "Guardias médicas y hospitales", claves: "hospital guardia urgencia" },
  { id: "salitas", titulo: "Salitas (centros de salud)", claves: "salita sala centro de salud caps" },
  { id: "veterinarias", titulo: "Veterinarias y salud animal", claves: "veterinaria veterinario perro gato mascota zoonosis animal" },
  { id: "comisarias", titulo: "Comisarías" },
  { id: "bomberos", titulo: "Bomberos" },
  { id: "servicios", titulo: "Servicios y reclamos" },
];

export const telLink = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;
export const mapaLink = (l: Lugar) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${l.direccion}, ${l.localidad}, Lomas de Zamora, Buenos Aires, Argentina`)}`;

// "a 3 cuadras" (una cuadra ≈ 100 m) o "a 2,5 km"
export function distanciaTexto(km: number) {
  if (km < 1) { const c = Math.max(1, Math.round(km * 10)); return `a ${c} ${c === 1 ? "cuadra" : "cuadras"}`; }
  return `a ${km < 10 ? km.toFixed(1).replace(".", ",").replace(",0", "") : Math.round(km)} km`;
}

export function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180, R = 6371;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Con ubicación: los que tienen coordenadas van primero, por cercanía. Sin ubicación: por nombre.
export function ordenarLugares(ls: Lugar[], yo: { lat: number; lng: number } | null) {
  const nombre = (a: Lugar, b: Lugar) => a.nombre.localeCompare(b.nombre, "es");
  if (!yo) return [...ls].sort(nombre);
  const km = (l: Lugar) => (l.lat != null && l.lng != null ? distanciaKm(yo, { lat: l.lat, lng: l.lng }) : Infinity);
  return [...ls].sort((a, b) => km(a) - km(b) || nombre(a, b));
}

export const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Fila de horas: "Ahora" y las 24 horas siguientes a la hora actual de Argentina.
export function proximasHoras(c: Clima, ahoraAR: string): HoraClima[] {
  const actual = c.horas.find((h) => h.hora.slice(0, 13) === ahoraAR.slice(0, 13));
  const siguientes = c.horas.filter((h) => h.hora.slice(0, 13) > ahoraAR.slice(0, 13)).slice(0, 24);
  return [{ hora: "Ahora", temp: c.ahora.temp, sensacion: c.ahora.sensacion, viento: c.ahora.viento, icono: c.ahora.icono, etiqueta: c.ahora.etiqueta, lluvia: actual?.lluvia ?? null, lluviaCap: actual?.lluviaCap }, ...siguientes];
}

// Búsqueda del buscador en Google Maps: se agrega "en Lomas de Zamora" salvo que la persona ya lo haya escrito.
export function mapaBuscador(texto: string, yo: { lat: number; lng: number } | null, centro: { lat: number; lng: number }, ciudad: string) {
  const q = normalizar(texto).includes(normalizar(ciudad)) ? texto : `${texto} en ${ciudad}`;
  const c = yo ?? centro;
  return `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${c.lat.toFixed(5)},${c.lng.toFixed(5)},${yo ? 15 : 13}z`;
}

// Búsqueda en Google Maps siempre con zona: centrada en la persona si dio permiso de ubicación;
// si no, buscando "... en Lomas de Zamora" y centrada en el partido.
export function mapaBusqueda(texto: string, yo: { lat: number; lng: number } | null, centro: { lat: number; lng: number }, ciudad: string) {
  const q = yo ? texto : `${texto} en ${ciudad}`;
  const c = yo ?? centro;
  return `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${c.lat.toFixed(5)},${c.lng.toFixed(5)},${yo ? 15 : 13}z`;
}

// ---- Cortes de luz del momento ----
// El ENRE manda un registro por cada grupo de usuarios (con su localidad, a veces "Zona Rural", y un punto). Los registros del mismo corte se juntan en un solo renglón:
// los que cuelgan del mismo alimentador (o, si no lo dicen, los que están a menos de 1,2 km y tienen la misma hora de vuelta). El barrio y la calle salen de las coordenadas (OpenStreetMap).
export type EventoLuz = { id: string; titulo: string; barrio: string | null; calle: string | null; usuarios: number; hasta: string | null; subestacion: string | null; lat?: number; lng?: number };
const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
function localidadLinda(loc: string | null | undefined) {
  if (!loc || /rural|^s\/d$|sin dato|desconoc/i.test(loc.trim()) || sinAcentos(loc) === sinAcentos(config.ciudad)) return null; // "Lomas de Zamora" es el partido, no un barrio
  const conocida = config.localidades.find((l: string) => sinAcentos(l) === sinAcentos(loc) || (sinAcentos(loc) === "lavallol" && sinAcentos(l) === "llavallol"));
  return conocida ?? nombreLindo(loc).replace(/ De /g, " de ");
}
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
type CorteLuz = Luz["cortes"][number];
export function gruposDeCortes(cortes: CorteLuz[]) {
  const grupos: { clave: string; base: string; miembros: CorteLuz[] }[] = [];
  for (const c of cortes) {
    const ali = c.alimentador && !/^s\/d$/i.test(c.alimentador) ? c.alimentador : null;
    const base = `${c.normalizacion ?? "?"}|${c.tension}`;
    let g = ali
      ? grupos.find((x) => x.clave === `a:${ali}|${base}`)
      : c.lat != null && c.lng != null
        ? grupos.find((x) => x.clave.startsWith("p:") && x.base === base && x.miembros.some((m) => m.lat != null && m.lng != null && km({ lat: m.lat, lng: m.lng }, { lat: c.lat!, lng: c.lng! }) <= 1.2))
        : grupos.find((x) => x.clave === `l:${c.localidad}|${base}`);
    if (!g) { g = { clave: ali ? `a:${ali}|${base}` : c.lat != null ? `p:${grupos.length}|${base}` : `l:${c.localidad}|${base}`, base, miembros: [] }; grupos.push(g); }
    g.miembros.push(c);
  }
  return grupos.map((g) => ({ ...g, miembros: g.miembros.sort((x, y) => y.usuarios - x.usuarios) })); // el primero es el grupo más grande: de ahí sale el punto del corte
}
export function tituloCorte(barrio: string | null, calle: string | null) {
  if (barrio) return calle ? `Corte en ${barrio}, cerca de ${calle}` : `Corte en ${barrio}`;
  return calle ? `Corte en Lomas de Zamora, cerca de ${calle}` : "Corte en Lomas de Zamora (zona no informada)";
}
export function eventosLuz(cortes: CorteLuz[]): EventoLuz[] {
  return gruposDeCortes(cortes).map((g) => {
    const rep = g.miembros[0];
    const barrio = g.miembros.find((m) => m.barrio)?.barrio ?? g.miembros.map((m) => localidadLinda(m.localidad)).find(Boolean) ?? null;
    const calle = rep.calle ?? g.miembros.find((m) => m.calle)?.calle ?? null;
    const hasta = g.miembros.reduce<string | null>((t, m) => (m.normalizacion && (!t || m.normalizacion > t) ? m.normalizacion : t), null);
    const subestacion = g.miembros.find((m) => m.subestacion && !/^s\/d$/i.test(m.subestacion))?.subestacion ?? null;
    return { id: `${g.clave}|${rep.lat?.toFixed(3) ?? ""}`, titulo: tituloCorte(barrio, calle), barrio, calle, usuarios: g.miembros.reduce((t, m) => t + m.usuarios, 0), hasta, subestacion, lat: rep.lat, lng: rep.lng };
  }).sort((a, b) => b.usuarios - a.usuarios);
}
