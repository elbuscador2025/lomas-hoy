"use client";
import { useEffect, useRef, useState } from "react";
import { COLORES } from "./dibujos";
import type { Sonar } from "./sonidos";

// BURBUJAS: suben burbujas de colores y tamaños distintos; al tocarlas revientan con un "plop" y una lluvia de estrellitas. No hay puntaje ni fin.
type Burbuja = { id: number; x: number; tam: number; color: string; dur: number; sway: number; roto?: boolean };
const MAXIMO = 12;
export default function Burbujas({ sonar }: { sonar: (s: Sonar) => void }) {
  const [lista, setLista] = useState<Burbuja[]>([]);
  const n = useRef(0);
  useEffect(() => {
    const nueva = (): Burbuja => {
      const tam = 64 + Math.random() * 70;
      return { id: ++n.current, x: 4 + Math.random() * 82, tam, color: COLORES[Math.floor(Math.random() * COLORES.length)].c, dur: 6 + Math.random() * 5, sway: 2 + Math.random() * 3 };
    };
    setLista([nueva(), nueva(), nueva()].map((b, i) => ({ ...b, dur: 4 + i * 1.5 }))); // al abrir ya hay algunas subiendo
    const t = setInterval(() => setLista((l) => (l.length >= MAXIMO ? l : [...l, nueva()])), 750);
    return () => clearInterval(t);
  }, []);
  const quitar = (id: number) => setLista((l) => l.filter((b) => b.id !== id));
  const reventar = (id: number) => {
    sonar("plop");
    setLista((l) => l.map((b) => (b.id === id && !b.roto ? { ...b, roto: true } : b)));
    setTimeout(() => quitar(id), 650);
  };
  return (
    <div className="pq-burbujas">
      {lista.map((b) => (
        <div key={b.id} className={`pq-burbuja${b.roto ? " roto" : ""}`} style={{ left: `${b.x}%`, width: b.tam, height: b.tam, animationDuration: `${b.dur}s` }}
          onAnimationEnd={(e) => { if (e.animationName === "pq-sube") quitar(b.id); }}
          onPointerDown={(e) => { e.preventDefault(); reventar(b.id); }}>
          {!b.roto ? (
            <span className="pq-bola" style={{ background: `radial-gradient(circle at 32% 28%, #fff 0, #fff 7%, ${b.color}66 34%, ${b.color}99 70%, ${b.color}cc 100%)`, borderColor: b.color, animationDuration: `${b.sway}s` }} />
          ) : (
            Array.from({ length: 9 }, (_, i) => <i key={i} className="pq-estrellita" style={{ ["--a" as string]: `${i * 40}deg`, ["--d" as string]: `${b.tam * 0.55 + (i % 3) * 14}px`, color: COLORES[(i + 2) % COLORES.length].c }}>★</i>)
          )}
        </div>
      ))}
    </div>
  );
}
