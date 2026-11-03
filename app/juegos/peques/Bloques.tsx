"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_PIEZAS, MEDIDAS, asentar, esPegatina, imantarX, medida, pegarEn, type Pieza, type Tipo } from "./bloques-logica";
import type { Sonar } from "./sonidos";

// BLOQUES: se arrastran piezas desde la fila de abajo y se sueltan sobre el piso o sobre otra pieza; se acomodan solas.
// Tocar dos veces una pieza la gira. Arrastrar una pieza de vuelta a la fila la saca. El botón 💥 tira todo y empieza de nuevo.
const TINTA = "#10213F";
const COLOR: Record<Tipo, string> = { cuadrado: "#E53935", rectangulo: "#1E63D6", triangulo: "#FFC400", arco: "#2E9E4F", circulo: "#FF8A00", techo: "#D9480F", puerta: "#8A5A2B", ventana: "#BFE8FF", rueda: "#10213F", arbol: "#2E9E4F", muneco: "#1E63D6", perrito: "#B9742F" };
const BANDEJA: Tipo[] = ["cuadrado", "rectangulo", "triangulo", "arco", "circulo", "techo", "puerta", "ventana", "rueda", "arbol", "muneco", "perrito"];

function Arte({ t }: { t: Tipo }) {
  const [w, h] = MEDIDAS[t], W = w * 100, H = h * 100, f = COLOR[t];
  const b = { stroke: TINTA, strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden>
      {t === "cuadrado" && <rect x="3" y="3" width={W - 6} height={H - 6} rx="8" fill={f} {...b} />}
      {t === "rectangulo" && <rect x="3" y="3" width={W - 6} height={H - 6} rx="8" fill={f} {...b} />}
      {t === "triangulo" && <polygon points={`${W / 2},4 ${W - 4},${H - 4} 4,${H - 4}`} fill={f} {...b} />}
      {t === "arco" && <path d={`M4 ${H - 4} V4 H${W - 4} V${H - 4} H${W / 2 + 48} A48 48 0 0 0 ${W / 2 - 48} ${H - 4} Z`} fill={f} {...b} />}
      {t === "circulo" && <ellipse cx={W / 2} cy={H / 2} rx={W / 2 - 4} ry={H / 2 - 4} fill={f} {...b} />}
      {t === "techo" && <><polygon points={`${W / 2},4 ${W - 4},${H - 4} 4,${H - 4}`} fill={f} {...b} /><path d={`M${W * 0.3} ${H * 0.62} H${W * 0.7}`} stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".5" /></>}
      {t === "puerta" && <><path d={`M4 ${H - 4} V40 Q4 4 ${W / 2} 4 Q${W - 4} 4 ${W - 4} 40 V${H - 4} Z`} fill={f} {...b} /><circle cx={W - 20} cy={H * 0.58} r="6" fill="#FFC400" stroke={TINTA} strokeWidth="3" /></>}
      {t === "ventana" && <><rect x="4" y="4" width={W - 8} height={H - 8} rx="6" fill={f} {...b} /><path d={`M${W / 2} 6 V${H - 6} M6 ${H / 2} H${W - 6}`} stroke={TINTA} strokeWidth="5" /></>}
      {t === "rueda" && <><circle cx={W / 2} cy={H / 2} r={W / 2 - 4} fill={f} {...b} /><circle cx={W / 2} cy={H / 2} r="17" fill="#C9CFDF" stroke="#fff" strokeWidth="3" /><circle cx={W / 2} cy={H / 2} r="5" fill={TINTA} /></>}
      {t === "arbol" && <>
        <rect x="46" y="110" width="28" height="86" rx="6" fill="#8A5A2B" {...b} />
        <circle cx="60" cy="52" r="42" fill={f} {...b} /><circle cx="34" cy="82" r="30" fill={f} {...b} /><circle cx="86" cy="82" r="30" fill={f} {...b} /><circle cx="60" cy="66" r="30" fill={f} />
        <circle cx="46" cy="46" r="5" fill="#E53935" /><circle cx="76" cy="62" r="5" fill="#E53935" /><circle cx="52" cy="80" r="5" fill="#E53935" />
      </>}
      {t === "muneco" && <>
        <rect x="14" y="92" width="16" height="54" rx="7" fill="#10213F" {...b} /><rect x="40" y="92" width="16" height="54" rx="7" fill="#10213F" {...b} />
        <rect x="8" y="50" width="54" height="56" rx="14" fill={f} {...b} />
        <circle cx="35" cy="30" r="25" fill="#F5C9A0" {...b} />
        <circle cx="26" cy="28" r="3.5" fill={TINTA} /><circle cx="44" cy="28" r="3.5" fill={TINTA} /><path d="M26 40 Q35 47 44 40" fill="none" stroke={TINTA} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M12 20 Q35 -2 58 20 Q40 12 12 20 Z" fill="#8A5A2B" stroke={TINTA} strokeWidth="3" />
      </>}
      {t === "perrito" && <>
        <rect x="26" y="62" width="12" height="24" rx="5" fill="#8A5A2B" {...b} /><rect x="82" y="62" width="12" height="24" rx="5" fill="#8A5A2B" {...b} />
        <path d="M18 50 Q4 36 10 22" fill="none" stroke="#8A5A2B" strokeWidth="9" strokeLinecap="round" />
        <ellipse cx="60" cy="52" rx="44" ry="22" fill={f} {...b} />
        <circle cx="100" cy="36" r="22" fill={f} {...b} /><ellipse cx="86" cy="40" rx="8" ry="15" transform="rotate(14 86 40)" fill="#8A5A2B" {...b} />
        <ellipse cx="116" cy="44" rx="10" ry="8" fill="#F3D2A8" {...b} /><circle cx="122" cy="42" r="3.5" fill={TINTA} /><circle cx="102" cy="30" r="4" fill={TINTA} />
      </>}
    </svg>
  );
}

type Arrastre = { t: Tipo; rot: number; x: number; y: number; desde: "bandeja" | number };
export default function Bloques({ sonar }: { sonar: (s: Sonar) => void }) {
  const caja = useRef<HTMLDivElement>(null), escena = useRef<HTMLDivElement>(null), bandeja = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ w: 360, h: 420 });
  const [piezas, setPiezas] = useState<Pieza[]>([]);
  const [arr, setArr] = useState<Arrastre | null>(null);
  const [cayendo, setCayendo] = useState(false);
  const num = useRef(0), ultimoToque = useRef<{ id: number; t: number }>({ id: -1, t: 0 });
  const u = Math.round(Math.max(34, Math.min(56, tam.w / 7.5)));
  const SUELO = 28; // alto del pasto
  const suelo = tam.h - SUELO;

  useEffect(() => {
    const el = escena.current; if (!el) return;
    const medir = () => setTam({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const ro = new ResizeObserver(medir); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Si cambia el tamaño (u, suelo), todo se vuelve a acomodar
  useEffect(() => { setPiezas((p) => (p.length ? asentar(p, suelo, tam.w, u) : p)); }, [suelo, tam.w, u]);

  const aEscena = (cx: number, cy: number) => { const r = escena.current!.getBoundingClientRect(); return { x: cx - r.left, y: cy - r.top, dentro: cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom }; };
  const soltar = useCallback((a: Arrastre, resto: Pieza[]) => {
    const { x, y, dentro } = aEscena(a.x, a.y);
    if (!dentro || resto.length >= MAX_PIEZAS) { setPiezas(asentar(resto, suelo, tam.w, u)); if (a.desde !== "bandeja") sonar("pop"); return; } // soltada sobre la fila: se saca
    const id = ++num.current, pega = pegarEn(a.t, x, y, resto, u);
    const nueva: Pieza = pega ? { id, t: a.t, c: "", rot: 0, x, y, ...pega } : { id, t: a.t, c: "", rot: a.rot, x: imantarX(x, a.t, a.rot, resto, u), y };
    setPiezas(asentar([...resto, nueva], suelo, tam.w, u));
    window.setTimeout(() => sonar("toc"), 140); // suena cuando termina de caer
  }, [suelo, tam.w, u, sonar]);

  // ---- Arrastre: desde la fila de abajo (hace falta tirar hacia arriba; hacia los costados desliza la fila) o desde una pieza ya puesta ----
  const empezar = (e: React.PointerEvent, t: Tipo, desde: "bandeja" | number, rot = 0) => {
    if (cayendo) return;
    const x0 = e.clientX, y0 = e.clientY, id = e.pointerId, destino = e.currentTarget as HTMLElement;
    let activo = false, resto = piezas;
    const alto = () => medida(t, rot, u).h;
    const mover = (m: PointerEvent) => {
      if (m.pointerId !== id) return;
      const dx = m.clientX - x0, dy = m.clientY - y0;
      if (!activo) {
        const lejos = Math.hypot(dx, dy) > 9;
        if (desde === "bandeja" ? !(dy < -10 && Math.abs(dy) > Math.abs(dx) * 0.8) : !lejos) return;
        activo = true;
        try { destino.setPointerCapture(id); } catch {}
        if (desde !== "bandeja") { resto = piezas.filter((p) => p.id !== desde); setPiezas(asentar(resto, suelo, tam.w, u)); }
        sonar("toque");
      }
      setArr({ t, rot, x: m.clientX, y: m.clientY - alto() * 0.7 - 6, desde });
    };
    const fin = (m: PointerEvent) => {
      if (m.pointerId !== id) return;
      window.removeEventListener("pointermove", mover); window.removeEventListener("pointerup", fin); window.removeEventListener("pointercancel", fin);
      if (activo) { const a = { t, rot, x: m.clientX, y: m.clientY - alto() * 0.7 - 6, desde }; setArr(null); if (m.type === "pointercancel" && desde === "bandeja") return; soltar(a, resto); return; }
      // un toque sobre una pieza puesta: dos toques seguidos la giran
      if (desde !== "bandeja") {
        const ahora = Date.now(), previo = ultimoToque.current;
        if (previo.id === desde && ahora - previo.t < 380) { ultimoToque.current = { id: -1, t: 0 }; girar(desde); } else ultimoToque.current = { id: desde, t: ahora };
      }
    };
    window.addEventListener("pointermove", mover); window.addEventListener("pointerup", fin); window.addEventListener("pointercancel", fin);
  };
  const girar = (id: number) => {
    setPiezas((ps) => { const p = ps.find((q) => q.id === id); if (!p || esPegatina(p.t)) return ps; sonar("pop"); return asentar(ps.map((q) => (q.id === id ? { ...q, rot: (q.rot + 1) % 4 } : q)), suelo, tam.w, u); });
  };
  const tirarTodo = () => {
    if (cayendo || !piezas.length) return;
    setCayendo(true); sonar("derrumbe");
    window.setTimeout(() => { setPiezas([]); setCayendo(false); }, 1100);
  };

  const orden = [...piezas].sort((a, b) => Number(esPegatina(a.t) && a.host !== undefined) - Number(esPegatina(b.t) && b.host !== undefined));
  const estilo = (p: Pieza) => {
    const m = medida(p.t, p.rot, u);
    const caida = cayendo ? `translate(${((p.id * 37) % 90) - 45}px, ${tam.h + 140}px) rotate(${((p.id * 53) % 200) - 100}deg)` : "";
    return { width: m.w, height: m.h, transform: `translate(${p.x - m.w / 2}px, ${p.y - m.h / 2}px) ${caida}`, transition: cayendo ? `transform ${0.7 + (p.id % 4) * 0.1}s cubic-bezier(.5,0,1,.7)` : "transform .22s ease-out" } as React.CSSProperties;
  };
  const dentroGirado = (p: Pieza) => { const m = medida(p.t, 0, u); const mm = medida(p.t, p.rot, u); return { width: m.w, height: m.h, left: (mm.w - m.w) / 2, top: (mm.h - m.h) / 2, transform: `rotate(${p.rot * 90}deg)` } as React.CSSProperties; };

  return (
    <div className="pq-bloques" ref={caja}>
      <div className="pq-escena" ref={escena}>
        <div className="pq-pasto" style={{ height: SUELO }} />
        {orden.map((p) => (
          <div key={p.id} className="pq-pieza" style={estilo(p)} onPointerDown={(e) => { e.preventDefault(); empezar(e, p.t, p.id, p.rot); }}>
            <div className="pq-pieza-dib" style={dentroGirado(p)}><Arte t={p.t} /></div>
          </div>
        ))}
        <button className="pq-boom" aria-label="Tirar todo" onPointerDown={(e) => { e.preventDefault(); tirarTodo(); }}>💥</button>
      </div>
      <div className="pq-bandeja" ref={bandeja}>
        {BANDEJA.map((t) => {
          const [w, h] = MEDIDAS[t], k = 60 / Math.max(w, h);
          return (
            <div key={t} className="pq-ficha" onPointerDown={(e) => empezar(e, t, "bandeja")}>
              <div style={{ width: w * k, height: h * k }}><Arte t={t} /></div>
            </div>
          );
        })}
      </div>
      {arr && (() => { const m = medida(arr.t, arr.rot, u), r = caja.current!.getBoundingClientRect(); return (
        <div className="pq-pieza fantasma" style={{ width: m.w, height: m.h, transform: `translate(${arr.x - r.left - m.w / 2}px, ${arr.y - r.top - m.h / 2}px)` }}>
          <div className="pq-pieza-dib" style={{ width: medida(arr.t, 0, u).w, height: medida(arr.t, 0, u).h, left: (m.w - medida(arr.t, 0, u).w) / 2, top: (m.h - medida(arr.t, 0, u).h) / 2, transform: `rotate(${arr.rot * 90}deg)` }}><Arte t={arr.t} /></div>
        </div>
      ); })()}
    </div>
  );
}
