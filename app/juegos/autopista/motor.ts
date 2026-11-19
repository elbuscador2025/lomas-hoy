// CARRERA DE AUTOPISTA (vista desde la cabina): el motor del juego. Maneja el tiempo, la física arcade del camión, el puntaje y la calidad del dibujo.
// Se descarga recién cuando se toca "Jugar" (junto con la foto de la cabina). No usa ninguna librería: solo el lienzo 2D del navegador.
import { V_MAX, ZJ, LARGO, KMH } from "./pista";
import { crearDibujo, type Escena } from "./dibujo";
import { URL_CABINA } from "./cabina";
import { crearTrafico } from "./trafico";
import type { Coche } from "./pista";

export type Entrada = { volante: number; acel: boolean; freno: boolean }; // volante de -1 (todo a la izquierda) a 1 (todo a la derecha)
export type EstadoAutopista = { fase: "jugando" | "pausa" | "fin"; puntos: number; metros: number; segundos: number; vidas: number; nivel: number; kmh: number };
export type SonidosJuego = { motor: (velocidad: number, acelerando: boolean) => void; choque: () => void; silencio: () => void };
export type ControlAutopista = { pausar: () => void; reanudar: () => void; reiniciar: () => void; destruir: () => void; calidad: () => number; forzarCalidad: (n: number) => void; avanzarTiempo: (s: number) => void; datos: () => { zJugador: number; x: number; coches: Coche[] }; estado: () => EstadoAutopista };

// Física (estilo arcade): el camión es pesado, acelera lento y frena fuerte
const ACEL = V_MAX / 6, FRENO = -V_MAX * 0.85, SOLTAR = -V_MAX / 9, BANQUINA = -V_MAX / 2, LIM_BANQUINA = V_MAX / 4;
const X_INI = 0.5, X_MAX = 1.12; // arranca en el carril derecho (como en la foto); más allá de las líneas blancas está la banquina
const PASO = 1 / 60;

export async function crearJuego(zona: HTMLElement, entrada: Entrada, alCambiar: (e: EstadoAutopista) => void, sonidos?: SonidosJuego): Promise<ControlAutopista> {
  const foto = new Image(); // la foto de la cabina se baja recién ahora
  foto.src = URL_CABINA;
  await foto.decode();
  const lienzo = document.createElement("canvas");
  lienzo.className = "ap-canvas";
  zona.appendChild(lienzo);
  const ctx = lienzo.getContext("2d", { alpha: false })!;
  const dibujo = crearDibujo(ctx, foto);
  let calidad = 0;
  const medir = () => {
    const w = Math.max(1, zona.clientWidth), h = Math.max(1, zona.clientHeight);
    const e = Math.min(1, 560 / w) * [1, 0.8, 0.62][calidad]; // en pantallas grandes o celulares lentos se dibuja más chico y se estira
    lienzo.width = Math.max(160, Math.round(w * e)); lienzo.height = Math.max(160, Math.round(h * e));
    lienzo.style.width = `${w}px`; lienzo.style.height = `${h}px`;
    dibujo.cambiarTam(lienzo.width, lienzo.height);
    dibujo.calidad(calidad);
  };
  medir();
  const ro = new ResizeObserver(medir);
  ro.observe(zona);

  const trafico = crearTrafico();
  const coches = trafico.coches;
  trafico.reiniciar(ZJ);
  let pos = 0, x = X_INI, vel = 0, dist = 0, tiempo = 0, vidas = 3, inv = 0, flash = 0, sacudida = 0;
  let fase: EstadoAutopista["fase"] = "jugando";
  let ultimo = 0, acum = 0, raf = 0, avisado = 0, vivo = true;
  let tVentana = 0, nVentana = 0, pasado = 0;

  const nivel = () => 1 + Math.floor(tiempo / 25);
  const puntos = () => Math.floor(dist / 380 / 10 + tiempo * 3);
  const estado = (): EstadoAutopista => ({ fase, puntos: puntos(), metros: Math.floor(dist / 380), segundos: Math.floor(tiempo), vidas, nivel: nivel(), kmh: KMH(vel) });
  const avisar = (forzar = false) => { const t = performance.now(); if (forzar || t - avisado > 120) { avisado = t; alCambiar(estado()); } };

  function actualizar(dt: number) {
    if (fase === "pausa") return;
    const vp = vel / V_MAX;
    const jugando = fase === "jugando";
    if (jugando) tiempo += dt;
    inv = Math.max(0, inv - dt); flash = Math.max(0, flash - dt * 2.2); sacudida = Math.max(0, sacudida - dt * 3);
    // volante: cuanto más rápido, más gira (la ruta es recta, sin curvas)
    const v = jugando ? entrada.volante : 0;
    const dx = dt * 2 * vp;
    x += dx * 2.4 * Math.sign(v) * Math.abs(v) ** 1.2;
    if (jugando && entrada.acel && !entrada.freno) vel += ACEL * dt;
    else if (jugando && entrada.freno) vel += FRENO * dt;
    else vel += SOLTAR * dt * (jugando ? 1 : 3);
    if (Math.abs(x) > 1 && vel > LIM_BANQUINA) vel += BANQUINA * dt; // ir por la banquina frena
    if (Math.abs(x) > 1.07) vel += BANQUINA * dt * 1.5; // y contra el guardarraíl, mucho más
    x = Math.max(-X_MAX, Math.min(X_MAX, x));
    vel = Math.max(0, Math.min(V_MAX, vel));
    const avance = vel * dt;
    pos = (pos + avance) % LARGO;
    if (jugando) dist += avance;
    const choque = trafico.actualizar(dt, pos + ZJ, x, nivel(), !jugando || inv > 0);
    if (choque) { // chocaste: perdés una vida, el camión frena y queda protegido un ratito
      vidas--; inv = 2; sacudida = 1; flash = 1; vel = Math.min(vel, choque.vel * 0.55); x += (x >= choque.x ? 1 : -1) * 0.22; x = Math.max(-X_MAX, Math.min(X_MAX, x));
      sonidos?.choque();
    }
    if (Math.abs(x) > 1.02 && vel > 1500) sacudida = Math.max(sacudida, 0.5 + 0.5 * vp);
    sonidos?.motor(vp, jugando && entrada.acel && !entrada.freno);
    if (jugando && vidas <= 0) { fase = "fin"; avisar(true); }
  }

  // cada 1,5 segundos se mira qué tan rápido va; si no llega a unos 42 cuadros por segundo, se baja el detalle un escalón (hasta 2 veces)
  function ajustarCalidad(dt: number) {
    tVentana += dt; nVentana++;
    if (tVentana < 1.5) return;
    const media = tVentana / nVentana;
    tVentana = 0; nVentana = 0; pasado += 1;
    if (pasado > 1 && media > 1 / 42 && calidad < 2) { calidad++; medir(); }
  }

  function cuadro(t: number) {
    if (!vivo) return;
    raf = requestAnimationFrame(cuadro);
    const dt = Math.min(0.1, (t - ultimo) / 1000 || PASO);
    ultimo = t;
    if (fase !== "pausa") ajustarCalidad(dt);
    acum += dt;
    while (acum >= PASO) { actualizar(PASO); acum -= PASO; }
    const escena: Escena = { pos, x, vel, volante: entrada.volante, tiempo, dist, inv, flash, sacudida, coches, acel: entrada.acel, freno: entrada.freno };
    dibujo.dibujar(escena);
    avisar();
  }
  raf = requestAnimationFrame((t) => { ultimo = t; cuadro(t); });
  avisar(true);

  const control: ControlAutopista = {
    pausar() { if (fase === "jugando") { fase = "pausa"; sonidos?.silencio(); avisar(true); } },
    reanudar() { if (fase === "pausa") { fase = "jugando"; ultimo = performance.now(); acum = 0; avisar(true); } },
    reiniciar() { pos = 0; x = X_INI; vel = 0; dist = 0; tiempo = 0; vidas = 3; inv = 0; flash = 0; sacudida = 0; trafico.reiniciar(ZJ); fase = "jugando"; acum = 0; ultimo = performance.now(); avisar(true); },
    destruir() { vivo = false; cancelAnimationFrame(raf); ro.disconnect(); sonidos?.silencio(); lienzo.remove(); },
    calidad: () => calidad,
    forzarCalidad(n) { calidad = Math.max(0, Math.min(2, n)); medir(); },
    avanzarTiempo(s) { tiempo += s; },
    datos: () => ({ zJugador: pos + ZJ, x, coches }), // para las pruebas
    estado,
  };
  (lienzo as unknown as { control: ControlAutopista }).control = control; // para las pruebas
  return control;
}
