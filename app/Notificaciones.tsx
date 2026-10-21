"use client";
import { useEffect, useState } from "react";
import { config } from "@/lomas.config.mjs";
import { Icono } from "./Iconos";
import { useInstalar, type Push } from "./usePush";
import { LOCALIDADES } from "@/lib/localidades";

// La única pregunta al activar los avisos: de acá sale a quién le llegan los cortes de luz.
function SelectorLocalidad({ valor, onCambio }: { valor?: string; onCambio: (l: string) => void }) {
  return (
    <label className="pregunta-localidad">¿En qué localidad vivís?
      <select value={valor ?? ""} onChange={(e) => onCambio(e.target.value)}>
        <option value="">Elegí tu localidad</option>
        {LOCALIDADES.map((l) => <option key={l}>{l}</option>)}
      </select>
    </label>
  );
}

// A quienes activaron los avisos antes de que existiera la pregunta: se les hace la próxima vez que abren la app.
export function PreguntaLocalidad({ push }: { push: Push }) {
  if (push.estado !== "activo" || push.prefs.localidad) return null;
  return (
    <section className="cartel" aria-label="Tu localidad">
      <SelectorLocalidad onCambio={(l) => push.guardar({ ...push.prefs, localidad: l })} />
      <small className="chico">Hasta que elijas, no te llegan los avisos de cortes de luz.</small>
      {push.error && <p className="error">{push.error}</p>}
    </section>
  );
}

function PasosIPhone() {
  return (
    <ol className="pasos">
      <li>Abrí Lomas Hoy en <b>Safari</b>.</li>
      <li>Tocá el botón <b>Compartir</b> (el cuadrado con una flecha hacia arriba).</li>
      <li>Elegí <b>Agregar a inicio</b> y tocá <b>Agregar</b>.</li>
      <li>Cerrá Safari y abrí Lomas Hoy <b>desde el ícono nuevo</b>. Ahí vas a poder activar los avisos.</li>
    </ol>
  );
}

const guardarCierre = (clave: string) => { try { localStorage.setItem(clave, "cerrada"); } catch {} };
const estaCerrado = (clave: string) => { try { return localStorage.getItem(clave) === "cerrada"; } catch { return false; } };

// Cartel aparte para instalar la app. Si ya está instalada, no aparece.
export function CartelInstalar() {
  const { instalada, ios, evento, instalar } = useInstalar();
  const [cerrado, setCerrado] = useState(true);
  useEffect(() => setCerrado(estaCerrado("lomas-hoy:cartel-instalar")), []);
  // En Android solo se ofrece cuando el navegador dice que se puede instalar (si ya está instalada, no lo dice).
  if (cerrado || instalada || (!ios && !evento)) return null;
  return (
    <section className="cartel" aria-label="Instalar la app">
      <span className="cartel-logo">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/icon-192.png" alt="" width={48} height={48} /><b>Instalá Lomas Hoy en tu celular</b></span>
      {ios ? (
        <ol className="pasos">
          <li>Tocá el botón <b>Compartir</b> (el cuadrado con una flecha hacia arriba).</li>
          <li>Después tocá <b>Agregar a inicio</b>.</li>
        </ol>
      ) : (
        <button className="btn ancho" onClick={instalar}>Instalar</button>
      )}
      <button className="link" onClick={() => { guardarCierre("lomas-hoy:cartel-instalar"); setCerrado(true); }}>Ahora no</button>
    </section>
  );
}

const AVISOS_QUE_LLEGAN: { icono: string; texto: string; activo: boolean }[] = [
  { icono: "tren", texto: "Se corta o se demora el tren Roca", activo: config.push.tipos.tren.activa },
  { icono: "reloj", texto: "Va a haber un corte de luz programado", activo: config.push.tipos.luz.activa && config.programados.activa },
  { icono: "luz", texto: "Hay un corte de luz ahora", activo: config.push.tipos.luz.activa },
  { icono: "gota", texto: "Hay un corte de agua", activo: config.push.tipos.agua.activa },
  { icono: "colectivo", texto: "Hay paro de colectivos", activo: config.push.tipos.colectivos.activa },
  { icono: "tormenta", texto: "Hay alerta de tormenta", activo: config.push.tipos.tormenta.activa },
];

// Cartel para activar los avisos. Pide el permiso del navegador solo al tocar "Activar avisos".
export function CartelAvisos({ push, agua }: { push: Push; agua: boolean }) {
  const [cerrado, setCerrado] = useState(true);
  useEffect(() => setCerrado(estaCerrado("lomas-hoy:bienvenida")), []);
  if (cerrado || (push.estado !== "inactivo" && push.estado !== "iosSinInstalar")) return null;
  return (
    <section className="cartel" aria-label="Activar los avisos">
      <b>Activá los avisos</b>
      <p>Te suena el celular cuando pasa algo en Lomas:</p>
      <ul className="que-llega">
        {AVISOS_QUE_LLEGAN.filter((a) => a.activo && (agua || a.icono !== "gota")).map((a) => (
          <li key={a.texto}><span className="icono-aviso"><Icono nombre={a.icono} tam={22} /></span>{a.texto}</li>
        ))}
      </ul>
      {push.estado === "iosSinInstalar" ? (
        <p>En iPhone los avisos solo funcionan si abrís la app desde el ícono de la pantalla de inicio. Primero instalala con los pasos de arriba y abrila desde ahí.</p>
      ) : (
        <>
          <SelectorLocalidad valor={push.prefs.localidad} onCambio={(l) => push.setPrefs({ ...push.prefs, localidad: l })} />
          <button className="btn ancho grande-btn" disabled={push.ocupado || !push.prefs.localidad} onClick={() => push.activar(push.prefs)}>Activar avisos</button>
          <small className="chico">Los podés apagar cuando quieras.</small>
          {push.error && <p className="error">{push.error}</p>}
        </>
      )}
      <button className="link" onClick={() => { guardarCierre("lomas-hoy:bienvenida"); setCerrado(true); }}>Ahora no</button>
    </section>
  );
}

function Interruptor({ activo, deshabilitado, onCambio, titulo, nota }: {
  activo: boolean; deshabilitado?: boolean; onCambio: (v: boolean) => void; titulo: string; nota?: string;
}) {
  return (
    <div className="interruptor-fila">
      <span><b>{titulo}</b>{nota && <small>{nota}</small>}</span>
      <button role="switch" aria-checked={activo} aria-label={titulo} disabled={deshabilitado}
        className={`interruptor ${activo ? "on" : ""}`} onClick={() => onCambio(!activo)}><span /></button>
    </div>
  );
}

// Pantalla "Avisos"
export default function Notificaciones({ push, agua }: { push: Push; agua: boolean }) {
  const { estado, prefs } = push;

  if (estado === "cargando") return <p className="vacio">Cargando…</p>;
  if (estado === "noSoportado") return <p>Este navegador no permite recibir avisos. Probá desde Chrome en Android, o desde Safari en iPhone con la app agregada a la pantalla de inicio.</p>;
  if (estado === "iosSinInstalar")
    return (
      <>
        <p>En iPhone los avisos solo funcionan si Lomas Hoy está agregada a la pantalla de inicio (hace falta iOS 16.4 o más nuevo). Seguí estos pasos:</p>
        <PasosIPhone />
      </>
    );
  if (estado === "denegado")
    return <p>Los avisos están bloqueados en este navegador. Para activarlos, tocá el candado junto a la dirección (o los ajustes de la app) y permití las notificaciones; después volvé acá.</p>;

  if (estado === "inactivo")
    return (
      <>
        <p>Recibí un aviso en el celular cuando pase algo importante. Con un toque: no hace falta registrarse ni dar datos personales.</p>
        <SelectorLocalidad valor={prefs.localidad} onCambio={(l) => push.setPrefs({ ...prefs, localidad: l })} />
        <button className="btn ancho grande-btn" disabled={push.ocupado || !prefs.localidad} onClick={() => push.activar(prefs)}>Activar avisos</button>
        {push.error && <p className="error">{push.error}</p>}
      </>
    );

  return (
    <>
      <SelectorLocalidad valor={prefs.localidad} onCambio={(l) => push.guardar({ ...prefs, localidad: l })} />
      <p className="vacio">Los avisos de cortes de luz le llegan solo a quien eligió esa localidad.</p>
      <h2>Qué querés recibir</h2>
      {(Object.entries(config.push.tipos) as [string, { activa: boolean; titulo: string }][]).filter(([k]) => k !== "agua" || agua).map(([k, t]) => (
        <Interruptor key={k} titulo={t.titulo} activo={t.activa && !!prefs.tipos[k]} deshabilitado={!t.activa}
          nota={!t.activa ? "No disponible por ahora: no hay una fuente oficial confiable." : undefined}
          onCambio={(v) => push.guardar({ ...prefs, tipos: { ...prefs.tipos, [k]: v } })} />
      ))}
      <p className="vacio">De 23:00 a 7:00 no te mandamos nada. Todo se sigue viendo dentro de la app. Máximo {config.push.maximoPorDia} avisos por día.</p>
      <button className="btn claro ancho" disabled={push.ocupado} onClick={push.desactivar}>Desactivar todos</button>
      {push.error && <p className="error">{push.error}</p>}
    </>
  );
}
