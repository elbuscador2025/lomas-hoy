"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { COLORES, LAMINAS, LaminaSVG } from "./dibujos";
import type { Sonar } from "./Peques";

// PINTAR: dibujo libre con el dedo, o dibujos para colorear con un toque en cada parte. Nada se guarda ni se envía a ningún lado.
const GRUESOS = [10, 22, 40];

function Paleta({ color, onColor, sonar }: { color: string; onColor: (c: string) => void; sonar: Sonar }) {
  return (
    <div className="pq-paleta">
      {COLORES.map((c) => (
        <button key={c.id} className={`pq-color ${color === c.c ? "sel" : ""}`} style={{ background: c.c }} aria-label="Color"
          onPointerDown={(e) => { e.preventDefault(); onColor(c.c); sonar("toque"); }} />
      ))}
    </div>
  );
}

function Libre({ sonar }: { sonar: Sonar }) {
  const lienzo = useRef<HTMLCanvasElement>(null), caja = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState(COLORES[0].c);
  const [grueso, setGrueso] = useState(GRUESOS[1]);
  const [borrador, setBorrador] = useState(false);
  const dedo = useRef<{ id: number; x: number; y: number } | null>(null);

  // El lienzo ocupa todo el espacio libre; si cambia el tamaño (girar el celular) se conserva lo dibujado.
  useEffect(() => {
    const cv = lienzo.current, el = caja.current; if (!cv || !el) return;
    const ajustar = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2), w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      const copia = document.createElement("canvas"); copia.width = cv.width; copia.height = cv.height;
      if (cv.width) copia.getContext("2d")?.drawImage(cv, 0, 0);
      cv.width = Math.round(w * d); cv.height = Math.round(h * d);
      const c = cv.getContext("2d"); if (!c) return;
      c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height);
      if (copia.width) c.drawImage(copia, 0, 0);
    };
    ajustar();
    const ro = new ResizeObserver(ajustar); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const punto = (e: React.PointerEvent) => { const r = lienzo.current!.getBoundingClientRect(), k = lienzo.current!.width / r.width; return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, k }; };
  const estilo = (c: CanvasRenderingContext2D, k: number) => { c.strokeStyle = c.fillStyle = borrador ? "#fff" : color; c.lineWidth = (borrador ? grueso * 1.6 : grueso) * k; c.lineCap = c.lineJoin = "round"; };
  const abajo = (e: React.PointerEvent) => {
    if (dedo.current) return;
    e.preventDefault(); lienzo.current!.setPointerCapture(e.pointerId);
    const p = punto(e), c = lienzo.current!.getContext("2d")!;
    estilo(c, p.k); c.beginPath(); c.arc(p.x, p.y, c.lineWidth / 2, 0, Math.PI * 2); c.fill();
    dedo.current = { id: e.pointerId, x: p.x, y: p.y };
  };
  const mover = (e: React.PointerEvent) => {
    const d = dedo.current; if (!d || d.id !== e.pointerId) return;
    const p = punto(e), c = lienzo.current!.getContext("2d")!;
    estilo(c, p.k); c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(p.x, p.y); c.stroke();
    dedo.current = { id: d.id, x: p.x, y: p.y };
  };
  const soltar = (e: React.PointerEvent) => { if (dedo.current?.id === e.pointerId) dedo.current = null; };
  const limpiar = () => { const cv = lienzo.current!, c = cv.getContext("2d")!; c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height); sonar("barrer"); };

  return (
    <>
      <div className="pq-lienzo" ref={caja}>
        <canvas ref={lienzo} onPointerDown={abajo} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} />
      </div>
      <Paleta color={borrador ? "" : color} onColor={(c) => { setColor(c); setBorrador(false); }} sonar={sonar} />
      <div className="pq-herr">
        {GRUESOS.map((g) => (
          <button key={g} className={`pq-grueso ${grueso === g && !borrador ? "sel" : ""}`} aria-label="Pincel" onPointerDown={(e) => { e.preventDefault(); setGrueso(g); setBorrador(false); sonar("toque"); }}>
            <i style={{ width: g * 0.8 + 6, height: g * 0.8 + 6, background: color }} />
          </button>
        ))}
        <button className={`pq-grueso ${borrador ? "sel" : ""}`} aria-label="Goma de borrar" onPointerDown={(e) => { e.preventDefault(); setBorrador(true); sonar("toque"); }}>
          <svg viewBox="0 0 48 48" width="34" height="34" aria-hidden><rect x="6" y="16" width="36" height="20" rx="5" fill="#F8A1B8" stroke="#10213F" strokeWidth="3" /><rect x="6" y="16" width="14" height="20" rx="5" fill="#fff" stroke="#10213F" strokeWidth="3" /></svg>
        </button>
        <button className="pq-grueso" aria-label="Borrar todo" onPointerDown={(e) => { e.preventDefault(); limpiar(); }}>🗑️</button>
      </div>
    </>
  );
}

function Colorear({ sonar }: { sonar: Sonar }) {
  const [color, setColor] = useState(COLORES[0].c);
  const [n, setN] = useState(0);
  const [rellenos, setRellenos] = useState<Record<number, string>>({});
  const cambiar = useCallback((d: number) => { setN((x) => (x + d + LAMINAS.length) % LAMINAS.length); setRellenos({}); sonar("toque"); }, [sonar]);
  return (
    <>
      <div className="pq-colorear">
        <button className="pq-flecha" aria-label="Anterior" onPointerDown={(e) => { e.preventDefault(); cambiar(-1); }}>◀</button>
        <LaminaSVG lamina={LAMINAS[n]} rellenos={rellenos} onToque={(i) => { setRellenos((r) => ({ ...r, [i]: color })); sonar("pop"); }} />
        <button className="pq-flecha" aria-label="Siguiente" onPointerDown={(e) => { e.preventDefault(); cambiar(1); }}>▶</button>
      </div>
      <Paleta color={color} onColor={setColor} sonar={sonar} />
      <div className="pq-herr">
        <button className="pq-grueso" aria-label="Borrar colores" onPointerDown={(e) => { e.preventDefault(); setRellenos({}); sonar("barrer"); }}>🗑️</button>
      </div>
    </>
  );
}

export default function Pintar({ modo, sonar }: { modo: "libre" | "colorear"; sonar: Sonar }) {
  return <div className="pq-pintar">{modo === "libre" ? <Libre sonar={sonar} /> : <Colorear sonar={sonar} />}</div>;
}
