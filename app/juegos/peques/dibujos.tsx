"use client";
// Dibujos de "Pequeños creativos": todos propios, hechos con formas simples (nada de personajes ni marcas conocidas).
import { createElement } from "react";

export const COLORES = [
  { id: "rojo", c: "#E53935" }, { id: "naranja", c: "#FF8A00" }, { id: "amarillo", c: "#FFC400" }, { id: "verde", c: "#2E9E4F" },
  { id: "celeste", c: "#29B6F6" }, { id: "azul", c: "#1E63D6" }, { id: "violeta", c: "#8E44AD" }, { id: "rosa", c: "#F06292" },
];
const TINTA = "#10213F";

// ---- La Granja: seis animales de perfil, mirando a la derecha. La cola y las alas llevan una clase para animarlas al tocar ----
export const GRANJA = ["vaca", "perro", "gato", "pollito", "caballo", "pato"] as const;
export type NombreBicho = (typeof GRANJA)[number];
const l = { stroke: TINTA, strokeWidth: 3.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const ojo = (x: number, y: number) => (<><circle cx={x} cy={y} r="4.2" fill={TINTA} /><circle cx={x + 1.3} cy={y - 1.3} r="1.3" fill="#fff" /></>);
const patas = (xs: number[], color: string, y1 = 66, y2 = 92) => xs.map((x) => <rect key={x} x={x - 5} y={y1} width="10" height={y2 - y1} rx="4" fill={color} {...l} />);
export function Bicho({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 130 100" aria-hidden>
      {id === "vaca" && (<>
        <path className="cola" d="M16 46 Q4 54 8 72" fill="none" {...l} /><circle cx="8" cy="74" r="5" fill="#10213F" />
        {patas([32, 46, 78, 92], "#fff")}
        <rect x="16" y="34" width="86" height="42" rx="20" fill="#fff" {...l} />
        <path d="M34 40 Q50 36 52 50 Q46 62 34 56 Q26 48 34 40 Z M72 56 Q84 50 92 58 Q90 70 78 70 Q68 66 72 56 Z" fill="#10213F" />
        <path d="M96 28 L100 16 M116 28 L120 16" {...l} fill="none" />
        <ellipse cx="92" cy="32" rx="8" ry="5" fill="#fff" {...l} /><ellipse cx="124" cy="32" rx="6" ry="4" fill="#fff" {...l} />
        <rect x="92" y="22" width="32" height="42" rx="15" fill="#fff" {...l} />
        <ellipse cx="108" cy="54" rx="14" ry="10" fill="#F8A1B8" {...l} /><circle cx="102" cy="54" r="2.2" fill={TINTA} /><circle cx="114" cy="54" r="2.2" fill={TINTA} />
        {ojo(100, 38)}{ojo(116, 38)}
      </>)}
      {id === "perro" && (<>
        <path className="cola" d="M20 48 Q6 36 10 22" fill="none" stroke="#8A5A2B" strokeWidth="9" strokeLinecap="round" />
        {patas([34, 48, 82, 96], "#C98B52", 62, 92)}
        <ellipse cx="62" cy="54" rx="48" ry="22" fill="#D9A066" {...l} />
        <path d="M98 34 Q116 28 122 38 L124 52 Q110 62 96 56 Z" fill="#D9A066" {...l} />
        <ellipse cx="110" cy="30" rx="7" ry="14" transform="rotate(-18 110 30)" fill="#8A5A2B" {...l} />
        <ellipse cx="121" cy="46" rx="9" ry="7" fill="#F3D2A8" {...l} /><ellipse cx="127" cy="44" rx="3.4" ry="2.6" fill={TINTA} />
        {ojo(108, 42)}<path d="M114 56 Q121 62 124 55" fill="#F06292" {...l} strokeWidth="2.5" />
      </>)}
      {id === "gato" && (<>
        <path className="cola" d="M20 60 Q2 56 6 32 Q8 20 16 22" fill="none" stroke="#F5A04A" strokeWidth="9" strokeLinecap="round" />
        {patas([36, 50, 82, 94], "#F5A04A", 66, 92)}
        <ellipse cx="62" cy="58" rx="44" ry="20" fill="#F5A04A" {...l} />
        <path d="M52 44 Q58 38 64 44 M70 42 Q76 36 82 42" fill="none" stroke="#D9701A" strokeWidth="3" strokeLinecap="round" />
        <polygon points="92,34 94,14 106,28" fill="#F5A04A" {...l} /><polygon points="118,34 120,14 108,28" fill="#F5A04A" {...l} />
        <circle cx="106" cy="44" r="19" fill="#F5A04A" {...l} />{ojo(100, 42)}{ojo(113, 42)}
        <polygon points="103,50 109,50 106,54" fill="#F06292" /><path d="M106 54 Q102 59 98 56 M106 54 Q110 59 114 56" fill="none" {...l} strokeWidth="2.5" />
      </>)}
      {id === "pollito" && (<>
        <path d="M52 84 L50 94 M70 84 L72 94 M46 94 L56 94 M66 94 L76 94" stroke="#FF8A00" strokeWidth="4" strokeLinecap="round" />
        <circle cx="62" cy="56" r="36" fill="#FFD93B" {...l} />
        <path d="M40 18 Q36 8 44 6 M50 14 Q50 4 58 6" fill="none" {...l} />
        <path className="ala" d="M38 56 Q22 54 20 70 Q34 78 48 68 Z" fill="#FFC400" {...l} />
        <path className="ala" d="M86 56 Q102 54 104 70 Q90 78 76 68 Z" fill="#FFC400" {...l} />
        {ojo(50, 46)}{ojo(76, 46)}
        <polygon points="54,56 72,56 63,70" fill="#FF8A00" {...l} />
      </>)}
      {id === "caballo" && (<>
        <path className="cola" d="M20 38 Q2 48 8 78 Q14 60 24 52" fill="#5A3A1C" {...l} />
        {patas([34, 46, 80, 92], "#A8652B", 62, 94)}
        <rect x="22" y="36" width="76" height="36" rx="17" fill="#B9742F" {...l} />
        <path d="M88 44 L100 12 Q108 6 114 12 L124 36 Q126 48 116 52 L106 50 L98 62 Z" fill="#B9742F" {...l} />
        <path d="M100 12 Q96 26 92 40 M104 10 L98 8" fill="none" stroke="#5A3A1C" strokeWidth="6" strokeLinecap="round" />
        <polygon points="108,12 112,2 114,12" fill="#B9742F" {...l} />
        {ojo(112, 26)}<ellipse cx="121" cy="43" rx="2.4" ry="3" fill={TINTA} />
      </>)}
      {id === "pato" && (<>
        <path d="M54 82 L52 94 M72 82 L74 94 M46 94 L60 94 M66 94 L80 94" stroke="#FF8A00" strokeWidth="4" strokeLinecap="round" />
        <path d="M18 56 Q6 40 14 34 Q26 46 38 44 L100 50 Q104 80 66 84 Q22 86 18 56 Z" fill="#FFD93B" {...l} />
        <circle cx="94" cy="30" r="19" fill="#FFD93B" {...l} />
        <path d="M108 30 Q128 28 128 36 Q126 44 108 40 Z" fill="#FF8A00" {...l} />
        {ojo(94, 25)}
        <path className="ala" d="M40 52 Q58 44 76 56 Q66 74 44 70 Q34 62 40 52 Z" fill="#FFC400" {...l} />
      </>)}
    </svg>
  );
}

// ---- Íconos del menú ----
export function IconoBloques() {
  const b = { stroke: TINTA, strokeWidth: 4, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      <rect x="8" y="66" width="40" height="26" rx="3" fill="#E53935" {...b} /><rect x="52" y="66" width="40" height="26" rx="3" fill="#1E63D6" {...b} />
      <rect x="22" y="40" width="40" height="26" rx="3" fill="#FFC400" {...b} /><polygon points="42,10 70,40 14,40" fill="#2E9E4F" {...b} />
    </svg>
  );
}
export function IconoBurbuja() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      <circle cx="46" cy="56" r="34" fill="#BFE8FF" stroke={TINTA} strokeWidth="4" /><path d="M28 50 Q32 34 46 30" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <circle cx="80" cy="22" r="13" fill="#FFD1E8" stroke={TINTA} strokeWidth="4" /><circle cx="76" cy="18" r="3" fill="#fff" />
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
