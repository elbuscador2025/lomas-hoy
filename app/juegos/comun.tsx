"use client";
// Cosas que comparten los juegos: récords en el celular, sonidos propios (con la misma opción de silencio de la app) y botones que repiten al mantenerlos apretados.
// Todo el código de los juegos es propio. No usa librerías ni recursos de terceros.
import { useCallback, useEffect, useRef, useState } from "react";
import { sonidoActivo, guardarSonido } from "../FeedbackToque";

// ---- Récords: se guardan solo en el celular (un número por juego, sin datos personales) ----
export const leerRecord = (clave: string): number => { try { return Number(localStorage.getItem(`lomas-hoy:juego:${clave}`)) || 0; } catch { return 0; } };
export const guardarRecord = (clave: string, valor: number) => { try { localStorage.setItem(`lomas-hoy:juego:${clave}`, String(valor)); } catch {} };

// ---- Sonidos: tonos sintetizados con el navegador (no hay archivos de audio). Se apagan con el mismo interruptor de la app ----
let audio: AudioContext | null = null;
function tono(frecuencia: number, duracion: number, tipo: OscillatorType = "square", volumen = 0.05, retraso = 0, hasta?: number) {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio ??= new AC();
    if (audio.state === "suspended") audio.resume();
    const t = audio.currentTime + retraso, o = audio.createOscillator(), g = audio.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(frecuencia, t);
    if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + duracion);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volumen, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + duracion + 0.02);
  } catch {}
}
export type Sonido = "mover" | "girar" | "caer" | "linea" | "comer" | "fin" | "marcar" | "marcar2" | "gana" | "empate" | "record";
const SONIDOS: Record<Sonido, () => void> = {
  mover: () => tono(300, 0.04, "triangle", 0.04),
  girar: () => tono(520, 0.06, "square", 0.04, 0, 700),
  caer: () => tono(160, 0.09, "sawtooth", 0.05, 0, 90),
  linea: () => { tono(660, 0.09, "square", 0.05); tono(880, 0.09, "square", 0.05, 0.09); tono(1180, 0.14, "square", 0.05, 0.18); },
  comer: () => { tono(620, 0.07, "triangle", 0.07); tono(930, 0.1, "triangle", 0.07, 0.07); },
  fin: () => { tono(420, 0.16, "sawtooth", 0.06, 0, 300); tono(300, 0.2, "sawtooth", 0.06, 0.16, 140); },
  marcar: () => tono(560, 0.09, "triangle", 0.07),
  marcar2: () => tono(380, 0.09, "triangle", 0.07),
  gana: () => { [523, 659, 784, 1046].forEach((f, i) => tono(f, 0.14, "triangle", 0.07, i * 0.1)); },
  empate: () => { tono(400, 0.14, "triangle", 0.06); tono(400, 0.14, "triangle", 0.06, 0.18); },
  record: () => { [784, 988, 1175, 1568].forEach((f, i) => tono(f, 0.12, "square", 0.05, i * 0.09)); },
};
export function useSonido() {
  const [activo, setActivo] = useState(true);
  useEffect(() => setActivo(sonidoActivo()), []);
  const sonar = useCallback((s: Sonido) => { if (sonidoActivo()) SONIDOS[s](); }, []);
  const alternar = () => { const v = !activo; setActivo(v); guardarSonido(v); if (v) SONIDOS.mover(); };
  return { activo, sonar, alternar };
}
export function BotonSonido({ activo, onClick }: { activo: boolean; onClick: () => void }) {
  return <button className="jg-mini" onClick={onClick} aria-pressed={!activo} aria-label={activo ? "Silenciar sonidos" : "Activar sonidos"}>{activo ? "🔊 Sonido" : "🔇 Sin sonido"}</button>;
}

// ---- Botón que repite la acción mientras se lo mantiene apretado (izquierda, derecha, bajar) ----
export function BotonRepetir({ onAccion, repetir = true, className = "", etiqueta, children }: { onAccion: () => void; repetir?: boolean; className?: string; etiqueta: string; children: React.ReactNode }) {
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null), cada = useRef<ReturnType<typeof setInterval> | null>(null);
  const parar = () => { if (espera.current) clearTimeout(espera.current); if (cada.current) clearInterval(cada.current); espera.current = cada.current = null; };
  useEffect(() => parar, []);
  return (
    <button
      className={`jg-ctrl ${className}`} aria-label={etiqueta}
      onPointerDown={(e) => { e.preventDefault(); onAccion(); if (repetir) espera.current = setTimeout(() => { cada.current = setInterval(onAccion, 85); }, 260); }}
      onPointerUp={parar} onPointerLeave={parar} onPointerCancel={parar} onContextMenu={(e) => e.preventDefault()}
    >{children}</button>
  );
}

// ---- Tamaño de la cancha: lo más grande que entre en la pantalla (celulares chicos incluidos) ----
export function useCelda(columnas: number, filas: number, reservado: number, minimo = 12, maximo = 36) {
  const [celda, setCelda] = useState(22);
  useEffect(() => {
    const medir = () => {
      const ancho = Math.min(window.innerWidth, 560) - 32, alto = window.innerHeight - reservado;
      setCelda(Math.max(minimo, Math.min(maximo, Math.floor(Math.min(ancho / columnas, alto / filas)))));
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [columnas, filas, reservado, minimo, maximo]);
  return celda;
}
