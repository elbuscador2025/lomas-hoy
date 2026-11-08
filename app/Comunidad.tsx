"use client";
import Pie from "./Pie";

// Trámites municipales: Comunidad Lomas, el "Perfil Digital Único" del Municipio de Lomas de Zamora (comunidad.lomasdezamora.gov.ar).
// El texto sale de las páginas oficiales (inicio, "Registro" y términos), leídas el 07/11/2026. La app solo informa y abre el portal oficial: no se carga ni se guarda ningún dato personal acá.
export const URL_COMUNIDAD = "https://comunidad.lomasdezamora.gov.ar/";
export const URL_COMUNIDAD_REGISTRO = "https://comunidad.lomasdezamora.gov.ar/registro";
export const PALABRAS_COMUNIDAD = "tramite tramites turno turnos municipio municipal municipalidad comunidad lomas perfil digital unico documentacion dni salud actividades inscripcion inscribirse propuestas pagos pagar tasas gestiones online registrarme registro";

export default function Comunidad() {
  return (
    <>
      <h2>¿Qué es?</h2>
      <p className="vacio"><b>Comunidad Lomas</b> es el portal oficial del <b>Municipio de Lomas de Zamora</b> para sacar turnos y hacer trámites online, con una sola cuenta. Es libre y gratuito.</p>

      <h2>¿Qué podés hacer?</h2>
      <section className="lugar-principal" aria-label="Qué podés hacer">
        <span className="dato">🏥 Sacar turnos de salud</span>
        <span className="dato">🪪 Sacar turnos de documentación</span>
        <span className="dato">⚽ Inscribirte en actividades culturales, deportivas y recreativas</span>
        <span className="dato">💡 Enviar propuestas</span>
        <span className="dato">💳 Realizar pagos</span>
        <span className="dato">📋 Iniciar gestiones y ver cómo va lo que enviaste</span>
      </section>
      <small className="vacio">Y más, según lo que publique el Municipio.</small>

      <h2>¿Cómo registrarte?</h2>
      <ol className="pasos-comunidad">
        <li><b>Completá tus datos</b> en el formulario de registro.</li>
        <li><b>Ingresá el código</b> que te mandan por correo electrónico.</li>
        <li><b>Listo:</b> ya podés hacer solicitudes, inscripciones, reservas y otros trámites online.</li>
      </ol>
      <section className="lugar-principal" aria-label="Datos que piden">
        <span className="dato">📝 Te piden: DNI, nombre, fecha de nacimiento, correo electrónico, celular y domicilio.</span>
        <span className="dato">📍 El domicilio es el real, aunque no coincida con el del DNI.</span>
        <span className="dato">📄 Tenés que aceptar los términos y condiciones. Una sola cuenta personal por persona, y no compartas tu contraseña.</span>
      </section>

      <div className="acciones">
        <a className="btn grande-btn" href={URL_COMUNIDAD} target="_blank" rel="noreferrer">Entrar a Comunidad Lomas ↗</a>
        <a className="btn grande-btn" href={URL_COMUNIDAD_REGISTRO} target="_blank" rel="noreferrer">Registrarme ↗</a>
      </div>
      <small className="vacio">Se abre el portal oficial del Municipio. Registrarse es solo la primera vez.</small>

      <Pie seccion="comunidad" fuente="Municipio de Lomas de Zamora, Comunidad Lomas" url={URL_COMUNIDAD} />
    </>
  );
}
