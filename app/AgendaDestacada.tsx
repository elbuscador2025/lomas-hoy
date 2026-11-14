"use client";
import { config } from "@/lomas.config.mjs";
import type { Push } from "./usePush";
import { diaAR, diaCorto, proximosEventos, type NotaCorta } from "@/lib/agenda-fecha";

// Tarjeta ancha de la pantalla principal, debajo de La Voz de Lomas: los próximos 3 eventos de la Agenda (con el día que dice el título) o, si no hay,
// las 3 notas más nuevas. Al tocar uno se abre la nota; el botón de abajo abre la sección completa.
export default function AgendaDestacada({ notas, onVerTodo, push }: { notas: NotaCorta[]; onVerTodo: () => void; push: Push }) {
  const eventos = proximosEventos(notas, diaAR(Date.now()), config.localidades);
  return (
    <section className="agenda-dest" aria-label="Agenda de Lomas">
      <h2>🎉 Agenda de Lomas</h2>
      <p className="agenda-dest-sub">Lo que se viene en Lomas, de los diarios locales</p>
      {eventos.length === 0 ? (
        <p className="agenda-dest-vacio">Por ahora no hay eventos anunciados. Volvé a mirar más tarde.</p>
      ) : (
        <ul className="agenda-dest-lista">
          {eventos.map((e) => (
            <li key={e.link}>
              <a className="agenda-dest-evento" href={e.link} target="_blank" rel="noreferrer">
                <span className={`agenda-dest-dia${e.esNota ? " es-nota" : ""}`}>
                  <b>{diaCorto(e.dia!)}</b>
                  {e.esNota && <small>nota</small>}
                </span>
                <span className="agenda-dest-texto">
                  <b>{e.titulo}</b>
                  <small>{e.lugar ? `📍 ${e.lugar}` : `📰 ${e.medio}`}</small>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="agenda-dest-fila">
        <button className="btn grande-btn agenda-dest-btn" onClick={onVerTodo}>Ver toda la agenda ({notas.length})</button>
        {push.estado === "activo" ? (
          <span className="agenda-dest-avisos activo">🔔 Avisos activados</span>
        ) : push.estado !== "noSoportado" && (
          // Activa los avisos igual que el botón de adentro de la Agenda; si el celular necesita pasos extra (iPhone sin instalar, bloqueado), se abre la Agenda que los explica
          <button className="agenda-dest-avisos" disabled={push.ocupado} onClick={() => (push.estado === "inactivo" ? push.activar({ ...push.prefs, tipos: { ...push.prefs.tipos, agenda: true } }) : onVerTodo())}>🔔 Avisarme</button>
        )}
      </div>
    </section>
  );
}
