// CARRERA DE AUTOPISTA: la ruta. Es un circuito que se repite (así nunca se termina) hecho de "tramos" de 200 unidades, algunos rectos y otros con curva a izquierda o derecha.
// Todo se calcula acá y se dibuja con el lienzo 2D del navegador (pseudo-3D): no hay modelos ni imágenes.
export const SEG = 200; // largo de cada tramo
export const N = 1400; // tramos del circuito (da una vuelta de unos 800 m)
export const ANCHO = 900; // ancho de la ruta (de la mitad al borde)
export const ALTO_CAM = 1000; // altura de la cámara
export const PROF = 0.84; // "zoom" de la cámara (campo de visión de 100°)
export const ZJ = ALTO_CAM * PROF; // a qué distancia de la cámara está el camión del jugador
export const V_MAX = 11000; // velocidad máxima (unidades por segundo): se muestra como 105 km/h
export const LARGO = N * SEG;
export const KMH = (v: number) => Math.round((v / V_MAX) * 105);

export type Tramo = { i: number; curva: number; z: number; banda: boolean };

// Números al azar que siempre dan lo mismo (así la ruta es la misma en todos los celulares)
function azar(semilla: number) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const suave = (a: number, b: number, p: number) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);
const entra = (a: number, b: number, p: number) => a + (b - a) * p * p;

export function crearPista(): Tramo[] {
  const curvas: number[] = [];
  const rnd = azar(2027);
  const recta = (n: number) => { for (let k = 0; k < n; k++) curvas.push(0); };
  const curva = (entrada: number, sostener: number, salida: number, c: number) => {
    for (let k = 0; k < entrada; k++) curvas.push(entra(0, c, k / entrada));
    for (let k = 0; k < sostener; k++) curvas.push(c);
    for (let k = 0; k < salida; k++) curvas.push(suave(c, 0, k / salida));
  };
  recta(40);
  let lado = 1;
  while (curvas.length < N - 120) {
    recta(14 + Math.floor(rnd() * 40));
    const fuerza = 2 + Math.floor(rnd() * 4); // 2 a 5: curvas suaves y algunas cerradas
    curva(18 + Math.floor(rnd() * 14), 14 + Math.floor(rnd() * 40), 18 + Math.floor(rnd() * 14), fuerza * lado);
    if (rnd() < 0.3) curva(14, 6, 14, -fuerza * lado * 0.8); // a veces una "S": la curva contraria enseguida
    lado = rnd() < 0.7 ? -lado : lado;
  }
  recta(N - curvas.length);
  return Array.from({ length: N }, (_, i) => ({ i, curva: curvas[i] ?? 0, z: i * SEG, banda: Math.floor(i / 3) % 2 === 0 }));
}

// Un vehículo del tráfico (auto o camión): z = lugar en la ruta, x = carril (-1 es el borde izquierdo y 1 el derecho), ancho en las mismas unidades
export type Coche = { z: number; x: number; vel: number; tipo: "auto" | "camion"; color: number; ancho: number };
