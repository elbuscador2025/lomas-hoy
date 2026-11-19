"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { guardarRecord, leerRecord, tono, useSonido } from "../comun";
import type { ControlAutopista, Entrada, EstadoAutopista } from "./motor";
import { Estereo, PanelCanciones, useAudioAutopista } from "./Estereo";

// CARRERA DE AUTOPISTA: camión por una autopista con curvas (pseudo-3D con el lienzo 2D, sin librerías ni imágenes). Ocupa toda la pantalla del celular, solo vertical.
// Nada del motor se descarga hasta tocar "Jugar".
const CLAVE = "autopista";
const GIRO_MAX = 1.75; // el volante gira hasta unos 100° para cada lado

// Volante circular: se gira arrastrando el dedo alrededor del centro; al soltarlo vuelve solo al medio. No molesta a los pedales (cada dedo va por su lado).
function Volante({ entrada }: { entrada: Entrada }) {
  const caja = useRef<HTMLDivElement>(null), rueda = useRef<HTMLDivElement>(null);
  const est = useRef({ id: -1, a: 0, ang: 0, raf: 0 });
  const aplicar = () => { const e = est.current; if (rueda.current) rueda.current.style.transform = `rotate(${e.ang}rad)`; entrada.volante = Math.max(-1, Math.min(1, e.ang / GIRO_MAX)); };
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
      ref={caja} className="ap-volante" role="slider" aria-label="Volante: arrastralo en círculo para girar" aria-valuemin={-100} aria-valuemax={100}
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
      <div ref={rueda} className="ap-rueda">
        <svg viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="44" fill="none" stroke="#1B2238" strokeWidth="11" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#3A4466" strokeWidth="3" />
          <path d="M50 50 L10 58 M50 50 L90 58 M50 50 L50 90" stroke="#1B2238" strokeWidth="9" strokeLinecap="round" />
          <circle cx="50" cy="50" r="12" fill="#2A3350" stroke="#5B6A99" strokeWidth="2" />
          <rect x="46" y="3" width="8" height="12" rx="3" fill="#FFC83D" />
        </svg>
      </div>
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
  const zona = useRef<HTMLDivElement>(null), control = useRef<ControlAutopista | null>(null), recordRef = useRef(0);
  const entrada = useRef<Entrada>({ volante: 0, acel: false, freno: false });
  const [pantalla, setPantalla] = useState<"inicio" | "cargando" | "error" | "juego">("inicio");
  const [est, setEst] = useState<EstadoAutopista | null>(null);
  const [record, setRecord] = useState(0);
  const [nuevoRecord, setNuevoRecord] = useState(false);
  const { activo, alternar } = useSonido();
  const { audio, est: estEs } = useAudioAutopista();
  const [panel, setPanel] = useState(false);
  useEffect(() => { audio.current?.motorActivo(activo); }, [activo, audio]); // el botón 🔊 apaga solo los sonidos del juego; la música tiene sus propios controles

  useEffect(() => { const r = leerRecord(CLAVE); recordRef.current = r; setRecord(r); }, []);
  // mientras se juega, la página de atrás no se mueve ni hace scroll
  useEffect(() => {
    document.body.classList.add("cosmo-activo");
    return () => { document.body.classList.remove("cosmo-activo"); control.current?.destruir(); control.current = null; };
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
      control.current = juego.crearJuego(zona.current, entrada.current, alCambiar, audio.current ?? undefined);
      setPantalla("juego");
    } catch { setPantalla("error"); }
  }

  const fase = est?.fase, vidas = Math.max(0, est?.vidas ?? 3);
  return (
    <div className="cosmo-pantalla ap-pantalla">
      <div className="cosmo-hud">
        <button className="cosmo-salir" onClick={onSalir} aria-label="Salir del juego">‹ Salir</button>
        <span>Puntos<b>{est?.puntos ?? 0}</b></span>
        <span>Récord<b>{Math.max(record, est?.puntos ?? 0)}</b></span>
        <span className="cosmo-vidas" aria-label={`${vidas} vidas`}>{"♥".repeat(vidas) || "–"}</span>
        <span><b>{est?.kmh ?? 0}</b> km/h</span>
      </div>
      <div className="cosmo-area">
        <div ref={zona} className="cosmo-lienzo" />
        <div className="cosmo-botones">
          {pantalla === "juego" && fase !== "fin" && (
            <button onClick={() => (fase === "pausa" ? control.current?.reanudar() : control.current?.pausar())} aria-label={fase === "pausa" ? "Seguir" : "Pausa"}>{fase === "pausa" ? "▶" : "⏸"}</button>
          )}
          {pantalla === "juego" && <button onClick={() => control.current?.reiniciar()} aria-label="Reiniciar">↻</button>}
          <button onClick={alternar} aria-pressed={!activo} aria-label={activo ? "Silenciar sonidos" : "Activar sonidos"}>{activo ? "🔊" : "🔇"}</button>
        </div>
        {pantalla !== "juego" && (
          <div className="jg-capa">
            {pantalla === "inicio" && <>
              <b>Carrera de Autopista</b>
              <span>Manejá el camión y esquivá el tráfico</span>
              <span className="cosmo-ayuda">Girá el volante con el dedo (en círculo).<br />Con el otro dedo: acelerador y freno.<br />En la compu: ← → ↑ ↓.</span>
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
      </div>
      <div className="ap-tablero">
        <Estereo audio={audio.current} est={estEs} onAbrir={() => { control.current?.pausar(); setPanel(true); }} />
        <div className="ap-mandos">
          <Volante entrada={entrada.current} />
          <div className="ap-pedales">
            <Pedal clase="acel" etiqueta="Acelerador" texto="ACELERAR" alCambiar={(a) => { entrada.current.acel = a; }} />
            <Pedal clase="freno" etiqueta="Freno" texto="FRENAR" alCambiar={(a) => { entrada.current.freno = a; }} />
          </div>
        </div>
      </div>
      {panel && <PanelCanciones audio={audio.current} est={estEs} onCerrar={() => setPanel(false)} />}
    </div>
  );
}
