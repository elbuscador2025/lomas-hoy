"use client";
import { useEffect, useState } from "react";
import { config } from "@/lomas.config.mjs";
import { ZONAS } from "@/lib/avisos";
import { esIOS, estaInstalada, type Push } from "./usePush";

function Selector({ valor, onCambio }: { valor: string; onCambio: (v: string) => void }) {
  return (
    <label className="campo">Mi barrio
      <select value={valor} onChange={(e) => onCambio(e.target.value)}>
        {ZONAS.map((z) => <option key={z}>{z}</option>)}
      </select>
    </label>
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

// Tarjeta de bienvenida (se puede cerrar). Pide el permiso solo al tocar "Activar avisos".
export function Bienvenida({ push }: { push: Push }) {
  const [oculta, setOculta] = useState(true);
  const [ios, setIos] = useState(false);
  const [instalada, setInstalada] = useState(false);
  const [barrio, setBarrio] = useState("Todo Lomas");
  useEffect(() => {
    try { setOculta(localStorage.getItem("lomas-hoy:bienvenida") === "cerrada"); } catch { setOculta(false); }
    setIos(esIOS()); setInstalada(estaInstalada());
  }, []);
  if (oculta || (push.estado !== "inactivo" && push.estado !== "iosSinInstalar")) return null;

  const cerrar = () => { try { localStorage.setItem("lomas-hoy:bienvenida", "cerrada"); } catch {} setOculta(true); };
  return (
    <section className="bienvenida" aria-label="Bienvenida">
      <div className="bienvenida-arriba">
        <b>Bienvenido a Lomas Hoy</b>
        <button className="cerrar" onClick={cerrar} aria-label="Cerrar">Cerrar</button>
      </div>
      <div className="paso">
        <span className="num">1</span>
        <div>
          <b>Agregá Lomas Hoy a tu pantalla</b>
          {instalada ? <p>Listo, ya la tenés.</p>
            : ios ? <p>En Safari tocá <b>Compartir</b> y elegí <b>Agregar a inicio</b>.</p>
            : <p>En Chrome tocá el menú <b>⋮</b> y elegí <b>Instalar app</b>.</p>}
        </div>
      </div>
      <div className="paso">
        <span className="num">2</span>
        <div>
          <b>Activá los avisos</b>
          {push.estado === "iosSinInstalar" ? (
            <p>En iPhone los avisos solo funcionan si abrís la app desde el ícono de la pantalla de inicio. Hacé el paso 1 y volvé a abrirla desde ahí.</p>
          ) : (
            <>
              <p>Tren, cortes de luz y avisos del municipio, solo lo que te importa.</p>
              <Selector valor={barrio} onCambio={setBarrio} />
              <button className="btn ancho" disabled={push.ocupado} onClick={() => push.activar({ ...push.prefs, barrio })}>Activar avisos</button>
              {push.error && <p className="error">{push.error}</p>}
            </>
          )}
        </div>
      </div>
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
export default function Notificaciones({ push }: { push: Push }) {
  const [barrio, setBarrio] = useState(push.prefs.barrio);
  useEffect(() => setBarrio(push.prefs.barrio), [push.prefs.barrio]);
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
        <p>Recibí un aviso en el celular cuando pase algo importante. Elegí tu barrio y listo: no hace falta registrarse ni dar datos personales.</p>
        <Selector valor={barrio} onCambio={setBarrio} />
        <button className="btn ancho" disabled={push.ocupado} onClick={() => push.activar({ ...prefs, barrio })}>Activar avisos</button>
        {push.error && <p className="error">{push.error}</p>}
      </>
    );

  return (
    <>
      <Selector valor={barrio} onCambio={(v) => { setBarrio(v); push.guardar({ ...prefs, barrio: v }); }} />
      <h2>Qué querés recibir</h2>
      {(Object.entries(config.push.tipos) as [string, { activa: boolean; titulo: string }][]).map(([k, t]) => (
        <Interruptor key={k} titulo={t.titulo} activo={t.activa && !!prefs.tipos[k]} deshabilitado={!t.activa}
          nota={!t.activa ? "No disponible por ahora: no hay una fuente oficial confiable." : undefined}
          onCambio={(v) => push.guardar({ ...prefs, barrio, tipos: { ...prefs.tipos, [k]: v } })} />
      ))}
      <p className="vacio">De 23:00 a 7:00 no te mandamos nada. Todo se sigue viendo dentro de la app. Máximo {config.push.maximoPorDia} avisos por día.</p>
      <button className="btn claro ancho" disabled={push.ocupado} onClick={push.desactivar}>Desactivar todos</button>
      {push.error && <p className="error">{push.error}</p>}
    </>
  );
}
