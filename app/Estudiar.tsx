"use client";
import { URL_ESTUDIAR as U, SEDES_CFP, CONTACTO_APRENDER, CONTACTO_FINES_PBA, REVISADO_ESTUDIAR } from "@/lib/estudiar";
import { Icono } from "./Iconos";
import BotonLlamar from "./BotonLlamar";

const ext = (url: string) => ({ href: url, target: "_blank", rel: "noreferrer" });
const mapa = (dir: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${dir}, Buenos Aires, Argentina`)}`;
const Boton = ({ url, children, claro }: { url: string; children: React.ReactNode; claro?: boolean }) => <a className={`btn ${claro ? "claro" : "grande-btn"}`} {...ext(url)}>{children} ↗</a>;

// Pantalla "Estudiá gratis": cinco tarjetas con texto corto y botones directos a páginas oficiales. Lomas Hoy no inscribe ni cobra nada.
export default function Estudiar() {
  const cfps = [...new Set(SEDES_CFP.map((s) => s.cfp))];
  return (
    <>
      <p className="vacio">Oficios, terminar la secundaria y cursos con certificado. Todos los botones llevan a sitios oficiales. Datos revisados en {REVISADO_ESTUDIAR}.</p>

      <section className="lugar-principal auto-tarjeta" aria-label="Aprender Lomas">
        <h2>🛠️ Aprender Lomas · programa del Municipio</h2>
        <span>Aprender Lomas es una plataforma del Municipio de Lomas de Zamora que reúne cursos y capacitaciones de oficios y de otras áreas (profesionales, culturales, deportivas y técnicas), de distintos niveles y por localidad. Incluye la oferta de la Universidad Nacional de Lomas de Zamora y de centros de formación.</span>
        <Boton url={U.aprenderCursos}>Ver los cursos de Aprender Lomas</Boton>
        <span>Desde Aprender Lomas también se llega al portal municipal <b>Empleo Lomas</b>, con búsquedas de empleo.</span>
        <Boton url={U.empleo} claro>Empleo Lomas</Boton>
        <small className="chico">Si un curso da certificado y cómo anotarte se ve en la ficha de cada curso. Consultas: {CONTACTO_APRENDER}. Fuente: <a {...ext(U.aprenderPagina)}>Municipio de Lomas de Zamora</a>.</small>
      </section>

      <section className="lugar-principal auto-tarjeta" aria-label="Terminar la primaria o la secundaria">
        <h2>📚 Terminar la primaria o la secundaria</h2>
        <span>El Plan <b>FinEs</b> te permite cursar gratis y de manera semipresencial la primaria o la secundaria, o rendir las materias que debas, con docentes tutores. El título es oficial y tiene validez nacional.</span>
        <span><b>Es para:</b> mayores de 18 años que no empezaron o no terminaron la primaria o la secundaria, o que cursaron el último año y deben materias.</span>
        <span><b>Qué necesitás:</b> fotocopia del DNI, partida de nacimiento, constancia de CUIL y el certificado de primaria o de tus últimos estudios.</span>
        <span><b>Cómo te anotás:</b> te registrás en la página oficial, elegís la jurisdicción (Buenos Aires) y completás la preinscripción eligiendo la escuela FinEs más cercana a tu casa.</span>
        <Boton url={U.fines}>Anotarme en FinEs</Boton>
        <small className="chico">Consultas en la Provincia: {CONTACTO_FINES_PBA}. Escuelas para adultos de Lomas: consultar (en la preinscripción se elige la escuela más cercana). Fuente: Ministerio de Capital Humano, Educación (argentina.gob.ar).</small>
      </section>

      <section className="lugar-principal auto-tarjeta" aria-label="Centros de Formación Profesional de Lomas">
        <h2>🔧 Centros de Formación Profesional de Lomas</h2>
        <span>Cursos de oficios en los CFP de la Provincia que funcionan en Lomas de Zamora. Los cursos de cada sede, las fechas y cómo anotarse están en Aprender Lomas.</span>
        <Boton url={U.aprenderCursos}>Ver los cursos de cada centro</Boton>
        {cfps.map((n) => (
          <details key={n} className="subseccion tramite">
            <summary><b>CFP N° {n} ({SEDES_CFP.filter((s) => s.cfp === n).length} {SEDES_CFP.filter((s) => s.cfp === n).length === 1 ? "sede" : "sedes"})</b><span className="flecha" aria-hidden>›</span></summary>
            <div className="tramite-cuerpo">
              <ul className="lista">
                {SEDES_CFP.filter((s) => s.cfp === n).map((s) => (
                  <li key={s.direccion} className="lugar">
                    <b>CFP N° {s.cfp} · {s.barrio}</b>
                    <span className="dato"><Icono nombre="pin" tam={18} /> {s.direccion}, {s.barrio}</span>
                    <span className="dato"><b>Cursos:</b> Consultar en Aprender Lomas</span>
                    <div className="acciones">
                      <BotonLlamar nombre={`el CFP N° ${s.cfp}`} numero={s.telefono} />
                      <a className="btn claro" {...ext(mapa(`${s.direccion}, ${s.barrio}`))}>Cómo llegar ↗</a>
                    </div>
                    <small>Correo: {s.mail}</small>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ))}
        <small className="chico">Fuente: Aprender Lomas (Municipio de Lomas de Zamora). Confirmá por teléfono antes de ir.</small>
      </section>

      <section className="lugar-principal auto-tarjeta" aria-label="Cursos online gratis con certificado">
        <h2>💻 Cursos online gratis con certificado</h2>
        <span>Plataformas oficiales de la Nación y de la Provincia:</span>
        <b>Nación · Capacitar</b>
        <span>Plataforma del Ministerio de Economía con cursos y webinars sin costo para emprender, mejorar tu empresa y formarte en tecnología y habilidades digitales. Podés obtener certificaciones sin costo.</span>
        <Boton url={U.capacitarCursos}>Ver cursos y webinars de Capacitar</Boton>
        <b>Provincia · cursos de formación laboral</b>
        <span>Buscador oficial de la oferta gratuita de formación laboral de la Provincia: filtrás por municipio y ves dónde se dicta cada curso, las fechas y cómo preinscribirte. Muchos cursos son presenciales: en cada uno figura el lugar.</span>
        <Boton url={U.ipfl} claro>Buscar cursos de la Provincia</Boton>
        <small className="chico">Fuentes: argentina.gob.ar y Ministerio de Trabajo de la Provincia de Buenos Aires (IPFL).</small>
      </section>

      <section className="lugar-principal auto-tarjeta" aria-label="Becas para estudiar">
        <h2>🎒 Becas para estudiar</h2>
        <span><b>Progresar</b> acompaña a los jóvenes para que terminen la escuela, sigan estudios superiores y se formen profesionalmente. Hay tres líneas: Obligatorio, Superior y Formación Profesional.</span>
        <span>Según la página oficial: <b>Progresar Formación Profesional</b> tiene la inscripción abierta <b>hasta el 27 de noviembre</b>. La inscripción de Progresar Obligatorio terminó el 4 de septiembre y la de Progresar Superior, el 11 de septiembre.</span>
        <Boton url={U.progresarInscripcion}>Inscribirme en Progresar</Boton>
        <Boton url={U.progresar} claro>Requisitos y fechas de Progresar</Boton>
        <small className="chico">Fechas según argentina.gob.ar al consultar en {REVISADO_ESTUDIAR}: confirmalas en la página oficial. Fuente: Ministerio de Capital Humano, Educación.</small>
      </section>

      <p className="aviso-pie">Lomas Hoy no inscribe ni cobra nada: te lleva a la página oficial de cada organismo. Estos cursos y becas son gratuitos: nadie te puede pedir plata por un lugar.</p>
    </>
  );
}
