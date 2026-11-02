"use client";
// Dibujos de "Pequeños creativos": todos propios, hechos con formas simples (nada de personajes ni marcas conocidas).
import { createElement } from "react";

export const COLORES = [
  { id: "rojo", c: "#E53935" }, { id: "naranja", c: "#FF8A00" }, { id: "amarillo", c: "#FFC400" }, { id: "verde", c: "#2E9E4F" },
  { id: "celeste", c: "#29B6F6" }, { id: "azul", c: "#1E63D6" }, { id: "violeta", c: "#8E44AD" }, { id: "rosa", c: "#F06292" },
];
const TINTA = "#10213F";

// ---- Formas ----
export const FORMAS = ["circulo", "cuadrado", "triangulo", "estrella", "corazon"] as const;
const COLOR_FORMA: Record<string, string> = { circulo: "#E53935", cuadrado: "#1E63D6", triangulo: "#2E9E4F", estrella: "#FFC400", corazon: "#F06292" };
export function Forma({ id }: { id: string }) {
  const f = COLOR_FORMA[id], b = { fill: f, stroke: TINTA, strokeWidth: 4, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      {id === "circulo" && <circle cx="50" cy="50" r="38" {...b} />}
      {id === "cuadrado" && <rect x="14" y="14" width="72" height="72" rx="8" {...b} />}
      {id === "triangulo" && <polygon points="50,12 90,84 10,84" {...b} />}
      {id === "estrella" && <polygon points="50,8 61,38 93,38 67,57 77,89 50,70 23,89 33,57 7,38 39,38" {...b} />}
      {id === "corazon" && <path d="M50 88 C10 58 8 28 28 20 C40 15 48 22 50 30 C52 22 60 15 72 20 C92 28 90 58 50 88 Z" {...b} />}
    </svg>
  );
}

// ---- Colores (una mancha de cada color) ----
export function Mancha({ id }: { id: string }) {
  const c = COLORES.find((x) => x.id === id)?.c ?? "#999";
  return <svg viewBox="0 0 100 100" aria-hidden><circle cx="50" cy="50" r="40" fill={c} stroke={TINTA} strokeWidth="4" /></svg>;
}

// ---- Animales ----
export const ANIMALES = ["gato", "perro", "pez", "pollito", "conejo"] as const;
const ojos = (x1: number, x2: number, y: number, r = 4.5) => (<><circle cx={x1} cy={y} r={r} fill={TINTA} /><circle cx={x2} cy={y} r={r} fill={TINTA} /><circle cx={x1 + 1.5} cy={y - 1.5} r={1.4} fill="#fff" /><circle cx={x2 + 1.5} cy={y - 1.5} r={1.4} fill="#fff" /></>);
export function Animal({ id }: { id: string }) {
  const l = { stroke: TINTA, strokeWidth: 3.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      {id === "gato" && (<>
        <polygon points="18,44 20,10 44,26" fill="#F5A04A" {...l} /><polygon points="82,44 80,10 56,26" fill="#F5A04A" {...l} />
        <circle cx="50" cy="56" r="34" fill="#F5A04A" {...l} />{ojos(37, 63, 52)}
        <polygon points="46,62 54,62 50,68" fill="#F06292" {...l} />
        <path d="M50 68 Q44 76 38 72 M50 68 Q56 76 62 72" fill="none" {...l} />
        <path d="M14 60 L32 62 M14 70 L32 67 M86 60 L68 62 M86 70 L68 67" fill="none" strokeWidth="2.5" stroke={TINTA} strokeLinecap="round" />
      </>)}
      {id === "perro" && (<>
        <ellipse cx="22" cy="48" rx="13" ry="26" fill="#8A5A2B" {...l} /><ellipse cx="78" cy="48" rx="13" ry="26" fill="#8A5A2B" {...l} />
        <circle cx="50" cy="52" r="32" fill="#D9A066" {...l} />{ojos(38, 62, 46)}
        <ellipse cx="50" cy="64" rx="15" ry="11" fill="#F3D2A8" {...l} /><ellipse cx="50" cy="59" rx="6" ry="4.5" fill={TINTA} />
        <path d="M44 70 Q50 78 56 70" fill="#F06292" {...l} />
      </>)}
      {id === "pez" && (<>
        <polygon points="70,50 94,28 94,72" fill="#FF8A00" {...l} />
        <ellipse cx="44" cy="50" rx="34" ry="24" fill="#29B6F6" {...l} />
        <path d="M36 28 Q46 14 56 28" fill="#1E63D6" {...l} />
        <circle cx="26" cy="46" r="5" fill="#fff" {...l} strokeWidth="2.5" /><circle cx="25" cy="46" r="2.2" fill={TINTA} />
        <path d="M16 58 Q22 62 28 58" fill="none" {...l} strokeWidth="3" />
        <path d="M46 36 Q52 50 46 64 M58 38 Q63 50 58 62" fill="none" stroke="#1E63D6" strokeWidth="3" strokeLinecap="round" />
      </>)}
      {id === "pollito" && (<>
        <path d="M40 86 L36 94 M60 86 L64 94" stroke="#FF8A00" strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="54" r="34" fill="#FFD93B" {...l} />
        <path d="M20 58 Q8 52 16 44 Q26 50 28 60 Z" fill="#FFC400" {...l} /><path d="M80 58 Q92 52 84 44 Q74 50 72 60 Z" fill="#FFC400" {...l} />
        <path d="M44 22 Q42 12 48 10 M52 20 Q54 10 60 12" fill="none" {...l} />
        {ojos(38, 62, 48)}
        <polygon points="42,58 58,58 50,70" fill="#FF8A00" {...l} />
      </>)}
      {id === "conejo" && (<>
        <ellipse cx="36" cy="26" rx="11" ry="25" fill="#F2F2F2" {...l} /><ellipse cx="64" cy="26" rx="11" ry="25" fill="#F2F2F2" {...l} />
        <ellipse cx="36" cy="28" rx="5" ry="17" fill="#F8BBD0" /><ellipse cx="64" cy="28" rx="5" ry="17" fill="#F8BBD0" />
        <circle cx="50" cy="66" r="28" fill="#F2F2F2" {...l} />{ojos(39, 61, 62)}
        <ellipse cx="50" cy="72" rx="5" ry="3.5" fill="#F06292" />
        <path d="M50 75 Q44 82 38 78 M50 75 Q56 82 62 78" fill="none" {...l} strokeWidth="3" />
      </>)}
    </svg>
  );
}

// ---- Dibujos para colorear: cada pieza se pinta con un toque ----
type Pieza = { k: "c" | "e" | "r" | "p" | "t"; a: number[] };
export type Lamina = { id: string; piezas: Pieza[] };
// c = círculo (cx, cy, r) · e = elipse (cx, cy, rx, ry) · r = rectángulo (x, y, ancho, alto, radio) · p = polígono (pares x,y)
const pet = (n: number) => Array.from({ length: n }, (_, i): Pieza => { const t = (i / n) * Math.PI * 2; return { k: "c", a: [100 + Math.cos(t) * 42, 78 + Math.sin(t) * 42, 24] }; });
export const LAMINAS: Lamina[] = [
  { id: "flor", piezas: [
    { k: "r", a: [94, 110, 12, 78, 4] }, { k: "e", a: [66, 150, 26, 12] }, { k: "e", a: [134, 130, 26, 12] },
    ...pet(6), { k: "c", a: [100, 78, 24] },
  ] },
  { id: "casa", piezas: [
    { k: "c", a: [158, 38, 22] }, { k: "r", a: [34, 92, 132, 90, 4] }, { k: "p", a: [24, 96, 100, 36, 176, 96] },
    { k: "r", a: [86, 126, 28, 56, 3] }, { k: "r", a: [46, 108, 28, 26, 3] }, { k: "r", a: [126, 108, 28, 26, 3] },
  ] },
  { id: "auto", piezas: [
    { k: "r", a: [18, 102, 164, 44, 14] }, { k: "p", a: [52, 102, 70, 64, 130, 64, 150, 102] },
    { k: "p", a: [64, 98, 76, 72, 96, 72, 96, 98] }, { k: "p", a: [104, 98, 104, 72, 124, 72, 138, 98] },
    { k: "c", a: [56, 148, 20] }, { k: "c", a: [146, 148, 20] },
  ] },
  { id: "gato", piezas: [
    { k: "p", a: [40, 90, 40, 30, 84, 56] }, { k: "p", a: [160, 90, 160, 30, 116, 56] }, { k: "c", a: [100, 112, 62] },
    { k: "c", a: [78, 104, 9] }, { k: "c", a: [122, 104, 9] }, { k: "p", a: [92, 122, 108, 122, 100, 134] },
  ] },
  { id: "pez", piezas: [
    { k: "p", a: [140, 100, 188, 62, 188, 138] }, { k: "e", a: [90, 100, 66, 46] }, { k: "p", a: [70, 60, 96, 30, 116, 62] },
    { k: "c", a: [58, 90, 9] }, { k: "c", a: [96, 128, 8] }, { k: "c", a: [118, 120, 6] },
  ] },
  { id: "mariposa", piezas: [
    { k: "e", a: [60, 66, 40, 30] }, { k: "e", a: [140, 66, 40, 30] }, { k: "e", a: [66, 130, 32, 26] }, { k: "e", a: [134, 130, 32, 26] },
    { k: "e", a: [100, 100, 9, 46] }, { k: "c", a: [100, 48, 11] },
  ] },
];
export function LaminaSVG({ lamina, rellenos, onToque }: { lamina: Lamina; rellenos: Record<number, string>; onToque: (i: number) => void }) {
  return (
    <svg viewBox="0 0 200 200" className="pq-lamina" role="img" aria-label="Dibujo para colorear">
      {lamina.piezas.map((p, i) => {
        const fill = rellenos[i] ?? "#FFFFFF";
        const comun = { key: i, fill, stroke: TINTA, strokeWidth: 3, strokeLinejoin: "round", onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); onToque(i); }, style: { cursor: "pointer" } };
        if (p.k === "c") return createElement("circle", { ...comun, cx: p.a[0], cy: p.a[1], r: p.a[2] });
        if (p.k === "e") return createElement("ellipse", { ...comun, cx: p.a[0], cy: p.a[1], rx: p.a[2], ry: p.a[3] });
        if (p.k === "r") return createElement("rect", { ...comun, x: p.a[0], y: p.a[1], width: p.a[2], height: p.a[3], rx: p.a[4] });
        return createElement("polygon", { ...comun, points: p.a.join(",") });
      })}
    </svg>
  );
}
