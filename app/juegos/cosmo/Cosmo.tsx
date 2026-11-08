"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type PhaserTipos from "phaser";
import { guardarRecord, leerRecord, tono, useSonido } from "../comun";
import type { ControlCosmo, EstadoCosmo } from "./juego";

// COSMO LOMAS: naves contra invasores (2D, Phaser). Ocupa toda la pantalla del celular.
// Nada del juego se descarga hasta tocar "Jugar": ahí recién se pide el motor (/juegos/phaser.min.js, que el service worker no guarda) y el código del juego.
const CLAVE = "cosmo";
let promesaMotor: Promise<typeof PhaserTipos> | null = null;
const cargarMotor = () => (promesaMotor ??= new Promise<typeof PhaserTipos>((ok, mal) => {
  const w = window as unknown as { Phaser?: typeof PhaserTipos };
  if (w.Phaser) return ok(w.Phaser);
  const s = document.createElement("script");
  s.src = "/juegos/phaser.min.js"; s.async = true;
  s.onload = () => (w.Phaser ? ok(w.Phaser) : mal(new Error("motor")));
  s.onerror = () => { promesaMotor = null; mal(new Error("motor")); };
  document.head.appendChild(s);
}));

export default function Cosmo({ onSalir }: { onSalir?: () => void }) {
  const zona = useRef<HTMLDivElement>(null), control = useRef<ControlCosmo | null>(null), recordRef = useRef(0);
  const [pantalla, setPantalla] = useState<"inicio" | "cargando" | "error" | "juego">("inicio");
  const [est, setEst] = useState<EstadoCosmo | null>(null);
  const [record, setRecord] = useState(0);
  const [nuevoRecord, setNuevoRecord] = useState(false);
  const [banner, setBanner] = useState(0);
  const { activo, alternar } = useSonido();

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

  const alCambiar = useCallback((e: EstadoCosmo) => {
    setEst((antes) => {
      if (e.fase === "fin" && antes?.fase !== "fin") {
        if (e.puntos > recordRef.current) { recordRef.current = e.puntos; guardarRecord(CLAVE, e.puntos); setRecord(e.puntos); setNuevoRecord(true); }
        else setNuevoRecord(false);
      }
      if (e.fase === "jugando" && e.puntos === 0 && e.nivel === 1) setNuevoRecord(false);
      if (e.oleada !== antes?.oleada) { setBanner(e.oleada); window.setTimeout(() => setBanner((b) => (b === e.oleada ? 0 : b)), 1500); }
      return e;
    });
  }, []);

  async function jugar() {
    tono(1, 0.01, "sine", 0.0001); // destraba el audio con este toque
    setPantalla("cargando");
    try {
      const [motor, juego] = await Promise.all([cargarMotor(), import("./juego")]);
      if (!zona.current) return;
      control.current = juego.crearJuego(motor, zona.current, alCambiar);
      setPantalla("juego");
    } catch { setPantalla("error"); }
  }

  const fase = est?.fase, vidas = Math.max(0, est?.vidas ?? 3);
  return (
    <div className="cosmo-pantalla">
      <div className="cosmo-hud">
        <button className="cosmo-salir" onClick={onSalir} aria-label="Salir del juego">‹ Salir</button>
        <span>Puntos<b>{est?.puntos ?? 0}</b></span>
        <span>Récord<b>{Math.max(record, est?.puntos ?? 0)}</b></span>
        <span className="cosmo-vidas" aria-label={`${vidas} vidas`}>{"♥".repeat(vidas) || "–"}</span>
        <span>Nivel<b>{est?.nivel ?? 1}</b></span>
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
        {pantalla === "juego" && banner > 0 && fase === "jugando" && <div className="cosmo-banner">Oleada {banner}</div>}
        {pantalla === "juego" && est?.doble && fase === "jugando" && <div className="cosmo-doble">⚡ Disparo doble</div>}
        {pantalla !== "juego" && (
          <div className="jg-capa">
            {pantalla === "inicio" && <>
              <b>Cosmo Lomas</b>
              <span>Defendé el cielo de los invasores de colores</span>
              <span className="cosmo-ayuda">Deslizá el dedo para mover la nave: dispara sola.<br />En la compu: ← → o A D.</span>
              {record > 0 && <em>Tu récord: {record}</em>}
              <button className="jg-grande" onClick={jugar}>Jugar</button>
            </>}
            {pantalla === "cargando" && <><b>Cargando…</b><span>Preparando el juego</span></>}
            {pantalla === "error" && <><b>No se pudo cargar</b><span>Revisá tu conexión y probá de nuevo</span><button className="jg-grande" onClick={jugar}>Reintentar</button></>}
          </div>
        )}
        {pantalla === "juego" && fase === "pausa" && (
          <div className="jg-capa"><b>Pausa</b><button className="jg-grande" onClick={() => control.current?.reanudar()}>Seguir</button></div>
        )}
        {pantalla === "juego" && fase === "fin" && (
          <div className="jg-capa">
            <b>Fin del juego</b>
            <span>{est?.puntos} puntos · llegaste al nivel {est?.nivel}</span>
            {nuevoRecord && <em>¡Nuevo récord!</em>}
            <button className="jg-grande" onClick={() => control.current?.reiniciar()}>Jugar de nuevo</button>
          </div>
        )}
      </div>
    </div>
  );
}
