// Perro al rescate: lo que comparten la pantalla y el servidor (tipos, límites y el filtro de datos personales).
// Sin dependencias: así se puede probar solo.
export const MAX_FOTOS_RESCATE = 2, MAX_DESCRIPCION_RESCATE = 300, MAX_ZONA_RESCATE = 80, MAX_COMENTARIO_RESCATE = 300, DIAS_VIGENCIA_RESCATE = 15;
export const MAX_BYTES_FOTO_RESCATE = 250_000, LADO_FOTO_RESCATE = 1000, MAX_BYTES_SERVIDOR_RESCATE = 300_000;
export const MAX_POR_DIA_RESCATE = 3, MAX_COMENTARIOS_POR_DIA_RESCATE = 10;
export const MOTIVOS_RESCATE = ["Datos personales o fotos de personas", "Insulta o es agresivo", "Parece falso o estafa", "Otro"];
export const REGLAS_RESCATE = "No pongas direcciones con número, nombres ni apellidos, teléfonos, patentes ni fotos de personas. Decí solo la zona o la esquina aproximada.";

export type Mensaje = { id: string; texto: string; creado: string; duenio?: boolean; respuestas?: Mensaje[]; aQuien?: { id: string; extracto: string } };
export type RescatePublico = { id: string; descripcion: string; zona: string; fotos: string[]; creado: string; vence: string; rescatado: boolean; comentarios: number };
export type RescateDetalle = RescatePublico & { conversacion: Mensaje[] };

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ---- Qué no se puede publicar ----
const TLD = "com|net|org|info|biz|ar|gob|gov|edu|me|ly|gl|io|co|app|xyz|site|online|shop|store|tk|cc|tv|ws|link|click|page|live|club|top|vip";
const RX_ENLACE = new RegExp(["https?:\\/\\/", "\\bwww\\s*\\.", `\\b[a-z0-9][a-z0-9-]*\\.(?:${TLD})\\b`, "@[a-z0-9_.]{3,}"].join("|"));
const RX_TELEFONO = /(?:\+?\d[\s.\-()]*){7,}/; // 7 o más dígitos seguidos (con espacios o guiones): un teléfono, DNI o similar
const RX_NUMEROS_PALABRAS = /\b(?:(?:cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\W+){6,}/;
// Dirección con número: "calle Alsina 1234", "Av. Yrigoyen 8101", "Alsina nº 55", "Hipólito Yrigoyen 8101"
const RX_CALLE_NUMERO = /\b(?:calle|av\.?|avenida|pasaje|pje\.?|diagonal|diag\.?|ruta|camino)\s+[a-z0-9à-ÿ .]{1,32}?\s*(?:n[°º.]?\s*|nro\.?\s*|numero\s*)?\d{1,5}\b/;
const RX_NOMBRE_NUMERO = /\b[a-zà-ÿ]{3,}\s+(?:n[°º.]|nro\.?|numero)\s*\d{1,5}\b/;
// Nombres propios: "se llama Juan", "el señor Pérez", "doña Marta", "familia Gómez", "dueño: Carlos"…
const RX_CUE_NOMBRE = /\b(?:se llama|llamad[oa]|me llamo|mi nombre es|senor(?:a|es)?|sr\.?|sra\.?|don|dona|familia|duen[oa]|vecin[oa]|apellido|nombre)\s*:?\s+[a-zà-ÿ]{3,}/;
const NOMBRES = "juan carlos jose luis miguel jorge pedro pablo diego martin marcelo roberto ricardo daniel alejandro fernando gustavo sergio raul oscar hugo walter nicolas lucas matias facundo agustin gonzalo sebastian cristian ramon eduardo ernesto hector julio mario omar rodolfo santiago maria ana laura marta susana claudia silvia patricia graciela norma liliana monica andrea carolina gabriela veronica sandra mariana romina natalia florencia lucia sofia camila valeria paula julieta daniela roxana beatriz rosa carmen elena teresa noemi adriana cecilia";

/** Devuelve el motivo por el que un texto no se puede publicar, o null si está bien. `original` = el texto tal como lo escribió la persona (mantiene las mayúsculas). */
export function motivoRescateInvalido(original: string): string | null {
  const t = sinTildes(original);
  if (RX_ENLACE.test(t)) return "No se pueden poner enlaces ni usuarios de redes.";
  if (RX_TELEFONO.test(t) || RX_NUMEROS_PALABRAS.test(t)) return "No se pueden poner teléfonos ni números de contacto.";
  if (RX_CALLE_NUMERO.test(t) || RX_NOMBRE_NUMERO.test(t) || /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})?\s+\d{2,5}\b/.test(original))
    return "No pongas direcciones con número. Decí solo la zona o la esquina (por ejemplo: «Alsina y Sarmiento»).";
  if (RX_CUE_NOMBRE.test(t) || nombreConMayuscula(original))
    return "No pongas nombres ni apellidos de personas. Contá solo lo que le pasa al animal y dónde está.";
  return null;
}
// Un nombre de pila de la lista escrito con mayúscula inicial, salvo en nombres de lugares ("San José", "Santa Marta", "Plaza San Martín", "calle Carlos Pellegrini")
const ANTES_DE_LUGAR = new Set(["san", "santa", "villa", "plaza", "calle", "barrio", "av", "avenida", "parque", "pasaje", "pje", "diagonal", "ruta", "camino", "esquina", "de", "del"]);
function nombreConMayuscula(original: string): boolean {
  const lista = new Set(NOMBRES.split(" "));
  const palabras = original.split(/\s+/).map((p) => p.replace(/^[¡¿(]+|[.,;:!?)]+$/g, ""));
  for (let i = 0; i < palabras.length; i++) {
    const w = palabras[i];
    if (!/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}$/.test(w) || !lista.has(sinTildes(w))) continue;
    const antes = i > 0 ? sinTildes(palabras[i - 1]) : "";
    const enLugar = ANTES_DE_LUGAR.has(antes) || (i > 1 && ANTES_DE_LUGAR.has(sinTildes(palabras[i - 2])) && /^[A-ZÁÉÍÓÚÑ]/.test(palabras[i - 1]));
    if (!enLugar) return true;
  }
  return false;
}
