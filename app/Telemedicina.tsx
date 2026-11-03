"use client";
import BotonLlamar from "./BotonLlamar";
import Pie from "./Pie";

// Telemedicina Lomas: servicio gratuito del Municipio. Todo sale de la página oficial https://formularios.lomasdezamora.gov.ar/telemedicina.aspx (verificada el 03/11/2026).
// La app solo informa y abre el portal oficial: no se carga ni se guarda ningún dato de salud acá.
export const URL_TELEMEDICINA = "https://telemedicina.lomasdezamora.gov.ar";
export const URL_TELEMEDICINA_REGISTRO = `${URL_TELEMEDICINA}/registro`; // "Crear una nueva cuenta" del portal
export const URL_TELEMEDICINA_INGRESO = `${URL_TELEMEDICINA}/login`; // "Iniciar sesión" del portal
export const URL_TELEMEDICINA_INFO = "https://lomasdezamora.gov.ar/iframe/telemedicina.aspx";
export const PALABRAS_TELEMEDICINA = "telemedicina medico medica doctor doctora videollamada video llamada consulta virtual online pediatra pediatria clinica medica receta certificado reposo atencion medica gratis gratuita";

export default function Telemedicina() {
  return (
    <>
      <section className="aviso-emergencia" aria-label="Aviso importante">
        <b>⚠️ No es para emergencias</b>
        <span>Ante una emergencia llamá al 107 (desde un teléfono fijo) o, desde un celular, al 4292-3896, 4243-0899 o 4292-3399. O andá a la guardia.</span>
        <BotonLlamar nombre="Emergencias médicas de Lomas" numero="107" />
        <BotonLlamar nombre="Emergencias médicas de Lomas (desde celular)" numero="4292-3896" />
      </section>

      <h2>¿Qué es?</h2>
      <p className="vacio">Un servicio <b>gratuito del Municipio</b> de Lomas de Zamora para hacer consultas médicas de forma virtual, por videollamada, <b>las 24 horas</b>. Es para personas que viven en el Municipio.</p>

      <div className="acciones">
        <a className="btn grande-btn" href={URL_TELEMEDICINA_REGISTRO} target="_blank" rel="noreferrer">Registrarme ↗</a>
        <a className="btn grande-btn" href={URL_TELEMEDICINA_INGRESO} target="_blank" rel="noreferrer">Entrar a la consulta ↗</a>
      </div>
      <small className="vacio">Se abre el portal oficial del Municipio. Registrarse es solo la primera vez.</small>

      <h2>Especialidades</h2>
      <section className="lugar-principal" aria-label="Especialidades">
        <span className="dato">👶 <b>Pediatría:</b> de 0 a 14 años.</span>
        <span className="dato">🧑 <b>Clínica médica:</b> desde los 15 años.</span>
        <span className="dato">👨‍👩‍👧 Podés registrar a todo tu grupo familiar.</span>
      </section>

      <h2>Qué necesitás</h2>
      <section className="lugar-principal" aria-label="Qué necesitás">
        <span className="dato">📱 Un celular o dispositivo con internet, cámara y micrófono.</span>
        <span className="dato">✉️ Un correo electrónico.</span>
        <span className="dato">📝 Registrarte una sola vez en el portal: después gestionás todas tus consultas desde ahí.</span>
        <span className="dato">📍 Saber tu código postal. Si tenés obra social, el número de afiliado.</span>
      </section>

      <h2>Qué te mandan después</h2>
      <section className="lugar-principal" aria-label="Qué te mandan después">
        <span className="dato">💊 Recetas de estudios y de medicamentos, por correo electrónico.</span>
        <span className="dato">📄 Certificados de reposo (no laboral para ART).</span>
      </section>

      <div className="acciones">
        <a className="btn claro" href={URL_TELEMEDICINA_INFO} target="_blank" rel="noreferrer">Más información en la web del Municipio ↗</a>
      </div>
      <Pie seccion="telemedicina" fuente="Municipio de Lomas de Zamora, Telemedicina Lomas" url={URL_TELEMEDICINA_INFO} />
    </>
  );
}
