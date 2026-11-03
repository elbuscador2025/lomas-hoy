"use client";
import { useEffect, useRef, useState } from "react";
import { CieloYPiso, DibujoCompleto, GUIAS, Parte, type Guia, type Lugar } from "./dibujos-guia";
import type { Sonar } from "./sonidos";

// BLOQUES CON GUÍA: se elige un dibujo (auto, casa, camión o castillo), aparece su sombra y el nene arrastra cada pieza a su lugar.
// Si la suelta cerca del lugar correcto se acomoda sola; si la suelta lejos, vuelve a la fila (sin sonido de error). Al completar hay festejo y vuelve a la pantalla de elegir.
const TIEMPO_FESTEJO = 4300;
const MARGEN = 14; // distancia extra (en unidades del dibujo) que se perdona al soltar
type Arrastre = { clave: string; lugar: Lugar; x: number; y: number; vuelve?: { x: number; y: number } };

export default function Bloques({ sonar, atras }: { sonar: (s: Sonar) => void; atras: React.MutableRefObject<(() => void) | null> }) {
  const [guia, setGuia] = useState<Guia | null>(null);
  const [llenas, setLlenas] = useState<string[]>([]); // lugares ya ocupados
  const [fila, setFila] = useState<string[]>([]); // piezas que todavía están abajo
  const [arr, setArr] = useState<Arrastre | null>(null);
  const [festejo, setFestejo] = useState(false);
  const escena = useRef<SVGSVGElement>(null), caja = useRef<HTMLDivElement>(null);

  // El botón 🏠 de la barra vuelve a la pantalla de elegir mientras hay un dibujo abierto
  useEffect(() => {
    atras.current = guia ? () => setGuia(null) : null;
    return () => { atras.current = null; };
  }, [guia, atras]);

  const elegir = (g: Guia) => { sonar("pop"); setGuia(g); setLlenas([]); setFila(g.lugares.map((l) => l.id)); setArr(null); setFestejo(false); };
  const completo = !!guia && llenas.length === guia.lugares.length;
  useEffect(() => {
    if (!completo || !guia) return;
    setFestejo(true);
    const t0 = window.setTimeout(() => sonar(guia.id === "casa" ? "luces" : guia.id === "castillo" ? "fanfarria" : "bocina"), 250);
    const t1 = window.setTimeout(() => sonar("premio"), 900);
    const t2 = window.setTimeout(() => { setGuia(null); setFestejo(false); }, TIEMPO_FESTEJO);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [completo, guia, sonar]);

  // Medidas de la escena: el dibujo (300 x 300) se ve lo más grande posible y centrado
  const medida = () => {
    const r = escena.current!.getBoundingClientRect(), s = Math.min(r.width, r.height) / 300;
    return { s, x0: r.left + (r.width - 300 * s) / 2, y0: r.top + (r.height - 300 * s) / 2 };
  };

  const empezar = (e: React.PointerEvent, clave: string) => {
    if (!guia || festejo) return;
    e.preventDefault();
    const lugar = guia.lugares.find((l) => l.id === clave)!, id = e.pointerId, ficha = e.currentTarget as HTMLElement;
    const origen = ficha.getBoundingClientRect(), centroOrigen = { x: origen.left + origen.width / 2, y: origen.top + origen.height / 2 };
    const { s } = medida();
    const alto = lugar.h * s;
    const pos = (m: { clientX: number; clientY: number }) => ({ x: m.clientX, y: m.clientY - alto * 0.5 - 18 }); // la pieza se ve arriba del dedo
    try { ficha.setPointerCapture(id); } catch {}
    sonar("toque");
    setArr({ clave, lugar, ...pos(e) });
    const mover = (m: PointerEvent) => { if (m.pointerId === id) setArr({ clave, lugar, ...pos(m) }); };
    const fin = (m: PointerEvent) => {
      if (m.pointerId !== id) return;
      window.removeEventListener("pointermove", mover); window.removeEventListener("pointerup", fin); window.removeEventListener("pointercancel", fin);
      const p = pos(m), me = medida();
      // ¿cerca de un lugar libre del mismo tipo? (se perdona bastante la distancia)
      let mejor: Lugar | null = null, dist = Infinity;
      for (const l of guia.lugares) {
        if (llenas.includes(l.id) || l.tipo !== lugar.tipo) continue;
        const cx = me.x0 + (l.x + l.w / 2) * me.s, cy = me.y0 + (l.y + l.h / 2) * me.s;
        const d = Math.hypot(p.x - cx, p.y - cy), limite = (Math.max(l.w, l.h) * 0.75 + MARGEN) * me.s;
        if (m.type !== "pointercancel" && d < limite && d < dist) { mejor = l; dist = d; }
      }
      if (mejor) {
        setArr(null);
        setLlenas((x) => [...x, mejor!.id]); setFila((f) => f.filter((k) => k !== clave));
        sonar("toc");
      } else {
        setArr({ clave, lugar, ...p, vuelve: centroOrigen }); // vuelve despacito a la fila
        window.setTimeout(() => setArr((a) => (a && a.vuelve ? null : a)), 330);
      }
    };
    window.addEventListener("pointermove", mover); window.addEventListener("pointerup", fin); window.addEventListener("pointercancel", fin);
  };

  if (!guia) {
    return (
      <div className="pq-menu">
        {GUIAS.map((g) => (
          <button key={g.id} className="pq-gran" aria-label={g.id} onPointerDown={(e) => { e.preventDefault(); elegir(g); }}><DibujoCompleto guia={g} /></button>
        ))}
      </div>
    );
  }

  const vehiculo = guia.id === "auto" || guia.id === "camion";
  const ventana = guia.lugares.find((l) => l.tipo === "ventana"), muro = guia.lugares.find((l) => l.tipo === "muro");
  const { s: escala } = arr && caja.current && escena.current ? medida() : { s: 1 };
  return (
    <div className="pq-bloques" ref={caja}>
      <div className="pq-escena">
        <svg ref={escena} viewBox="0 0 300 300" overflow="visible" aria-label="Dibujo para armar">
          <CieloYPiso noche={festejo && guia.id === "casa"} />
          <g className={festejo && vehiculo ? "pq-sale" : undefined}>
            {guia.lugares.map((l) => {
              const puesta = llenas.includes(l.id);
              return (
                <svg key={l.id} x={l.x} y={l.y} width={l.w} height={l.h} viewBox={`0 0 ${l.w} ${l.h}`} overflow="visible" className={puesta ? "pq-puesta" : undefined}>
                  <Parte tipo={l.tipo} w={l.w} h={l.h} gris={!puesta} color={l.color} luz={festejo && guia.id === "casa"} gira={festejo && vehiculo} />
                </svg>
              );
            })}
          </g>
          {festejo && guia.id === "casa" && ventana && <circle className="pq-brillo" cx={ventana.x + ventana.w / 2} cy={ventana.y + ventana.h / 2} r="30" fill="none" stroke="#FFE066" strokeWidth="6" />}
          {guia.id === "castillo" && muro && (
            <g className={festejo ? "pq-bandera sube" : "pq-bandera"}>
              <path d={`M${muro.x + muro.w / 2} ${muro.y} V${muro.y - 56}`} stroke={TINTA_BANDERA} strokeWidth="4" strokeLinecap="round" />
              <polygon points={`${muro.x + muro.w / 2 + 2},${muro.y - 56} ${muro.x + muro.w / 2 + 38},${muro.y - 44} ${muro.x + muro.w / 2 + 2},${muro.y - 32}`} fill="#E53935" stroke={TINTA_BANDERA} strokeWidth="3" strokeLinejoin="round" />
            </g>
          )}
        </svg>
        {festejo && <div className="pq-lluvia" aria-hidden>{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ left: `${(i * 37 + 8) % 92}%`, animationDelay: `${((i * 53) % 10) * 0.11}s`, color: ["#FFB300", "#E53935", "#1E63D6", "#2E9E4F", "#8E44AD"][i % 5] }}>★</i>)}</div>}
      </div>
      <div className="pq-bandeja">
        {fila.map((k) => {
          const l = guia.lugares.find((x) => x.id === k)!, esc = 64 / Math.max(l.w, l.h);
          return (
            <div key={k} className={`pq-ficha${arr?.clave === k ? " arrastrando" : ""}`} onPointerDown={(e) => empezar(e, k)}>
              <svg width={l.w * esc} height={l.h * esc} viewBox={`0 0 ${l.w} ${l.h}`} aria-hidden><Parte tipo={l.tipo} w={l.w} h={l.h} color={l.color} /></svg>
            </div>
          );
        })}
      </div>
      {arr && caja.current && (() => {
        const r = caja.current!.getBoundingClientRect(), w = arr.lugar.w * escala, h = arr.lugar.h * escala, at = arr.vuelve ?? arr;
        return (
          <div className={`pq-fantasma${arr.vuelve ? " vuelve" : ""}`} style={{ width: w, height: h, transform: `translate(${at.x - r.left - w / 2}px, ${at.y - r.top - h / 2}px)` }}>
            <svg width={w} height={h} viewBox={`0 0 ${arr.lugar.w} ${arr.lugar.h}`} aria-hidden><Parte tipo={arr.lugar.tipo} w={arr.lugar.w} h={arr.lugar.h} color={arr.lugar.color} /></svg>
          </div>
        );
      })()}
    </div>
  );
}
const TINTA_BANDERA = "#10213F";
