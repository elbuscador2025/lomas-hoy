// Reglas contra estafas de Trueque y Trabajo para mayores de 50 años. Lo usan el servidor (que decide) y la pantalla (que avisa antes de enviar).

export const AVISO_TRUEQUE = "Acá no se vende ni se cobra nada. Si alguien te pide plata, denuncialo.";
export const AVISO_TRABAJO = "Ningún trabajo te puede pedir plata. Nunca mandes DNI, CBU ni claves por WhatsApp. Si alguien te pide plata, denuncialo.";

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Alerta para mi panel ("Posible estafa"): no impide publicar, solo marca para revisar con cuidado.
const SOSPECHOSO = new RegExp([
  "\\$", "\\bvendo\\b", "\\bvendemos\\b", "\\bvende\\b", "\\bventa\\b", "\\bprecio\\w*", "\\bpesos?\\b", "\\bdolar\\w*", "\\busd\\b",
  "\\btransferenc\\w*", "\\bcbu\\b", "\\balias\\b", "\\bsena\\b", "\\binversi\\w*", "\\binvert\\w*", "\\bcurso pago\\b",
  "\\bgana desde tu casa\\b", "\\bmultinivel\\b", "\\bcripto\\w*", "\\b\\d{1,3}(\\.\\d{3})+\\b", "\\b\\d{4,}\\b",
].join("|"));
export const posibleEstafa = (...textos: (string | undefined)[]) => SOSPECHOSO.test(sinTildes(textos.filter(Boolean).join(" ")));

// Lo que NO se puede publicar: DNI, CBU ni dirección exacta. Devuelve el motivo, o null si está bien.
export function datoProhibido(...textos: (string | undefined)[]): string | null {
  const t = sinTildes(textos.filter(Boolean).join(" "));
  if (/\bcbu\b/.test(t) || /(\d[\s-]?){22}/.test(t)) return "No pongas un CBU en la publicación.";
  if (/\bdni\b\W{0,3}\d/.test(t) || /\b\d{1,2}\.\d{3}\.\d{3}\b/.test(t) || /\b\d{7,8}\b/.test(t)) return "No pongas un DNI en la publicación.";
  if (/\b(calle|avda?|avenida|pasaje|pje|diagonal|diag|ruta)\.?\s+(?:[a-zñ.]+\s+){0,4}\d{1,5}\b/.test(t) || /\bal\s+\d{3,5}\b/.test(t))
    return "No pongas tu dirección exacta: alcanza con el barrio.";
  return null;
}
