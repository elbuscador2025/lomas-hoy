"use client";
import { Icono } from "./Iconos";
import BotonLlamar from "./BotonLlamar";
import Pie from "./Pie";
import { type Jornada, URL_TURNO_CASTRACION, URL_HOSPITAL_ANIMALES, HOSPITAL_DIRECCION, HOSPITAL_HORARIO, TELEFONOS_MUNICIPIO, REDES_CRONOGRAMA } from "@/lib/castracion";

const fechaLarga = (f: string) => { const t = new Date(f + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }); return t.charAt(0).toUpperCase() + t.slice(1); };

// Pantalla "Castración gratuita": cómo sacar turno, jornadas en los barrios, requisitos oficiales y contacto. No se pide ni se guarda ningún dato.
export default function Castracion({ jornadas }: { jornadas: Jornada[] }) {
  return (
    <>
      <p className="vacio">Información para acceder al servicio municipal gratuito de castración de perros y gatos en Lomas de Zamora.</p>

      <h2>Sacar turno</h2>
      <section className="lugar-principal" aria-label="Sacar turno">
        <b>Las castraciones son siempre con turno previo.</b>
        <a className="btn grande-btn" href={URL_TURNO_CASTRACION} target="_blank" rel="noreferrer">Pedir turno en la web del Municipio ↗</a>
        <small>Se abre otra página: “Comunidad Lomas”, del Municipio.</small>
        <b>O en persona, en el Hospital de Animales</b>
        <span className="dato"><Icono nombre="pin" tam={18} /> {HOSPITAL_DIRECCION}</span>
        <span className="dato"><Icono nombre="reloj" tam={18} /> {HOSPITAL_HORARIO}</span>
      </section>

      <h2>Jornadas en los barrios</h2>
      {jornadas.length === 0 ? (
        <p className="vacio"><b>Por ahora no hay jornadas confirmadas.</b></p>
      ) : (
        <ul className="lista">
          {jornadas.map((j) => (
            <li key={j.id} className="tarjeta oficina-anses">
              <b className="of-dir">{fechaLarga(j.fecha)}</b>
              <span className="of-nombre">{j.barrio}</span>
              <span className="dato"><Icono nombre="pin" tam={18} /> {j.direccion}</span>
              {j.horario && <span className="dato"><Icono nombre="reloj" tam={18} /> {j.horario}</span>}
              {j.modalidad && <span className="dato">{j.modalidad}</span>}
              {j.requisitos && <span className="dato"><b>Requisitos:</b> {j.requisitos}</span>}
              <div className="acciones">
                <a className="btn claro" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${j.direccion}, ${j.barrio}, Lomas de Zamora, Buenos Aires`)}`}>Cómo llegar ↗</a>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="vacio">El Municipio también hace operativos en los barrios. El cronograma se publica en Instagram:</p>
      <div className="acciones">
        {REDES_CRONOGRAMA.map((r) => <a key={r.url} className="btn claro" href={r.url} target="_blank" rel="noreferrer">{r.nombre} ↗</a>)}
      </div>

      <h2>Requisitos</h2>
      <section className="lugar-principal" aria-label="Requisitos">
        <span className="dato">✔ Siempre con turno previo.</span>
        <span className="dato">✔ Cumplir las indicaciones previas a la cirugía.</span>
        <small>El Municipio no publica en su web cuáles son esas indicaciones (ni edad ni ayuno). Consultalas en el Hospital de Animales o llamando antes de ir.</small>
      </section>

      <h2>Contacto</h2>
      <section className="lugar-principal" aria-label="Contacto">
        <b>Hospital de Animales de Lomas de Zamora</b>
        <span className="dato"><Icono nombre="pin" tam={18} /> {HOSPITAL_DIRECCION}</span>
        <small>Centro de Atención a la Comunidad del Municipio (consultas):</small>
        {TELEFONOS_MUNICIPIO.map((t) => <BotonLlamar key={t} nombre="Municipio de Lomas de Zamora" numero={t} />)}
        <a className="btn claro" href={URL_HOSPITAL_ANIMALES} target="_blank" rel="noreferrer">Página oficial del Hospital de Animales ↗</a>
      </section>
      <p className="vacio">Datos de la página oficial del Municipio. Confirmá antes de ir.</p>
      <Pie seccion="castracion" fuente="Municipio de Lomas de Zamora, Hospital de Animales" url={URL_HOSPITAL_ANIMALES} />
    </>
  );
}
