"use client";
import { useRef, useState } from "react";
import { Bicho, GRANJA } from "./dibujos";
import type { Sonar } from "./sonidos";

// LA GRANJA: seis animales grandes. Al tocar uno, hace su sonido y se mueve (salta, mueve la cola o aletea). Sin puntos ni reglas.
export default function Granja({ sonar }: { sonar: (s: Sonar) => void }) {
  const [activo, setActivo] = useState<{ id: string; n: number } | null>(null);
  const fin = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tocar = (id: string) => {
    sonar(id as Sonar);
    setActivo((a) => ({ id, n: (a?.n ?? 0) + 1 })); // n cambia en cada toque: la animación se reinicia aunque se toque el mismo animal enseguida
    if (fin.current) clearTimeout(fin.current);
    fin.current = setTimeout(() => setActivo(null), 1300);
  };
  return (
    <div className="pq-granja">
      {GRANJA.map((id) => (
        <button key={id} className={`pq-bicho b-${id}${activo?.id === id ? " anim" : ""}`} aria-label="Animal" onPointerDown={(e) => { e.preventDefault(); tocar(id); }}>
          <span key={activo?.id === id ? activo.n : 0} className="pq-bicho-dib"><Bicho id={id} /></span>
        </button>
      ))}
    </div>
  );
}
