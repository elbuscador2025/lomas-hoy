"use client";
import { useEffect } from "react";

// Los botones que "se sienten": al apretarlos, una vibración cortita y un "clic" suave (el sonido se apaga en Configurar avisos).
const BOTONES = ".tile, .transporte .renglon, .btn.llamar, .btn.llamar-si, .btn.grande-btn, .btn.whatsapp, .btn.whatsapp-chico, .tarjeta-publicar, .noche-btn";
const CLAVE_SONIDO = "lomas-hoy:sonido";
export const sonidoActivo = () => { try { return localStorage.getItem(CLAVE_SONIDO) !== "no"; } catch { return true; } };
export const guardarSonido = (v: boolean) => { try { localStorage.setItem(CLAVE_SONIDO, v ? "si" : "no"); } catch {} };

let audio: AudioContext | null = null;
function clic() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio ??= new AC();
    if (audio.state === "suspended") audio.resume();
    const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(1500, t);
    o.frequency.exponentialRampToValueAtTime(800, t + 0.035);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.004); // muy suave
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045); // muy corto
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + 0.05);
  } catch {}
}

export default function FeedbackToque() {
  useEffect(() => {
    const alApretar = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest?.(BOTONES)) return;
      try { navigator.vibrate?.(12); } catch {}
      if (sonidoActivo()) clic();
    };
    document.addEventListener("pointerdown", alApretar, { passive: true });
    return () => document.removeEventListener("pointerdown", alApretar);
  }, []);
  return null;
}
