export type Fila<T> = { clave: string; contenido: T | null; ok_en: string | null; intento_en: string | null; error: string | null };
export type Tren = { novedades: { gravedad: "grave" | "aviso"; ramal: string; motivo: string }[] };
export type Luz = {
  cortes: { tension: "media" | "baja" | "otra"; localidad: string | null; usuarios: number; normalizacion: string | null }[];
};
export type Clima = {
  ahora: { temp: number; sensacion: number; humedad: number; viento: number; codigo: number };
  horas: { hora: string; temp: number; codigo: number; lluvia: number }[];
};
export type Todo = { tren?: Fila<Tren>; luz?: Fila<Luz>; clima?: Fila<Clima> };

const CLAVE_CACHE = "lomas-hoy:datos";

// Lee del sitio (que lee la base); si no hay internet, devuelve lo último que se guardó en el celu.
export async function cargarDatos(): Promise<{ datos: Todo; sinConexion: boolean }> {
  try {
    const r = await fetch("/api/datos");
    if (!r.ok) throw new Error(String(r.status));
    const filas: Fila<unknown>[] = await r.json();
    const datos = Object.fromEntries(filas.map((f) => [f.clave, f])) as Todo;
    try { localStorage.setItem(CLAVE_CACHE, JSON.stringify(datos)); } catch {}
    return { datos, sinConexion: false };
  } catch {
    try {
      return { datos: JSON.parse(localStorage.getItem(CLAVE_CACHE) ?? "{}"), sinConexion: true };
    } catch {
      return { datos: {}, sinConexion: true };
    }
  }
}

export const ZONA = "America/Argentina/Buenos_Aires";
export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-AR", { timeZone: ZONA, hour: "2-digit", minute: "2-digit" });
export const fechaLarga = () =>
  new Date().toLocaleDateString("es-AR", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" });

const CODIGOS: Record<number, string> = {
  0: "Despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado", 3: "Nublado",
  45: "Niebla", 48: "Niebla con escarcha", 51: "Llovizna leve", 53: "Llovizna", 55: "Llovizna intensa",
  61: "Lluvia leve", 63: "Lluvia", 65: "Lluvia fuerte", 71: "Nevada leve", 73: "Nevada", 75: "Nevada fuerte",
  80: "Chubascos leves", 81: "Chubascos", 82: "Chubascos fuertes", 95: "Tormenta", 96: "Tormenta con granizo", 99: "Tormenta con granizo fuerte",
};
export const textoClima = (c: number) => CODIGOS[c] ?? "—";

export type Novedad = { id: string; gravedad: "grave" | "aviso"; titulo: string; detalle: string };

export function armarNovedades(d: Todo, graveDesdeUsuarios: number, activas: { tren: boolean; luz: boolean }) {
  const novedades: Novedad[] = [];
  const normales: string[] = [];
  if (activas.tren && d.tren?.contenido) {
    const n = d.tren.contenido.novedades;
    n.forEach((x, i) => novedades.push({ id: `tren${i}`, gravedad: x.gravedad, titulo: `Roca: ${x.ramal}`, detalle: x.motivo }));
    if (n.length === 0) normales.push("tren");
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
      novedades.push({
        id: `luz${loc}`,
        gravedad: a.usuarios >= graveDesdeUsuarios ? "grave" : "aviso",
        titulo: `Corte de luz en ${nombreLindo(loc)}`,
        detalle: `${a.usuarios} ${a.usuarios === 1 ? "usuario afectado" : "usuarios afectados"}` + (a.hasta ? ` · hasta las ${a.hasta.slice(11, 16)} hs` : ""),
      });
    }
    if (porLocalidad.size === 0) normales.push("luz");
  }
  novedades.sort((a, b) => (a.gravedad === b.gravedad ? 0 : a.gravedad === "grave" ? -1 : 1));
  return { novedades, normales };
}

export const nombreLindo = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
