"use client";
import { useEffect, useRef, useState } from "react";
import { crearAudio, MAX_BYTES, MAX_CANCIONES, type AudioAutopista, type EstadoEstereo } from "./audio";

const INICIAL: EstadoEstereo = { encendido: false, sonando: false, actual: 0, pistas: [{ id: "prueba", nombre: "Canción de prueba", tipo: "prueba", tam: 0 }], volMusica: 0.7, volMotor: 0.6, mensaje: "", ocupado: false, usado: 0 };
const mb = (b: number) => (b <= 0 ? "0 MB" : b >= 1048576 ? `${(b / 1048576).toFixed(b >= 10485760 ? 0 : 1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// El audio (motor + estéreo) vive mientras está abierto el juego
export function useAudioAutopista() {
  const audio = useRef<AudioAutopista | null>(null);
  const [est, setEst] = useState<EstadoEstereo>(INICIAL);
  useEffect(() => {
    const a = crearAudio(setEst);
    audio.current = a;
    return () => { a.destruir(); audio.current = null; };
  }, []);
  return { audio, est };
}

// Deslizador de volumen propio (con punteros): anda con el dedo aunque la pantalla bloquee los gestos
function Deslizador({ valor, onCambio, etiqueta }: { valor: number; onCambio: (v: number) => void; etiqueta: string }) {
  const caja = useRef<HTMLDivElement>(null), id = useRef(-1);
  const mover = (x: number) => { const r = caja.current!.getBoundingClientRect(); onCambio(Math.max(0, Math.min(1, (x - r.left) / r.width))); };
  return (
    <div
      ref={caja} className="ap-desliz" role="slider" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(valor * 100)} tabIndex={0}
      onPointerDown={(ev) => { ev.preventDefault(); id.current = ev.pointerId; try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch {} mover(ev.clientX); }}
      onPointerMove={(ev) => { if (id.current === ev.pointerId) mover(ev.clientX); }}
      onPointerUp={(ev) => { if (id.current === ev.pointerId) id.current = -1; }} onPointerCancel={() => { id.current = -1; }}
      onKeyDown={(ev) => { if (ev.key === "ArrowLeft") onCambio(Math.max(0, valor - 0.1)); if (ev.key === "ArrowRight") onCambio(Math.min(1, valor + 0.1)); }}
    >
      <div className="ap-desliz-riel"><div className="ap-desliz-lleno" style={{ width: `${valor * 100}%` }} /><div className="ap-desliz-perilla" style={{ left: `${valor * 100}%` }} /></div>
    </div>
  );
}

// Estéreo del tablero: la pantalla táctil de la foto. Al tocar el ícono «Música» se abre el reproductor encima de la pantalla (los otros íconos son de adorno)
export function Estereo({ audio, est, onAbrir, zona, tarjeta }: { audio: AudioAutopista | null; est: EstadoEstereo; onAbrir: () => void; zona: React.CSSProperties; tarjeta: React.CSSProperties }) {
  const [abierto, setAbierto] = useState(false);
  const [visto, setVisto] = useState(false);
  const p = est.pistas[est.actual];
  return (
    <>
      <button className={`ap-es-icono${visto ? "" : " llama"}`} style={zona} onClick={() => { setAbierto((v) => !v); setVisto(true); }} aria-label="Estéreo: Música" aria-expanded={abierto} />
      {abierto && (
        <div className="ap-es-tarjeta" style={tarjeta} role="group" aria-label="Estéreo del camión">
          <div className="ap-es-cab"><b>♫ Música</b><button onClick={() => setAbierto(false)} aria-label="Cerrar el estéreo">✕</button></div>
          <div className="ap-es-pantalla" aria-live="polite">
            <small>{est.sonando ? "SONANDO" : est.encendido ? "EN PAUSA" : "ESTÉREO"}</small>
            <span>{p ? p.nombre : "Sin canciones"}</span>
          </div>
          <div className="ap-es-fila">
            <button className="ap-es-btn ap-es-play" onClick={() => audio?.alternar()} aria-label={est.sonando ? "Pausar la música" : "Reproducir la música"}>{est.sonando ? "⏸" : "▶"}</button>
            <button className="ap-es-btn ap-es-sig" onClick={() => audio?.siguiente()} aria-label="Canción siguiente">⏭</button>
            <span className="ap-es-vol" aria-hidden>🔈</span>
            <Deslizador valor={est.volMusica} onCambio={(v) => audio?.volumenMusica(v)} etiqueta="Volumen de la música" />
          </div>
          <button className="ap-es-agregar" onClick={onAbrir}>Agregar mis canciones</button>
        </div>
      )}
    </>
  );
}

// Panel de canciones: la de prueba, las del jugador (se guardan en su teléfono), volumen del motor y el botón para agregar
export function PanelCanciones({ audio, est, onCerrar }: { audio: AudioAutopista | null; est: EstadoEstereo; onCerrar: () => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const mias = est.pistas.filter((x) => x.tipo === "mia").length;
  return (
    <div className="ap-panel" role="dialog" aria-modal="true" aria-label="Mis canciones">
      <div className="ap-panel-caja">
        <div className="ap-panel-cabeza"><b>Estéreo · mis canciones</b><button onClick={onCerrar} aria-label="Cerrar">✕</button></div>
        <ul className="ap-canciones">
          {est.pistas.map((x, i) => (
            <li key={x.id} className={i === est.actual && est.sonando ? "suena" : ""}>
              <button className="ap-cancion" disabled={!!x.noDisponible} onClick={() => audio?.reproducir(i)}>
                <span aria-hidden>{i === est.actual && est.sonando ? "♪" : "▶"}</span>
                <span className="ap-cancion-nombre">{x.nombre}{x.noDisponible ? " (todavía no está cargada)" : ""}</span>
                {x.tam > 0 && <small>{mb(x.tam)}</small>}
              </button>
              {x.tipo === "mia" && <button className="ap-quitar" onClick={() => audio?.quitar(x.id)} aria-label={`Quitar ${x.nombre}`}>Quitar</button>}
            </li>
          ))}
        </ul>
        <button className="jg-grande ancho" disabled={est.ocupado || mias >= MAX_CANCIONES} onClick={() => entrada.current?.click()}>{est.ocupado ? "Guardando…" : "Agregar mis canciones"}</button>
        <input ref={entrada} type="file" accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac" multiple hidden onChange={(ev) => { const f = [...(ev.target.files ?? [])]; ev.target.value = ""; if (f.length) audio?.agregar(f); }} />
        <p className="ap-panel-datos">{mias} de {MAX_CANCIONES} canciones · {mb(est.usado)} de {Math.round(MAX_BYTES / 1048576)} MB</p>
        {est.mensaje && <p className="ap-panel-msg" role="status">{est.mensaje}</p>}
        <label className="ap-panel-vol">Volumen del motor
          <Deslizador valor={est.volMotor} onCambio={(v) => audio?.volumenMotor(v)} etiqueta="Volumen del motor" />
        </label>
        <small className="ap-panel-nota">Tus canciones se guardan en este teléfono y no se suben a ningún lado. En iPhone, el sistema puede borrar lo guardado si hace falta espacio.</small>
      </div>
    </div>
  );
}
