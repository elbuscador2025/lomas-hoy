"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ANIMALES, Animal, COLORES, FORMAS, Forma, Mancha } from "./dibujos";
import type { Sonar } from "./Peques";

// APRENDER JUGANDO: se muestra un dibujo arriba y el nene toca el que es igual. Sin texto, sin perder: si se equivoca, el dibujo se sacude suave y listo.
type Cat = "colores" | "formas" | "animales";
const IDS: Record<Cat, readonly string[]> = { colores: COLORES.slice(0, 6).map((c) => c.id), formas: FORMAS, animales: ANIMALES };
const Dibujo = ({ cat, id }: { cat: Cat; id: string }) => (cat === "colores" ? <Mancha id={id} /> : cat === "formas" ? <Forma id={id} /> : <Animal id={id} />);
const mezclar = <T,>(l: T[]) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Una ronda: el dibujo objetivo y las opciones (la correcta + distintas, mezcladas)
export function nuevaRonda(cat: Cat, opciones: number, anterior?: string) {
  const ids = [...IDS[cat]];
  const objetivo = mezclar(ids.filter((x) => x !== anterior))[0];
  const otras = mezclar(ids.filter((x) => x !== objetivo)).slice(0, opciones - 1);
  return { objetivo, opciones: mezclar([objetivo, ...otras]) };
}

const ESTRELLAS = 5;
export default function Aprender({ cat, sonar }: { cat: Cat; sonar: Sonar }) {
  const [nivel, setNivel] = useState(2); // 2 opciones al empezar; con aciertos seguidos pasa a 3
  const [ronda, setRonda] = useState(() => nuevaRonda(cat, 2));
  const [ganadas, setGanadas] = useState(0);
  const [bien, setBien] = useState(false);
  const [mal, setMal] = useState<string | null>(null);
  const [fallos, setFallos] = useState(0);
  const [seguidas, setSeguidas] = useState(0);
  const [fiesta, setFiesta] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current); }, []);

  const elegir = useCallback((id: string) => {
    if (bien) return;
    if (id === ronda.objetivo) {
      setBien(true);
      const g = ganadas + 1, s = seguidas + 1;
      setSeguidas(s);
      if (g >= ESTRELLAS) { sonar("premio"); setFiesta(true); } else sonar("bien");
      temporizador.current = setTimeout(() => {
        const n = s >= 3 ? 3 : nivel;
        setNivel(n); setFallos(0); setBien(false); setMal(null); setFiesta(false);
        setGanadas(g >= ESTRELLAS ? 0 : g);
        setRonda((r) => nuevaRonda(cat, n, r.objetivo));
      }, g >= ESTRELLAS ? 2200 : 1200);
    } else {
      sonar("uy"); setMal(id); setFallos((f) => f + 1); setSeguidas(0);
      setTimeout(() => setMal(null), 500);
    }
  }, [bien, ronda.objetivo, ganadas, seguidas, nivel, cat, sonar]);

  return (
    <div className="pq-aprender">
      <div className="pq-estrellas" aria-hidden>
        {Array.from({ length: ESTRELLAS }, (_, i) => <span key={i} className={`${i < ganadas + (bien ? 1 : 0) ? "llena" : ""} ${fiesta ? "salta" : ""}`}>★</span>)}
      </div>
      <div className={`pq-objetivo ${bien ? "bien" : ""}`}><Dibujo cat={cat} id={ronda.objetivo} /></div>
      <div className="pq-igual" aria-hidden>=</div>
      <div className={`pq-opciones n${ronda.opciones.length}`}>
        {ronda.opciones.map((id) => (
          <button key={id} className={`pq-opcion ${mal === id ? "mal" : ""} ${bien && id === ronda.objetivo ? "bien" : ""} ${fallos >= 2 && id === ronda.objetivo && !bien ? "pista" : ""}`}
            aria-label="Opción" onPointerDown={(e) => { e.preventDefault(); elegir(id); }}>
            <Dibujo cat={cat} id={id} />
          </button>
        ))}
      </div>
      {bien && <div className="pq-confeti" aria-hidden>{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ left: `${(i * 7 + 5) % 96}%`, animationDelay: `${(i % 5) * 0.07}s`, background: COLORES[i % COLORES.length].c }} />)}</div>}
    </div>
  );
}
