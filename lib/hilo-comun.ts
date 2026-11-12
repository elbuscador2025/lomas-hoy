// Conversaciones de los vecinos (La Voz de Lomas, Emprendedores): lo que comparten la pantalla y el servidor.
// Sin dependencias: así se puede probar solo.
export const RESPUESTAS_VISIBLES = 3; // respuestas a la vista de cada hilo; el resto se abre con «Ver X respuestas más»
export const MAX_RESPUESTAS_POR_DIA = 20; // por celular y por sección

// Un mensaje de una conversación. Las respuestas van todas en el hilo del comentario original (una lista, sin hilos dentro de hilos);
// "aQuien" dice a cuál mensaje contesta (extracto vacío = ese mensaje ya no está a la vista). "duenio" marca al dueño de la publicación.
export type MensajeHilo = { id: string; texto: string; creado: string; duenio?: boolean; respuestas?: MensajeHilo[]; aQuien?: { id: string; extracto: string } };

/** Primeras palabras de un mensaje, para mostrar a quién se le contesta. */
export function extractoHilo(texto: string): string {
  const palabras = texto.trim().split(/\s+/);
  let t = palabras.slice(0, 6).join(" ");
  if (t.length > 40) t = t.slice(0, 40).replace(/\s+\S*$/, "") || t.slice(0, 40);
  return t.length < texto.trim().length ? `${t}…` : t;
}
