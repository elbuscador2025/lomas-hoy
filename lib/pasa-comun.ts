// "Pasa en Lomas": avisos de vecinos sobre lo que pasa en la calle. Lo comparten la pantalla y el servidor.
export const TIPOS_PASA = [
  { id: "calle", emoji: "🚧", nombre: "Calle cortada" },
  { id: "choque", emoji: "💥", nombre: "Choque" },
  { id: "arbol", emoji: "🌳", nombre: "Árbol caído" },
  { id: "inundacion", emoji: "🌊", nombre: "Inundación" },
  { id: "luz", emoji: "💡", nombre: "Corte de luz" },
  { id: "agua", emoji: "🚰", nombre: "Corte de agua" },
  { id: "semaforo", emoji: "🚦", nombre: "Semáforo roto" },
  { id: "otro", emoji: "📣", nombre: "Otro" },
] as const;
export const MAX_TEXTO_PASA = 150;
export const HORAS_PASA = 24;

export type AvisoPasa = {
  id: string; tipo: string; texto: string; barrio: string; donde: string; lat?: number; lng?: number;
  foto?: string; creado: string; vistos: number;
};

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Lista simple de insultos y acusaciones (palabra entera; las letras repetidas de más se achican: "pelotudooo")
const MALAS = [
  "puta", "puto", "putas", "putos", "hijo de puta", "hijos de puta", "hdp", "pelotudo", "pelotuda", "boludo", "boluda", "idiota", "imbecil", "estupido", "estupida",
  "mierda", "forro", "forra", "cagon", "garca", "negro de mierda", "villero", "chorro", "ladron", "ladrones", "asesino", "asesinos", "violador", "violadores",
  "conchudo", "concha", "pija", "verga", "culo", "trolo", "marica", "sorete", "mogolico", "retrasado", "ctm", "lpm",
];
const RX = new RegExp(`(?<![a-z0-9])(${MALAS.map((m) => m.replace(/ /g, "\\s+")).join("|")})(?![a-z0-9])`);
const colapsar = (s: string) => s.replace(/(.)\1+/g, "$1"); // ninguna de las palabras de la lista tiene letras dobles
// Devuelve el motivo si el texto no se puede publicar
export function motivoProhibidoPasa(texto: string): string | null {
  const t = sinTildes(texto);
  return RX.test(t) || RX.test(colapsar(t)) ? "El aviso tiene insultos o acusaciones. Contá solo lo que pasa, sin insultar." : null;
}
