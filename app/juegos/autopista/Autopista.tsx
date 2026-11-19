"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { guardarRecord, leerRecord, tono, useSonido } from "../comun";
import type { ControlAutopista, Entrada, EstadoAutopista } from "./motor";
import { Estereo, PanelCanciones, useAudioAutopista } from "./Estereo";
import { encajar, IMG_W, IMG_H } from "./cabina";

// CARRERA DE AUTOPISTA: se maneja en primera persona, desde la cabina del camión (una foto con la ruta animada encima). Ocupa toda la pantalla del celular, solo vertical.
// Nada del motor ni la foto se descarga hasta tocar "Jugar".
const CLAVE = "autopista";
const GIRO_MAX = 1.75; // el volante gira hasta unos 100° para cada lado

// Volante: la zona del volante de la foto. Se gira arrastrando el dedo alrededor del centro (el volante de la foto queda quieto: unas marcas en el aro (la de arriba es amarilla) muestran cuánto se giró);
// al soltarlo vuelve solo al medio. No molesta a los pedales (cada dedo va por su lado).
type Zona = (x: number, y: number, w: number, h: number) => React.CSSProperties;
function Volante({ entrada, zona }: { entrada: Entrada; zona: Zona }) {
  const caja = useRef<HTMLDivElement>(null), marca = useRef<HTMLDivElement>(null);
  const est = useRef({ id: -1, a: 0, ang: 0, raf: 0 });
  const aplicar = () => { const e = est.current; if (marca.current) marca.current.style.transform = `rotate(${e.ang}rad)`; entrada.volante = Math.max(-1, Math.min(1, e.ang / GIRO_MAX)); };
  const angulo = (ev: React.PointerEvent) => { const r = caja.current!.getBoundingClientRect(); return Math.atan2(ev.clientY - (r.top + r.height / 2), ev.clientX - (r.left + r.width / 2)); };
  const volver = useCallback(() => {
    const e = est.current; cancelAnimationFrame(e.raf);
    const paso = () => { e.ang *= 0.82; if (Math.abs(e.ang) < 0.01) e.ang = 0; aplicar(); if (e.ang !== 0 && e.id < 0) e.raf = requestAnimationFrame(paso); };
    e.raf = requestAnimationFrame(paso);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => cancelAnimationFrame(est.current.raf), []);
  return (
    <div
      ref={caja} className="ap-volante" style={zona(-74, 782, 800, 800)} role="slider" aria-label="Volante: arrastrá el dedo en círculo para girar" aria-valuemin={-100} aria-valuemax={100}
      onPointerDown={(ev) => { ev.preventDefault(); const e = est.current; cancelAnimationFrame(e.raf); try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch {} e.id = ev.pointerId; e.a = angulo(ev); }}
      onPointerMove={(ev) => {
        const e = est.current; if (e.id !== ev.pointerId) return;
        const a = angulo(ev); let d = a - e.a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        e.a = a; e.ang = Math.max(-GIRO_MAX, Math.min(GIRO_MAX, e.ang + d)); aplicar();
      }}
      onPointerUp={(ev) => { if (est.current.id === ev.pointerId) { est.current.id = -1; volver(); } }}
      onPointerCancel={(ev) => { if (est.current.id === ev.pointerId) { est.current.id = -1; volver(); } }}
      onContextMenu={(ev) => ev.preventDefault()}
    >
      <div ref={marca} className="ap-marca"><b><i /></b><b style={{ transform: "rotate(90deg)" }}><i /></b><b style={{ transform: "rotate(180deg)" }}><i /></b><b style={{ transform: "rotate(270deg)" }}><i /></b></div>
    </div>
  );
}

function Pedal({ clase, etiqueta, texto, alCambiar }: { clase: string; etiqueta: string; texto: string; alCambiar: (a: boolean) => void }) {
  const [on, setOn] = useState(false);
  const poner = (v: boolean) => { setOn(v); alCambiar(v); };
  return (
    <button
      className={`ap-pedal ${clase}${on ? " on" : ""}`} aria-label={etiqueta}
      onPointerDown={(ev) => { ev.preventDefault(); try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch {} poner(true); }}
      onPointerUp={() => poner(false)} onPointerCancel={() => poner(false)} onLostPointerCapture={() => poner(false)} onContextMenu={(ev) => ev.preventDefault()}
    >{texto}</button>
  );
}

export default function Autopista({ onSalir }: { onSalir?: () => void }) {
  const cab = useRef<HTMLDivElement>(null), zona = useRef<HTMLDivElement>(null), montado = useRef(true), control = useRef<ControlAutopista | null>(null), recordRef = useRef(0);
  const entrada = useRef<Entrada>({ volante: 0, acel: false, freno: false });
  const [pantalla, setPantalla] = useState<"inicio" | "cargando" | "error" | "juego">("inicio");
  const [est, setEst] = useState<EstadoAutopista | null>(null);
  const [record, setRecord] = useState(0);
  const [nuevoRecord, setNuevoRecord] = useState(false);
  const { activo, alternar } = useSonido();
  const { audio, est: estEs } = useAudioAutopista();
  const [panel, setPanel] = useState(false);
  const [g, setG] = useState(() => encajar(IMG_W * 0.4, IMG_H * 0.4)); // cómo se acomoda la foto en esta pantalla
  useEffect(() => {
    const el = cab.current; if (!el) return;
    const medir = () => setG(encajar(el.clientWidth || 1, el.clientHeight || 1));
    medir();
    const ro = new ResizeObserver(medir); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { audio.current?.motorActivo(activo); }, [activo, audio]); // el botón 🔊 apaga solo los sonidos del juego; la música tiene sus propios controles

  useEffect(() => { const r = leerRecord(CLAVE); recordRef.current = r; setRecord(r); }, []);
  // mientras se juega, la página de atrás no se mueve ni hace scroll
  useEffect(() => {
    document.body.classList.add("cosmo-activo"); montado.current = true;
    return () => { montado.current = false; document.body.classList.remove("cosmo-activo"); control.current?.destruir(); control.current = null; };
  }, []);
  // si se sale de la app o se apaga la pantalla, el juego queda en pausa
  useEffect(() => {
    const alOcultar = () => { if (document.hidden) control.current?.pausar(); };
    document.addEventListener("visibilitychange", alOcultar);
    return () => document.removeEventListener("visibilitychange", alOcultar);
  }, []);
  // en la compu: flechas o A D para girar, ↑ acelerar, ↓ frenar
  useEffect(() => {
    const t = (e: KeyboardEvent, v: boolean) => {
      const en = entrada.current;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { en.volante = v ? -1 : (en.volante < 0 ? 0 : en.volante); e.preventDefault(); }
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { en.volante = v ? 1 : (en.volante > 0 ? 0 : en.volante); e.preventDefault(); }
      else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { en.acel = v; e.preventDefault(); }
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S" || e.key === " ") { en.freno = v; e.preventDefault(); }
    };
    const d = (e: KeyboardEvent) => t(e, true), u = (e: KeyboardEvent) => t(e, false);
    window.addEventListener("keydown", d); window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, []);

  const alCambiar = useCallback((e: EstadoAutopista) => {
    setEst((antes) => {
      if (e.fase === "fin" && antes?.fase !== "fin") {
        if (e.puntos > recordRef.current) { recordRef.current = e.puntos; guardarRecord(CLAVE, e.puntos); setRecord(e.puntos); setNuevoRecord(true); }
        else setNuevoRecord(false);
      }
      if (e.fase === "jugando" && e.segundos === 0) setNuevoRecord(false);
      return e;
    });
  }, []);

  async function jugar() {
    tono(1, 0.01, "sine", 0.0001); // destraba el audio con este toque
    audio.current?.iniciar(); audio.current?.arrancarMusica(); // la música arranca con el toque en «Jugar» (regla de los navegadores)
    setPantalla("cargando");
    try {
      const juego = await import("./motor");
      if (!zona.current) return;
      const ctl = await juego.crearJuego(zona.current, entrada.current, alCambiar, audio.current ?? undefined);
      if (!montado.current) { ctl.destruir(); return; }
      control.current = ctl;
      setPantalla("juego");
    } catch { setPantalla("error"); }
  }

  const fase = est?.fase, vidas = Math.max(0, est?.vidas ?? 3);
  const zona_: Zona = (x, y, w, h) => ({ left: g.ox + x * g.k, top: g.oy + y * g.k, width: w * g.k, height: h * g.k });
  return (
    <div className="cosmo-pantalla ap-pantalla">
      <div ref={cab} className="ap-cabina">
        <div ref={zona} className="ap-lienzo" />
        <div className="cosmo-hud ap-hud">
          <button className="cosmo-salir" onClick={onSalir} aria-label="Salir del juego">‹ Salir</button>
          <span>Puntos<b>{est?.puntos ?? 0}</b></span>
          <span>Récord<b>{Math.max(record, est?.puntos ?? 0)}</b></span>
          <span className="cosmo-vidas" aria-label={`${vidas} vidas`}>{"♥".repeat(vidas) || "–"}</span>
          <span><b>{est?.kmh ?? 0}</b> km/h</span>
        </div>
        <div className="cosmo-botones ap-botones">
          {pantalla === "juego" && fase !== "fin" && (
            <button onClick={() => (fase === "pausa" ? control.current?.reanudar() : control.current?.pausar())} aria-label={fase === "pausa" ? "Seguir" : "Pausa"}>{fase === "pausa" ? "▶" : "⏸"}</button>
          )}
          {pantalla === "juego" && <button onClick={() => control.current?.reiniciar()} aria-label="Reiniciar">↻</button>}
          <button onClick={alternar} aria-pressed={!activo} aria-label={activo ? "Silenciar sonidos" : "Activar sonidos"}>{activo ? "🔊" : "🔇"}</button>
        </div>
        <Volante entrada={entrada.current} zona={zona_} />
        <Estereo
          audio={audio.current} est={estEs} onAbrir={() => { control.current?.pausar(); setPanel(true); }}
          zona={zona_(803, 906, 74, 68)}
          tarjeta={{ top: Math.max(8, g.oy + 862 * g.k), right: 8 }}
        />
        <div className="ap-pedales">
          <Pedal clase="freno" etiqueta="Freno" texto="FRENAR" alCambiar={(a) => { entrada.current.freno = a; }} />
          <Pedal clase="acel" etiqueta="Acelerador" texto="ACELERAR" alCambiar={(a) => { entrada.current.acel = a; }} />
        </div>
        {pantalla !== "juego" && (
          <div className="jg-capa">
            {pantalla === "inicio" && <>
              <b>Carrera de Autopista</b>
              <span>Manejá el camión desde la cabina y esquivá el tráfico</span>
              <span className="cosmo-ayuda">Girá el volante con el dedo (en círculo).<br />Con el otro dedo: acelerar y frenar, abajo.<br />Tocá «Música» en la pantalla del tablero.<br />En la compu: ← → ↑ ↓.</span>
              {record > 0 && <em>Tu récord: {record}</em>}
              <button className="jg-grande" onClick={jugar}>Jugar</button>
            </>}
            {pantalla === "cargando" && <><b>Cargando…</b><span>Preparando el camión</span></>}
            {pantalla === "error" && <><b>No se pudo cargar</b><span>Revisá tu conexión y probá de nuevo</span><button className="jg-grande" onClick={jugar}>Reintentar</button></>}
          </div>
        )}
        {pantalla === "juego" && fase === "pausa" && (
          <div className="jg-capa"><b>Pausa</b><button className="jg-grande" onClick={() => control.current?.reanudar()}>Seguir</button></div>
        )}
        {pantalla === "juego" && fase === "fin" && (
          <div className="jg-capa">
            <b>Fin de la carrera</b>
            <span>{est?.puntos} puntos · {est?.metros} m en {est?.segundos} s</span>
            {nuevoRecord && <em>¡Nuevo récord!</em>}
            <button className="jg-grande" onClick={() => control.current?.reiniciar()}>Jugar de nuevo</button>
          </div>
        )}
        {panel && <PanelCanciones audio={audio.current} est={estEs} onCerrar={() => setPanel(false)} />}
      </div>
    </div>
  );
}
