// CARRERA DE AUTOPISTA (vista desde la cabina): cómo se acomoda la foto de la cabina en la pantalla.
// La foto llena toda la pantalla sin deformarse (si sobra alto o ancho, se recortan un poco los bordes). El dibujo del juego y los botones usan estas mismas medidas.
export const IMG_W = 941, IMG_H = 1672;
export const URL_CABINA = "/juegos/autopista/cabina.webp";

export type Encaje = { k: number; ox: number; oy: number };
export function encajar(cw: number, ch: number): Encaje {
  const k = Math.max(cw / IMG_W, ch / IMG_H) * 1.012; // un pelito más grande para que el temblor no deje bordes
  const ex = Math.max(0, IMG_W * k - cw), ey = Math.max(0, IMG_H * k - ch);
  const der = Math.min(ex * 0.5, 56 * k); // lo que se recorta a la derecha, así la pantalla del estéreo siempre se ve; el resto sale de la izquierda
  return { k, ox: -(ex - der), oy: -ey * 0.5 };
}
