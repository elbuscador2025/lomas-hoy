"use client";
import { IMDIPAM, TRAMITES, NACIONAL, REVISADO } from "@/lib/discapacidad";
import { Icono } from "./Iconos";
import BotonLlamar from "./BotonLlamar";

const enlace = (url: string) => ({ href: url, target: "_blank", rel: "noreferrer" });

// Pantalla "Discapacidad": el lugar principal, cada trámite como tarjeta que se abre, y la ayuda nacional.
export default function Discapacidad() {
  const destino = encodeURIComponent(IMDIPAM.mapa);
  return (
    <>
      <section className="lugar-principal" aria-label="Dónde ir">
        <h2>Dónde ir en Lomas</h2>
        <b>{IMDIPAM.nombre}</b>
        <span>{IMDIPAM.tambien}</span>
        <span className="dato"><Icono nombre="pin" tam={18} /> {IMDIPAM.direccion}</span>
        <small>También atiende en {IMDIPAM.tambienEn}.</small>
        <span className="dato"><Icono nombre="reloj" tam={18} /> {IMDIPAM.horario}</span>
        <span className="dato"><Icono nombre="telefono" tam={18} /> {IMDIPAM.telefono}</span>
        <small>{IMDIPAM.telefonoNota}.</small>
        <BotonLlamar nombre="IMDIPAM" numero={IMDIPAM.telefono} />
        <div className="acciones">
          <a className="btn claro" {...enlace(`https://www.google.com/maps/dir/?api=1&destination=${destino}`)}>Cómo llegar</a>
        </div>
        <small>Correo: {IMDIPAM.correo}</small>
      </section>

      <h2>Trámites y servicios</h2>
      {TRAMITES.map((t) => (
        <details key={t.id} className="subseccion tramite">
          <summary><b>{t.titulo}</b><span className="flecha" aria-hidden>›</span></summary>
          <div className="tramite-cuerpo">
            <h3>¿Qué es?</h3><p>{t.que}</p>
            <h3>¿Quién lo puede pedir?</h3><p>{t.quien}</p>
            <h3>¿Qué necesito?</h3>
            <ul>{t.necesito.map((x) => <li key={x}>{x}</li>)}</ul>
            <h3>¿Dónde lo hago?</h3>
            <ul>{t.donde.map((x) => <li key={x}>{x}</li>)}</ul>
            {t.nota && <p className="vacio">{t.nota}</p>}
            {t.enlaces && (
              <ul className="enlaces-oficiales">
                {t.enlaces.map((e) => <li key={e.url}><a {...enlace(e.url)}>{e.texto}</a></li>)}
              </ul>
            )}
            <small className="chico">Fuente: <a {...enlace(t.fuente.url)}>{t.fuente.texto}</a></small>
          </div>
        </details>
      ))}

      <h2>Ayuda a nivel nacional</h2>
      <section className="lugar-principal">
        <b>{NACIONAL.nombre}</b>
        <span className="dato"><Icono nombre="telefono" tam={18} /> {NACIONAL.telefono}</span>
        <small>{NACIONAL.direccion}</small>
        <BotonLlamar nombre="la Secretaría Nacional de Discapacidad" numero={NACIONAL.telefono} />
        <ul className="enlaces-oficiales">
          {NACIONAL.enlaces.map((e) => <li key={e.url}><a {...enlace(e.url)}>{e.texto}</a></li>)}
        </ul>
        <p className="aviso-estafa">{NACIONAL.aviso}</p>
      </section>

      <p className="vacio">Información del Municipio de Lomas de Zamora y del Gobierno nacional. Confirmá por teléfono antes de ir. Revisado el {REVISADO}.</p>
    </>
  );
}
