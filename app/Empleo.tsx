"use client";
import Pie from "./Pie";

// Portal Empleo: solo informa y manda al portal oficial y gratuito del Estado (dirección verificada el 07/11/2026).
// No se carga ni se guarda ningún dato personal acá: el CV y las postulaciones se hacen en el portal oficial.
export const URL_PORTAL_EMPLEO = "https://portalempleo.gob.ar/portada"; // abre directo el Portal Empleo (la dirección sin /portada pasa antes por una página de inicio del Estado)
export const PALABRAS_EMPLEO = "empleo trabajo cv curriculum curriculum vitae buscar trabajo buscar empleo oferta ofertas laborales busqueda laboral portal empleo cursos formacion capacitacion gratis oficial";

export default function Empleo() {
  return (
    <>
      <h2>¿Qué es?</h2>
      <p className="vacio">El <b>Portal Empleo</b> es la plataforma <b>oficial y gratuita</b> del Estado para buscar trabajo: subís tu CV, ves ofertas y cursos de formación. Es para todas las edades.</p>

      <div className="acciones">
        <a className="btn grande-btn" href={URL_PORTAL_EMPLEO} target="_blank" rel="noreferrer">Buscar trabajo en el Portal Empleo ↗</a>
      </div>
      <small className="vacio">Se abre el sitio oficial del Estado. Tu CV y tus postulaciones los cargás ahí, no en Lomas Hoy.</small>

      <Pie seccion="empleo" fuente="Portal Empleo, Ministerio de Capital Humano" url={URL_PORTAL_EMPLEO} />
    </>
  );
}
