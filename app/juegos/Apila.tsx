"use client";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { BotonRepetir, BotonSonido, guardarRecord, leerRecord, useCelda, useSonido } from "./comun";

// APILÁ: juego propio de piezas que caen. Cancha de 9 x 16 y siete piezas de diseño propio (de 3 y de 5 cuadraditos).
export const COLS = 9, FILAS = 16;
type Celda = [number, number]; // [fila, columna]
type Forma = { celdas: Celda[]; color: string };
export const PIEZAS: Forma[] = [
  { celdas: [[0, 0], [0, 1], [0, 2]], color: "#2EC4B6" }, // barra de 3
  { celdas: [[0, 0], [1, 0], [1, 1]], color: "#FF9F1C" }, // esquina de 3
  { celdas: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], color: "#E71D36" }, // cruz de 5
  { celdas: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]], color: "#9B5DE5" }, // U de 5
  { celdas: [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]], color: "#3A86FF" }, // T larga de 5
  { celdas: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]], color: "#8AC926" }, // P de 5
  { celdas: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]], color: "#FF5DA2" }, // Z de 5
];
const normalizar = (cs: Celda[]): Celda[] => { const f = Math.min(...cs.map((c) => c[0])), k = Math.min(...cs.map((c) => c[1])); return cs.map(([a, b]) => [a - f, b - k]); };
const girarCeldas = (cs: Celda[]): Celda[] => normalizar(cs.map(([f, c]) => [c, -f]));
const ancho = (cs: Celda[]) => Math.max(...cs.map((c) => c[1])) + 1;
const azar = (): Forma => { const p = PIEZAS[Math.floor(Math.random() * PIEZAS.length)]; let cs = p.celdas; for (let i = Math.floor(Math.random() * 4); i > 0; i--) cs = girarCeldas(cs); return { celdas: cs, color: p.color }; };

type Pieza = Forma & { f: number; c: number };
type Fase = "jugando" | "pausa" | "fin";
type Estado = { tablero: (string | null)[][]; pieza: Pieza; siguiente: Forma; puntos: number; lineas: number; nivel: number; fase: Fase; record: number; nuevoRecord: boolean };
const aPieza = (f: Forma): Pieza => ({ ...f, f: 0, c: Math.floor((COLS - ancho(f.celdas)) / 2) });

export function nuevoEstado(): Estado {
  return { tablero: Array.from({ length: FILAS }, () => Array<string | null>(COLS).fill(null)), pieza: aPieza(azar()), siguiente: azar(), puntos: 0, lineas: 0, nivel: 1, fase: "jugando", record: leerRecord("apila"), nuevoRecord: false };
}
const choca = (e: Estado, cs: Celda[], f: number, c: number) => cs.some(([a, b]) => { const y = f + a, x = c + b; return x < 0 || x >= COLS || y >= FILAS || (y >= 0 && e.tablero[y][x] !== null); });
export function mover(e: Estado, df: number, dc: number) { if (choca(e, e.pieza.celdas, e.pieza.f + df, e.pieza.c + dc)) return false; e.pieza.f += df; e.pieza.c += dc; return true; }
export function girar(e: Estado) {
  const nuevas = girarCeldas(e.pieza.celdas);
  for (const dc of [0, -1, 1, -2, 2]) if (!choca(e, nuevas, e.pieza.f, e.pieza.c + dc)) { e.pieza.celdas = nuevas; e.pieza.c += dc; return true; }
  return false;
}
// Fija la pieza, borra las líneas completas y trae la que sigue. Devuelve cuántas líneas se borraron.
export function fijar(e: Estado) {
  for (const [a, b] of e.pieza.celdas) { const y = e.pieza.f + a; if (y >= 0) e.tablero[y][e.pieza.c + b] = e.pieza.color; }
  const quedan = e.tablero.filter((fila) => fila.some((x) => x === null));
  const borradas = FILAS - quedan.length;
  if (borradas) {
    e.tablero = [...Array.from({ length: borradas }, () => Array<string | null>(COLS).fill(null)), ...quedan];
    e.lineas += borradas;
    e.puntos += [0, 100, 300, 500, 800][Math.min(borradas, 4)] * e.nivel;
    e.nivel = 1 + Math.floor(e.lineas / 6);
  }
  e.pieza = aPieza(e.siguiente);
  e.siguiente = azar();
  if (choca(e, e.pieza.celdas, e.pieza.f, e.pieza.c)) { e.fase = "fin"; if (e.puntos > e.record) { e.record = e.puntos; e.nuevoRecord = true; guardarRecord("apila", e.puntos); } }
  return borradas;
}
const intervalo = (nivel: number) => Math.max(110, 720 - (nivel - 1) * 65);
const filaDeCaida = (e: Estado) => { let f = e.pieza.f; while (!choca(e, e.pieza.celdas, f + 1, e.pieza.c)) f++; return f; };

const redondo = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
function cuadro(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, color: string, alfa = 1) {
  ctx.globalAlpha = alfa;
  ctx.fillStyle = color;
  ctx.beginPath(); redondo(ctx, x + 1, y + 1, t - 2, t - 2, Math.max(3, t * 0.2)); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.28)";
  ctx.beginPath(); redondo(ctx, x + 3, y + 3, t - 6, Math.max(3, t * 0.28), 3); ctx.fill();
  ctx.globalAlpha = 1;
}
function preparar(c: HTMLCanvasElement, w: number, h: number) {
  const r = window.devicePixelRatio || 1;
  c.width = Math.round(w * r); c.height = Math.round(h * r); c.style.width = w + "px"; c.style.height = h + "px";
  const ctx = c.getContext("2d")!;
  ctx.setTransform(r, 0, 0, r, 0, 0);
  return ctx;
}

export default function Apila() {
  const { activo, sonar, alternar } = useSonido();
  const e = useRef<Estado>(nuevoEstado());
  const [, forzar] = useReducer((x: number) => x + 1, 0);
  const tablero = useRef<HTMLCanvasElement>(null), sig = useRef<HTMLCanvasElement>(null);
  const zona = useRef<HTMLDivElement>(null);
  const celda = useCelda(zona, COLS, FILAS);
  const gesto = useRef<{ x: number; y: number; px: number; movido: boolean; hecho: boolean } | null>(null);
  const s = e.current;

  const actuar = useCallback((fn: (s: Estado) => void) => {
    const est = e.current;
    if (est.fase !== "jugando") return;
    const antes = est.fase, lineasAntes = est.lineas;
    fn(est);
    if (est.lineas > lineasAntes) sonar("linea");
    if (antes === "jugando" && (est.fase as Fase) === "fin") sonar(est.nuevoRecord ? "record" : "fin");
    forzar();
  }, [sonar]);
  const izquierda = () => actuar((x) => { if (mover(x, 0, -1)) sonar("mover"); });
  const derecha = () => actuar((x) => { if (mover(x, 0, 1)) sonar("mover"); });
  const bajar = () => actuar((x) => { if (mover(x, 1, 0)) x.puntos += 1; else { sonar("caer"); fijar(x); } });
  const rotar = () => actuar((x) => { if (girar(x)) sonar("girar"); });
  const caer = () => actuar((x) => { const f = filaDeCaida(x); x.puntos += (f - x.pieza.f) * 2; x.pieza.f = f; sonar("caer"); fijar(x); });
  const pausar = () => { const x = e.current; if (x.fase === "jugando") x.fase = "pausa"; else if (x.fase === "pausa") x.fase = "jugando"; forzar(); };
  const reiniciar = () => { e.current = nuevoEstado(); forzar(); };

  // la pieza baja sola, cada vez más rápido
  useEffect(() => {
    if (s.fase !== "jugando") return;
    const id = setInterval(bajar, intervalo(s.nivel));
    return () => clearInterval(id);
  }, [s.fase, s.nivel]); // eslint-disable-line react-hooks/exhaustive-deps
  // teclado (computadora) y pausa automática si se sale de la pantalla
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      const m: Record<string, () => void> = { ArrowLeft: izquierda, ArrowRight: derecha, ArrowDown: bajar, ArrowUp: rotar, " ": caer, p: pausar, P: pausar, a: izquierda, d: derecha, s: bajar, w: rotar };
      if (m[ev.key]) { ev.preventDefault(); m[ev.key](); }
    };
    const oculto = () => { if (document.hidden && e.current.fase === "jugando") { e.current.fase = "pausa"; forzar(); } };
    window.addEventListener("keydown", tecla);
    document.addEventListener("visibilitychange", oculto);
    return () => { window.removeEventListener("keydown", tecla); document.removeEventListener("visibilitychange", oculto); };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // dibujo
  useEffect(() => {
    const c = tablero.current; if (!c) return;
    const W = COLS * celda, H = FILAS * celda;
    const ctx = preparar(c, W, H);
    ctx.fillStyle = "#10213F"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i++) { ctx.beginPath(); ctx.moveTo(i * celda, 0); ctx.lineTo(i * celda, H); ctx.stroke(); }
    for (let i = 1; i < FILAS; i++) { ctx.beginPath(); ctx.moveTo(0, i * celda); ctx.lineTo(W, i * celda); ctx.stroke(); }
    s.tablero.forEach((fila, y) => fila.forEach((col, x) => { if (col) cuadro(ctx, x * celda, y * celda, celda, col); }));
    if (s.fase !== "fin") {
      const fs = filaDeCaida(s);
      s.pieza.celdas.forEach(([a, b]) => cuadro(ctx, (s.pieza.c + b) * celda, (fs + a) * celda, celda, s.pieza.color, 0.22)); // sombra de dónde va a caer
      s.pieza.celdas.forEach(([a, b]) => { if (s.pieza.f + a >= 0) cuadro(ctx, (s.pieza.c + b) * celda, (s.pieza.f + a) * celda, celda, s.pieza.color); });
    }
    const p = sig.current;
    if (p) {
      const t = 9, pc = preparar(p, 5 * t + 4, 3 * t + 4);
      const cs = s.siguiente.celdas;
      const ox = Math.floor((5 - ancho(cs)) * t / 2) + 2, oy = Math.floor((3 - (Math.max(...cs.map((q) => q[0])) + 1)) * t / 2) + 2;
      cs.forEach(([a, b]) => cuadro(pc, ox + b * t, oy + a * t, t, s.siguiente.color));
    }
  });

  // gestos sobre el tablero: deslizar a los costados mueve, tocar gira, deslizar hacia abajo hace caer
  const alTocar = (ev: React.PointerEvent) => { gesto.current = { x: ev.clientX, y: ev.clientY, px: ev.clientX, movido: false, hecho: false }; };
  const alDeslizar = (ev: React.PointerEvent) => {
    const g = gesto.current; if (!g || g.hecho) return;
    const paso = Math.max(18, celda * 0.9);
    while (ev.clientX - g.px >= paso) { derecha(); g.px += paso; g.movido = true; }
    while (g.px - ev.clientX >= paso) { izquierda(); g.px -= paso; g.movido = true; }
    const dy = ev.clientY - g.y;
    if (!g.movido && dy > 45 && dy > Math.abs(ev.clientX - g.x)) { caer(); g.hecho = true; }
  };
  const alSoltar = () => { const g = gesto.current; gesto.current = null; if (g && !g.movido && !g.hecho) rotar(); };

  return (
    <div className="jg">
      <div className="jg-estado">
        <span><small>Puntos</small><b>{s.puntos}</b></span>
        <span><small>Récord</small><b>{Math.max(s.record, s.puntos)}</b></span>
        <span><small>Nivel</small><b>{s.nivel}</b></span>
        <span><small>Líneas</small><b>{s.lineas}</b></span>
        <span className="jg-sig"><small>Sigue</small><canvas ref={sig} /></span>
      </div>
      <div className="jg-zona" ref={zona}>
        <div className="jg-cancha" style={{ width: COLS * celda, height: FILAS * celda }} onPointerDown={alTocar} onPointerMove={alDeslizar} onPointerUp={alSoltar} onPointerCancel={() => (gesto.current = null)}>
          <canvas ref={tablero} style={{ width: COLS * celda, height: FILAS * celda }} />
          {s.fase !== "jugando" && (
            <div className="jg-capa" onPointerDown={(ev) => ev.stopPropagation()} onPointerUp={(ev) => ev.stopPropagation()}>
              {s.fase === "pausa" ? <><b>Pausa</b><button className="jg-grande" onClick={pausar}>Seguir</button></> : <>
                <b>Fin del juego</b>
                <span>{s.puntos} puntos</span>
                {s.nuevoRecord && <em>¡Nuevo récord!</em>}
                <button className="jg-grande" onClick={reiniciar}>Jugar de nuevo</button>
              </>}
            </div>
          )}
        </div>
      </div>
      <div className="jg-controles">
        <BotonRepetir onAccion={izquierda} etiqueta="Izquierda">◀</BotonRepetir>
        <BotonRepetir onAccion={rotar} repetir={false} etiqueta="Girar">⟳</BotonRepetir>
        <BotonRepetir onAccion={derecha} etiqueta="Derecha">▶</BotonRepetir>
        <BotonRepetir onAccion={bajar} etiqueta="Bajar">▼</BotonRepetir>
      </div>
      <div className="jg-acciones">
        <button className="jg-mini" onClick={pausar}>{s.fase === "pausa" ? "▶ Seguir" : "⏸ Pausa"}</button>
        <button className="jg-mini" onClick={reiniciar}>↻ Reiniciar</button>
        <button className="jg-mini" onClick={caer} aria-label="Dejar caer la pieza">⤓ Caer</button>
        <BotonSonido activo={activo} onClick={alternar} />
      </div>
      <p className="jg-ayuda">Teclado: flechas para mover y girar, espacio para dejar caer, P para pausa.</p>
    </div>
  );
}
