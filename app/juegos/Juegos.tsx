"use client";
import type { ComponentType } from "react";
import Apila from "./Apila";
import Viborita from "./Viborita";
import TaTeTi from "./TaTeTi";

// Sección "Juegos". Para sumar un juego nuevo: crear su componente en esta carpeta y agregarlo a esta lista (nada más hay que tocar).
export type Juego = { id: string; nombre: string; emoji: string; descripcion: string; Componente: ComponentType };
export const JUEGOS: Juego[] = [
  { id: "apila", nombre: "Apilá", emoji: "🧱", descripcion: "Piezas que caen: completá líneas y sumá puntos", Componente: Apila },
  { id: "viborita", nombre: "La Viborita", emoji: "🐍", descripcion: "Comé frutas y crecé sin chocarte", Componente: Viborita },
  { id: "tateti", nombre: "Ta-Te-Ti", emoji: "⭕", descripcion: "Contra la compu o entre dos", Componente: TaTeTi },
];

export default function ListaJuegos({ onAbrir }: { onAbrir: (id: string) => void }) {
  return (
    <>
      <p className="vacio">Juegos gratis para pasar el rato. Los récords se guardan solo en tu celular.</p>
      <ul className="jg-lista">
        {JUEGOS.map((j) => (
          <li key={j.id}>
            <button className="jg-tarjeta" onClick={() => onAbrir(j.id)}>
              <span className="jg-emoji" aria-hidden>{j.emoji}</span>
              <span className="jg-texto"><b>{j.nombre}</b><small>{j.descripcion}</small></span>
              <span className="jg-flecha" aria-hidden>›</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
