"use client";
import Pie from "./Pie";
import { AvisarmeNuevos } from "./Notificaciones";
import { haceCuanto } from "@/lib/hace";
import type { Push } from "./usePush";
import type { NotaAgenda } from "@/lib/agenda";

// Agenda de Lomas: notas de los diarios locales que anuncian eventos y actividades. Las elige el sitio con reglas fijas (sin IA) y solo muestra el título y el enlace:
// el día, la hora y el lugar están en la nota completa. Cada nota se ve hasta 15 días y desaparece sola.
export const PALABRAS_AGENDA = "evento eventos agenda festival festivales feria ferias show shows recital recitales espectaculo espectaculos actividad actividades gratis gratuito taller talleres inscripcion cultura cultural que hacer fin de semana";

export default function Agenda({ notas, push, sinDatos }: { notas: NotaAgenda[]; push: Push; sinDatos: boolean }) {
  return (
    <>
      <p className="vacio">Notas de los diarios de Lomas que anuncian festivales, ferias, shows, actividades gratis, talleres e inscripciones. Entrá a la nota para ver el día, la hora y el lugar.</p>
      <AvisarmeNuevos push={push} tipo="agenda" textos={{ boton: "🔔 Avisarme de eventos nuevos", activo: "Te avisamos de los eventos nuevos", quitar: "Desactivar" }} />
      {sinDatos ? <p className="vacio">Sin datos por ahora. Probá de nuevo en un rato.</p>
        : notas.length === 0 ? <p className="vacio">Por ahora no hay notas de eventos. Volvé a mirar más tarde.</p>
        : (
          <ul className="lista agenda-lista">
            {notas.map((n) => (
              <li key={n.link}>
                <a className="agenda-nota" href={n.link} target="_blank" rel="noreferrer">
                  <b>{n.titulo}</b>
                  <small>{n.medio} · {haceCuanto(n.fecha)}</small>
                  <span className="agenda-leer">Leer la nota ↗</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      <Pie seccion="agenda" fuente="Lomas Conectado y Diario Lomas (solo títulos y enlaces)" />
    </>
  );
}
