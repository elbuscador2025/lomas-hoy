// CARRERA DE AUTOPISTA: el tráfico. Autos y camiones que van por sus carriles (más lentos que el camión del jugador) y que hay que esquivar o pasar.
// Con el tiempo hay más vehículos y a veces tapan dos carriles. Nunca tapan los tres a la vez: siempre queda un lugar para pasar.
import { SEG, LARGO, V_MAX, type Coche } from "./pista";

const CARRILES = [-0.62, 0, 0.62];
const ANCHO_AUTO = 0.42, ANCHO_CAMION = 0.6, ANCHO_JUGADOR = 0.5;
const PROFUNDIDAD = 170; // cuánto "mide" un vehículo hacia adelante para el choque
const VISTA = 100 * SEG;

export type Trafico = {
  coches: Coche[];
  actualizar: (dt: number, zJugador: number, xJugador: number, nivel: number, protegido: boolean) => Coche | null; // devuelve el vehículo contra el que se chocó
  reiniciar: (zJugador: number) => void;
};

const relativo = (z: number, zJ: number) => { let r = ((z - zJ) % LARGO + LARGO) % LARGO; if (r > LARGO / 2) r -= LARGO; return r; };

export function crearTrafico(): Trafico {
  const coches: Coche[] = [];
  const objetivo = (nivel: number) => Math.min(26, 7 + nivel * 2);

  // un carril libre cerca de z (que no deje los tres carriles tapados)
  function carrilLibre(z: number, ignorar?: Coche): number | null {
    const ocupados = new Set<number>();
    for (const c of coches) if (c !== ignorar && Math.abs(relativo(c.z, z)) < 3200) ocupados.add(CARRILES.indexOf(c.x));
    const libres = [0, 1, 2].filter((k) => !ocupados.has(k));
    if (libres.length <= 1 && ocupados.size >= 2) return null; // dejaría la ruta cerrada: no se pone
    return libres.length ? libres[Math.floor(Math.random() * libres.length)] : null;
  }
  function nuevo(z: number, nivel: number, ignorar?: Coche): Coche | null {
    const k = carrilLibre(z, ignorar);
    if (k === null) return null;
    const camion = Math.random() < 0.38;
    return {
      z: ((z % LARGO) + LARGO) % LARGO, x: CARRILES[k], tipo: camion ? "camion" : "auto", color: Math.floor(Math.random() * 8),
      ancho: camion ? ANCHO_CAMION : ANCHO_AUTO,
      vel: V_MAX * (camion ? 0.28 + Math.random() * 0.16 : 0.36 + Math.random() * 0.26 + Math.min(0.06, nivel * 0.006)),
    };
  }
  function poblar(zJ: number, nivel: number, cuantos: number, desde: number, hasta: number) {
    let intentos = 0;
    while (coches.length < cuantos && intentos++ < 80) {
      const c = nuevo(zJ + desde + Math.random() * (hasta - desde), nivel);
      if (c) coches.push(c);
    }
  }

  return {
    coches,
    reiniciar(zJ) { coches.length = 0; poblar(zJ, 1, objetivo(1), 7000, VISTA); },
    actualizar(dt, zJ, xJ, nivel, protegido) {
      // si hace falta más tráfico (el nivel subió), se suma lejos, fuera de la vista
      if (coches.length < objetivo(nivel)) poblar(zJ, nivel, objetivo(nivel), VISTA * 0.95, VISTA * 3);
      // cada uno va a su velocidad, pero no atropella al de adelante en su carril
      for (const c of coches) {
        let tope = c.vel;
        for (const o of coches) if (o !== c && o.x === c.x) { const gap = relativo(o.z, c.z); if (gap > 0 && gap < 2000) tope = Math.min(tope, o.vel); }
        c.z = (c.z + Math.min(c.vel, tope) * dt) % LARGO;
      }
      let choque: Coche | null = null;
      for (let i = 0; i < coches.length; i++) {
        const c = coches[i], r = relativo(c.z, zJ);
        if (r < -1400) { // quedó muy atrás: vuelve a salir lejos, adelante
          const n = nuevo(zJ + VISTA * (0.95 + Math.random() * 1.6), nivel, c);
          if (n) coches[i] = n; else c.z = (c.z + VISTA * 1.3) % LARGO;
          continue;
        }
        if (!protegido && !choque && Math.abs(r) < PROFUNDIDAD && Math.abs(c.x - xJ) < (c.ancho + ANCHO_JUGADOR) / 2) choque = c;
      }
      return choque;
    },
  };
}
