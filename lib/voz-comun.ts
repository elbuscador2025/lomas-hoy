// La Voz de Lomas: lo que comparten la pantalla y el servidor (tipos, límites y el filtro de los comentarios).
// Sin dependencias: así se puede probar solo.
export const MAX_COMENTARIO_VOZ = 200;
export const MAX_COMENTARIOS_POR_DIA_VOZ = 3, MAX_RESPUESTAS_POR_DIA_VOZ = 20, RESPUESTAS_VISIBLES = 3;
export const MAX_TEXTO_PREGUNTA = 120, MAX_TEXTO_OPCION = 60;
export const MOTIVOS_VOZ = ["Insulta o es agresivo", "Parece estafa o publicidad", "Datos personales", "Otro"];

export type OpcionVoz = { id: string; texto: string };
export type PreguntaVoz = { id: string; texto: string; opciones: OpcionVoz[]; activa: boolean; orden: number; creada: string };
export type ResultadoVoz = { total: number; opciones: { id: string; votos: number; pct: number }[] };
// Un comentario tiene respuestas, todas en el mismo hilo (una debajo de la otra, en orden de llegada). Se puede responder a cualquier mensaje: "aQuien" dice a cuál contesta
// (extracto vacío = ese mensaje ya no está a la vista).
export type ComentarioVoz = { id: string; texto: string; creado: string; respuestas?: ComentarioVoz[]; aQuien?: { id: string; extracto: string } };

/** Primeras palabras de un mensaje, para mostrar a quién se le contesta. */
export function extractoVoz(texto: string): string {
  const palabras = texto.trim().split(/\s+/);
  let t = palabras.slice(0, 6).join(" ");
  if (t.length > 40) t = t.slice(0, 40).replace(/\s+\S*$/, "") || t.slice(0, 40);
  return t.length < texto.trim().length ? `${t}…` : t;
}
export type EstadoVoz = {
  ok: true;
  pregunta: { id: string; texto: string; opciones: OpcionVoz[] };
  participantes: number; // antes de votar solo se muestra cuántos votaron, no cómo
  voto: string | null;
  resultados: ResultadoVoz | null; // solo después de votar
  comentarios: ComentarioVoz[];
};

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const TLD = "com|net|org|info|biz|ar|gob|gov|edu|me|ly|gl|io|co|app|xyz|site|online|shop|store|tk|cc|tv|ws|link|click|page|live|club|top|vip";
const RX_ENLACE = new RegExp([
  // El punto va pegado a las dos palabras: así "Vivo acá. Me encanta" no se confunde con "acá.me"
  "https?:\\/\\/", "\\bwww\\s*\\.", "\\bw\\s*w\\s*w\\s*\\.", `\\b[a-z0-9][a-z0-9-]*\\.(?:${TLD})\\b`, "\\bpunto\\s*(?:com|ar|net|org)\\b", "@[a-z0-9_.]{3,}",
].join("|"));
// 7 o más dígitos seguidos (con espacios, guiones, puntos o paréntesis en el medio) = un teléfono
const RX_TELEFONO = /(?:\+?\d[\s.\-()]*){7,}/;
// Números escritos con palabras: "once cinco cinco cinco ..."
const RX_NUMEROS_PALABRAS = /\b(?:(?:cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\W+){6,}/;

/** Devuelve el motivo por el que un comentario no se puede publicar, o null si está bien. */
export function motivoComentarioInvalido(texto: string): string | null {
  const t = sinTildes(texto);
  if (RX_ENLACE.test(t)) return "No se pueden poner enlaces ni usuarios de redes.";
  if (RX_TELEFONO.test(t) || RX_NUMEROS_PALABRAS.test(t)) return "No se pueden poner teléfonos ni números de contacto.";
  return null;
}

/** Reparte 100% entre las opciones sin que la suma se pase ni quede corta (método del mayor resto). */
export function porcentajes(votos: number[]): number[] {
  const total = votos.reduce((a, b) => a + b, 0);
  if (total === 0) return votos.map(() => 0);
  const brutos = votos.map((v) => (v * 100) / total);
  const base = brutos.map(Math.floor);
  let falta = 100 - base.reduce((a, b) => a + b, 0);
  const orden = brutos.map((b, i) => ({ i, resto: b - Math.floor(b) })).sort((a, b) => b.resto - a.resto || a.i - b.i);
  for (const { i } of orden) { if (falta <= 0) break; base[i]++; falta--; }
  return base;
}

/** Número de día (para rotar la pregunta del día): fecha "AAAA-MM-DD" de Argentina → días desde 1970. */
export function numeroDeDia(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Rotación automática: una pregunta distinta cada día, recorriendo las activas en orden. */
export function elegirPorRotacion<T extends { id: string; orden: number }>(activas: T[], fecha: string): T | null {
  if (!activas.length) return null;
  const orden = [...activas].sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id));
  return orden[numeroDeDia(fecha) % orden.length];
}
