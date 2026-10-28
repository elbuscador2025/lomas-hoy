"use client";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { BotonRepetir, BotonSonido, guardarRecord, leerRecord, useCelda, useSonido } from "./comun";

// LA VIBORITA: juego propio. Cuadrícula de 16 x 16; termina al chocar con los bordes o con su propio cuerpo.
export const N = 16;
type Punto = [number, number]; // [x, y]
type Dir = "izq" | "der" | "arr" | "aba";
const VEC: Record<Dir, Punto> = { izq: [-1, 0], der: [1, 0], arr: [0, -1], aba: [0, 1] };
const OPUESTA: Record<Dir, Dir> = { izq: "der", der: "izq", arr: "aba", aba: "arr" };
type Fase = "listo" | "jugando" | "pausa" | "fin";
type Estado = { cuerpo: Punto[]; dir: Dir; cola: Dir[]; comida: Punto; puntos: number; record: number; nuevoRecord: boolean; fase: Fase };

export function comidaNueva(cuerpo: Punto[]): Punto {
  const libres: Punto[] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!cuerpo.some(([a, b]) => a === x && b === y)) libres.push([x, y]);
  return libres[Math.floor(Math.random() * libres.length)] ?? [0, 0];
}
export function nuevoEstado(): Estado {
  const cuerpo: Punto[] = [[7, 8], [6, 8], [5, 8]];
  return { cuerpo, dir: "der", cola: [], comida: comidaNueva(cuerpo), puntos: 0, record: leerRecord("viborita"), nuevoRecord: false, fase: "listo" };
}
const intervalo = (puntos: number) => Math.max(75, 170 - Math.floor(puntos / 40) * 8);

// Un paso de la víbora. Devuelve "comio" | "fin" | null
export function paso(e: Estado): "comio" | "fin" | null {
  const siguiente = e.cola.shift();
  if (siguiente && siguiente !== OPUESTA[e.dir]) e.dir = siguiente;
  const [vx, vy] = VEC[e.dir];
  const cabeza: Punto = [e.cuerpo[0][0] + vx, e.cuerpo[0][1] + vy];
  const come = cabeza[0] === e.comida[0] && cabeza[1] === e.comida[1];
  const cuerpoSinCola = come ? e.cuerpo : e.cuerpo.slice(0, -1); // la punta de la cola se mueve: no cuenta como choque
  if (cabeza[0] < 0 || cabeza[0] >= N || cabeza[1] < 0 || cabeza[1] >= N || cuerpoSinCola.some(([x, y]) => x === cabeza[0] && y === cabeza[1])) {
    e.fase = "fin";
    if (e.puntos > e.record) { e.record = e.puntos; e.nuevoRecord = true; guardarRecord("viborita", e.puntos); }
    return "fin";
  }
  e.cuerpo = [cabeza, ...cuerpoSinCola];
  if (come) { e.puntos += 10; e.comida = comidaNueva(e.cuerpo); return "comio"; }
  return null;
}

function redondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }

export default function Viborita() {
  const { activo, sonar, alternar } = useSonido();
  const e = useRef<Estado>(nuevoEstado());
  const [, forzar] = useReducer((x: number) => x + 1, 0);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const zona = useRef<HTMLDivElement>(null);
  const celda = useCelda(zona, N, N, 34);
  const s = e.current;

  const girar = useCallback((d: Dir) => {
    const est = e.current;
    if (est.fase === "fin" || est.fase === "pausa") return;
    const ultima = est.cola[est.cola.length - 1] ?? est.dir;
    if (d === ultima || d === OPUESTA[ultima] || est.cola.length >= 2) return;
    est.cola.push(d);
    if (est.fase === "listo") est.fase = "jugando"; // empieza al primer movimiento
    forzar();
  }, []);
  const avanzar = useCallback(() => {
    const est = e.current;
    if (est.fase !== "jugando") return;
    const r = paso(est);
    if (r === "comio") sonar("comer");
    if (r === "fin") sonar(est.nuevoRecord ? "record" : "fin");
    forzar();
  }, [sonar]);
  const pausar = () => { const x = e.current; if (x.fase === "jugando") x.fase = "pausa"; else if (x.fase === "pausa") x.fase = "jugando"; forzar(); };
  const reiniciar = () => { e.current = nuevoEstado(); forzar(); };

  useEffect(() => {
    if (s.fase !== "jugando") return;
    const id = setInterval(avanzar, intervalo(s.puntos));
    return () => clearInterval(id);
  }, [s.fase, s.puntos, avanzar]);
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      const m: Record<string, () => void> = { ArrowLeft: () => girar("izq"), ArrowRight: () => girar("der"), ArrowUp: () => girar("arr"), ArrowDown: () => girar("aba"), a: () => girar("izq"), d: () => girar("der"), w: () => girar("arr"), s: () => girar("aba"), p: pausar, P: pausar };
      if (m[ev.key]) { ev.preventDefault(); m[ev.key](); }
    };
    const oculto = () => { if (document.hidden && e.current.fase === "jugando") { e.current.fase = "pausa"; forzar(); } };
    window.addEventListener("keydown", tecla);
    document.addEventListener("visibilitychange", oculto);
    return () => { window.removeEventListener("keydown", tecla); document.removeEventListener("visibilitychange", oculto); };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // deslizar el dedo sobre la cancha
  const alTocar = (ev: React.PointerEvent) => { toque.current = { x: ev.clientX, y: ev.clientY }; };
  const alDeslizar = (ev: React.PointerEvent) => {
    const t = toque.current; if (!t) return;
    const dx = ev.clientX - t.x, dy = ev.clientY - t.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    girar(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "der" : "izq") : (dy > 0 ? "aba" : "arr"));
    toque.current = { x: ev.clientX, y: ev.clientY };
  };

  // dibujo
  useEffect(() => {
    const c = lienzo.current; if (!c) return;
    const W = N * celda, r = window.devicePixelRatio || 1;
    c.width = Math.round(W * r); c.height = Math.round(W * r);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(r, 0, 0, r, 0, 0);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { ctx.fillStyle = (x + y) % 2 ? "#14301F" : "#173826"; ctx.fillRect(x * celda, y * celda, celda, celda); }
    // la fruta
    const [fx, fy] = s.comida, cx = fx * celda + celda / 2, cy = fy * celda + celda / 2;
    ctx.fillStyle = "#FF5A36"; ctx.beginPath(); ctx.arc(cx, cy + 1, celda * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.beginPath(); ctx.arc(cx - celda * 0.12, cy - celda * 0.1, celda * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#7BD65B"; ctx.lineWidth = Math.max(2, celda * 0.1); ctx.beginPath(); ctx.moveTo(cx, cy - celda * 0.3); ctx.quadraticCurveTo(cx + celda * 0.1, cy - celda * 0.5, cx + celda * 0.3, cy - celda * 0.45); ctx.stroke();
    // el cuerpo, de la cola a la cabeza
    for (let i = s.cuerpo.length - 1; i >= 0; i--) {
      const [x, y] = s.cuerpo[i];
      ctx.fillStyle = i === 0 ? "#C8F25A" : i % 2 ? "#2FBF71" : "#43D68A";
      ctx.beginPath(); redondo(ctx, x * celda + 1, y * celda + 1, celda - 2, celda - 2, celda * (i === 0 ? 0.42 : 0.3)); ctx.fill();
    }
    // la cara de la cabeza (mira para donde va)
    const [hx, hy] = s.cuerpo[0], [vx, vy] = VEC[s.dir];
    const ojo = (dx: number, dy: number) => { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(hx * celda + celda / 2 + dx, hy * celda + celda / 2 + dy, celda * 0.13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#0A1F12"; ctx.beginPath(); ctx.arc(hx * celda + celda / 2 + dx + vx * celda * 0.04, hy * celda + celda / 2 + dy + vy * celda * 0.04, celda * 0.06, 0, Math.PI * 2); ctx.fill(); };
    const lado = celda * 0.2, frente = celda * 0.1;
    if (vx !== 0) { ojo(vx * frente, -lado); ojo(vx * frente, lado); } else { ojo(-lado, vy * frente); ojo(lado, vy * frente); }
  });

  const flecha = (d: Dir, texto: string, etiqueta: string, clase: string) => <BotonRepetir onAccion={() => girar(d)} repetir={false} className={clase} etiqueta={etiqueta}>{texto}</BotonRepetir>;

  return (
    <div className="jg">
      <div className="jg-estado">
        <span><small>Puntos</small><b>{s.puntos}</b></span>
        <span><small>Récord</small><b>{Math.max(s.record, s.puntos)}</b></span>
        <span><small>Largo</small><b>{s.cuerpo.length}</b></span>
      </div>
      <div className="jg-zona" ref={zona}>
      <div className="jg-cancha" style={{ width: N * celda, height: N * celda }} onPointerDown={alTocar} onPointerMove={alDeslizar} onPointerUp={() => (toque.current = null)} onPointerCancel={() => (toque.current = null)}>
        <canvas ref={lienzo} style={{ width: N * celda, height: N * celda }} />
        {s.fase !== "jugando" && (
          <div className="jg-capa">
            {s.fase === "listo" ? <><b>¡Lista!</b><span>Deslizá el dedo o tocá una flecha para empezar</span></>
              : s.fase === "pausa" ? <><b>Pausa</b><button className="jg-grande" onClick={pausar}>Seguir</button></>
              : <>
                <b>Fin del juego</b>
                <span>{s.puntos} puntos</span>
                {s.nuevoRecord && <em>¡Nuevo récord!</em>}
                <button className="jg-grande" onClick={reiniciar}>Jugar de nuevo</button>
              </>}
          </div>
        )}
      </div>
      </div>
      <div className="jg-flechas">
        {flecha("izq", "◀", "Izquierda", "jg-izq")}
        {flecha("arr", "▲", "Arriba", "jg-arriba")}
        {flecha("aba", "▼", "Abajo", "jg-abajo")}
        {flecha("der", "▶", "Derecha", "jg-der")}
      </div>
      <div className="jg-acciones">
        <button className="jg-mini" onClick={pausar}>{s.fase === "pausa" ? "▶ Seguir" : "⏸ Pausa"}</button>
        <button className="jg-mini" onClick={reiniciar}>↻ Jugar de nuevo</button>
        <BotonSonido activo={activo} onClick={alternar} />
      </div>
      <p className="jg-ayuda">Teclado: flechas (o WASD) para girar, P para pausa.</p>
    </div>
  );
}
