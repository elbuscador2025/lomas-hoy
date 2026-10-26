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
  cortes: { tension: "media" | "baja" | "otra"; localidad: string | null; usuarios: number; normalizacion: string | null; lat?: number; lng?: number }[];
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
export type CorteAgua = { id: string; localidad: string; zona: string; desde: string | null; hasta: string | null; motivo: string; fuente: string; fecha: string; link?: string };
export type Agua = { cortes: CorteAgua[]; diariosSinLeer: string[] };
export type Lugar = {
  id: string; categoria: string; nombre: string; direccion: string; localidad: string;
  telefonos: string[]; horario: string; etiqueta?: string; fuente: string; fuenteUrl: string; lat?: number; lng?: number;
};
export type Subte = { lineas: { id: string; estado: "normal" | "demora" | "interrumpida" | "paro"; texto: string; desde: string | null }[] };
export type AlertaSmn = { id: string; evento: string; nivel: "amarilla" | "naranja" | "roja"; desde: string | null; hasta: string; descripcion: string; instruccion: string; zonas: string[] };
export type Alertas = { alertas: AlertaSmn[]; leidas: number; fallidas: number };
export type Noticias = { notas: { titulo: string; link: string; medio: string; fecha: string }[]; diariosLeidos: string[]; diariosSinLeer: string[] };
export type Todo = { noticias?: Fila<Noticias>; alertas?: Fila<Alertas>; subte?: Fila<Subte>; tren?: Fila<Tren>; luz?: Fila<Luz>; clima?: Fila<Clima>; colectivos?: Fila<Colectivos>; programados?: Fila<Programados>; agua?: Fila<Agua> };

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
    const porLocalidad = new Map<string, { usuarios: number; hasta: string | null }>();
    for (const c of d.luz.contenido.cortes) {
      const k = c.localidad ?? "Lomas de Zamora";
      const a = porLocalidad.get(k) ?? { usuarios: 0, hasta: null };
      a.usuarios += c.usuarios;
      if (c.normalizacion && (!a.hasta || c.normalizacion > a.hasta)) a.hasta = c.normalizacion;
      porLocalidad.set(k, a);
    }
    for (const [loc, a] of porLocalidad) {
      if (a.usuarios < luz.alertaDesdeUsuarios) continue; // los cortes chicos solo se ven dentro de Luz
      novedades.push({
        vista: "luz",
        id: `luz${loc}`,
        gravedad: a.usuarios >= luz.graveDesdeUsuarios ? "grave" : "aviso",
        titulo: `Corte de luz en ${nombreLindo(loc)}`,
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

// Lo que el ENRE llama "Zona Rural" (o no dice) no es un barrio: se agrupa como "Otras zonas de Lomas". El resto, con el nombre real de la localidad.
export const OTRAS_ZONAS = "Otras zonas de Lomas";
const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
export function nombreZonaLuz(loc: string | null | undefined) {
  if (!loc || /rural|^s\/d$|sin dato|desconoc/i.test(loc)) return OTRAS_ZONAS;
  const conocida = config.localidades.find((l: string) => sinAcentos(l) === sinAcentos(loc) || (sinAcentos(loc) === "lavallol" && sinAcentos(l) === "llavallol"));
  return conocida ?? nombreLindo(loc).replace(/ De /g, " de ");
}
// Un renglón por lugar: total de usuarios sin luz y la hora estimada más tardía. Los lugares con más usuarios primero; "Otras zonas" al final.
export function agruparCortes(cortes: Luz["cortes"]) {
  const m = new Map<string, { nombre: string; usuarios: number; hasta: string | null }>();
  for (const c of cortes) {
    const nombre = nombreZonaLuz(c.localidad);
    const a = m.get(nombre) ?? { nombre, usuarios: 0, hasta: null };
    a.usuarios += c.usuarios;
    if (c.normalizacion && (!a.hasta || c.normalizacion > a.hasta)) a.hasta = c.normalizacion;
    m.set(nombre, a);
  }
  return [...m.values()].sort((a, b) => Number(a.nombre === OTRAS_ZONAS) - Number(b.nombre === OTRAS_ZONAS) || b.usuarios - a.usuarios);
}
