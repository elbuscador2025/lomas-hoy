"use client";
// Sonidos de "Pequeños creativos". Todos se generan con el navegador (osciladores y filtros): no hay archivos de audio, así que pesan cero
// y no dependen de ninguna licencia ni recurso de terceros. Se apagan con el mismo interruptor de sonido de la app.
import { tono } from "../comun";

export type Sonar = "toque" | "pop" | "bien" | "uy" | "premio" | "barrer" | "toc" | "derrumbe" | "plop" | "vaca" | "perro" | "gato" | "pollito" | "caballo" | "pato";

let ctx: AudioContext | null = null;
const contexto = () => {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx ??= new AC();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
};

// Una "voz": un oscilador cuya altura sigue una curva, pasado por un filtro que también se mueve (da la forma de la vocal) y con un volumen que sube y baja.
type Curva = [number, number][]; // [segundos, valor]
function voz(o: { tipo: OscillatorType; f: Curva; filtro: BiquadFilterType; ff: Curva; q?: number; dur: number; vol?: number; retraso?: number; vib?: [number, number] }) {
  try {
    const c = contexto(), t0 = c.currentTime + (o.retraso ?? 0);
    const osc = c.createOscillator(), fil = c.createBiquadFilter(), g = c.createGain();
    osc.type = o.tipo; fil.type = o.filtro; fil.Q.value = o.q ?? 1;
    o.f.forEach(([t, v], i) => (i ? osc.frequency.linearRampToValueAtTime(v, t0 + t) : osc.frequency.setValueAtTime(v, t0 + t)));
    o.ff.forEach(([t, v], i) => (i ? fil.frequency.linearRampToValueAtTime(v, t0 + t) : fil.frequency.setValueAtTime(v, t0 + t)));
    const vol = o.vol ?? 0.2;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.05, o.dur / 4));
    g.gain.setValueAtTime(vol, t0 + o.dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg).connect(osc.frequency); l.start(t0); l.stop(t0 + o.dur + 0.05); }
    osc.connect(fil).connect(g).connect(c.destination);
    osc.start(t0); osc.stop(t0 + o.dur + 0.05);
  } catch {}
}
// Un golpecito de ruido (para el "guau" y el derrumbe)
function ruido(dur: number, f: number, vol: number, retraso = 0) {
  try {
    const c = contexto(), n = Math.max(1, Math.floor(c.sampleRate * dur)), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), fil = c.createBiquadFilter(), g = c.createGain(), t0 = c.currentTime + retraso;
    s.buffer = b; fil.type = "bandpass"; fil.frequency.value = f; fil.Q.value = 0.8; g.gain.value = vol;
    s.connect(fil).connect(g).connect(c.destination); s.start(t0);
  } catch {}
}

export const SONIDOS: Record<Sonar, () => void> = {
  toque: () => tono(540, 0.07, "triangle", 0.07),
  pop: () => tono(420, 0.09, "sine", 0.09, 0, 760),
  bien: () => { tono(659, 0.12, "triangle", 0.08); tono(880, 0.18, "triangle", 0.08, 0.11); },
  uy: () => tono(330, 0.22, "sine", 0.06, 0, 240),
  premio: () => { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tono(f, 0.15, "triangle", 0.08, i * 0.11)); },
  barrer: () => tono(900, 0.3, "sine", 0.05, 0, 220),
  // Bloques: un "toc" suave al apoyar, y un derrumbe divertido (boing + golpecitos que caen)
  toc: () => { tono(190, 0.08, "sine", 0.16, 0, 110); ruido(0.04, 500, 0.05); },
  derrumbe: () => {
    tono(700, 0.45, "sine", 0.1, 0, 120);
    [0.05, 0.14, 0.23, 0.33, 0.42, 0.55, 0.68].forEach((r, i) => { tono(300 - i * 25, 0.09, "triangle", 0.1, r, 90); ruido(0.05, 400 + i * 80, 0.05, r); });
  },
  plop: () => { tono(520, 0.09, "sine", 0.16, 0, 160); tono(900, 0.05, "sine", 0.06, 0.01, 400); },
  // Animales (imitaciones propias, hechas con osciladores)
  vaca: () => voz({ tipo: "sawtooth", f: [[0, 95], [0.25, 125], [1.1, 88]], filtro: "bandpass", ff: [[0, 380], [0.4, 650], [1.1, 320]], q: 2.5, dur: 1.15, vol: 0.28, vib: [5, 5] }),
  perro: () => [0, 0.26].forEach((r) => { voz({ tipo: "sawtooth", f: [[0, 330], [0.14, 160]], filtro: "bandpass", ff: [[0, 1100], [0.14, 650]], q: 1.6, dur: 0.16, vol: 0.3, retraso: r }); ruido(0.08, 1400, 0.07, r); }),
  gato: () => voz({ tipo: "sawtooth", f: [[0, 430], [0.25, 700], [0.7, 380]], filtro: "bandpass", ff: [[0, 800], [0.25, 2000], [0.7, 900]], q: 4, dur: 0.75, vol: 0.2, vib: [6, 12] }),
  pollito: () => [0, 0.12, 0.26].forEach((r) => voz({ tipo: "sine", f: [[0, 2300], [0.08, 3300]], filtro: "lowpass", ff: [[0, 5000]], dur: 0.09, vol: 0.2, retraso: r })),
  caballo: () => voz({ tipo: "sawtooth", f: [[0, 520], [0.18, 980], [0.7, 420], [1.0, 300]], filtro: "bandpass", ff: [[0, 1200], [0.3, 2200], [1.0, 800]], q: 1.8, dur: 1.0, vol: 0.2, vib: [28, 40] }),
  pato: () => [0, 0.22].forEach((r) => voz({ tipo: "sawtooth", f: [[0, 520], [0.14, 320]], filtro: "bandpass", ff: [[0, 1500], [0.14, 1000]], q: 5, dur: 0.15, vol: 0.28, retraso: r })),
};
