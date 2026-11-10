"use client";
import { useMemo, useState } from "react";
import { Icono } from "./Iconos";
import BotonLlamar from "./BotonLlamar";
import Pie from "./Pie";
import { type DatosDeportes, type Institucion, waDeportes } from "@/lib/deportes";

const Costo = ({ i }: { i: Institucion }) =>
  i.costo === "gratis" ? <span className="pildora ok">Gratis</span>
  : i.costo === "pago" ? <span className="pildora neutro">Pago</span>
  : <span className="pildora dep-consultar">Costo: consultar</span>;

const dato = (v: string) => v || "Consultar";
const mapaDe = (i: Institucion) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${i.direccion}, ${i.barrio}, Lomas de Zamora, Buenos Aires`)}`;

// Pantalla "Deportes para chicos": botones por deporte, filtro por barrio, y al tocar un club se abre su ficha. Lo que no está publicado dice "Consultar".
export default function DeportesPantalla({ datos }: { datos: DatosDeportes }) {
  const [disc, setDisc] = useState("");
  const [barrio, setBarrio] = useState("");
  const [abierta, setAbierta] = useState("");
  const lista = datos.instituciones;
  const deportes = datos.disciplinas.filter((d) => lista.some((i) => i.disciplinas.includes(d)));
  const barrios = useMemo(() => [...new Set(lista.map((i) => i.barrio).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [lista]);
  const visibles = lista.filter((i) => (!disc || i.disciplinas.includes(disc)) && (!barrio || i.barrio === barrio));
  const ficha = lista.find((i) => i.id === abierta);

  if (ficha) {
    const i = ficha;
    return (
      <>
        <button className="btn claro ancho" onClick={() => { setAbierta(""); window.scrollTo({ top: 0 }); }}>‹ Volver a la lista</button>
        <section className="lugar-principal dep-ficha" aria-label={i.nombre}>
          {i.foto && /* eslint-disable-next-line @next/next/no-img-element */ <img className="dep-foto-grande" src={i.foto} alt={i.nombre} />}
          <h2>{i.nombre}</h2>
          <div className="dep-pildoras"><Costo i={i} />{i.disciplinas.map((d) => <span key={d} className="pildora neutro">{d}</span>)}</div>
          <span className="dato"><Icono nombre="pin" tam={18} /> {i.direccion ? `${i.direccion}${i.barrio ? `, ${i.barrio}` : ""}` : `Dirección: consultar${i.barrio ? ` · ${i.barrio}` : ""}`}</span>
          <span className="dato"><b>Edades:</b> {dato(i.edades)}</span>
          <span className="dato"><Icono nombre="reloj" tam={18} /> <span><b>Días y horarios:</b> {dato(i.horarios)}</span></span>
          <span className="dato"><b>Inscripción:</b> {dato(i.inscripcion)}</span>
          {i.telefono && <span className="dato"><Icono nombre="telefono" tam={18} /> {i.telefono}</span>}
          <div className="acciones">
            {i.telefono && <BotonLlamar nombre={i.nombre} numero={i.telefono} />}
            {i.whatsapp && <a className="btn whatsapp-chico" target="_blank" rel="noreferrer" href={`https://wa.me/${waDeportes(i.whatsapp)}`}><Icono nombre="whatsapp" tam={22} /> WhatsApp {i.whatsapp}</a>}
            {!i.telefono && !i.whatsapp && <span className="dato dep-sin-contacto">Teléfono o WhatsApp: consultar</span>}
            {i.direccion && <a className="btn claro" target="_blank" rel="noreferrer" href={mapaDe(i)}>Cómo llegar ↗</a>}
          </div>
        </section>
        <p className="vacio">Confirmá los horarios y las vacantes con el club antes de ir.</p>
        <Pie seccion={`deportes:${i.id}`} fuente={i.fuente || "Consultar"} url={i.fuenteUrl} />
      </>
    );
  }

  return (
    <>
      {datos.soloDueno && <p className="aviso-pie">Sección oculta: solo la ves vos. Los vecinos la ven cuando prendas el interruptor en el panel.</p>}
      <p className="vacio">Clubes y escuelas deportivas de Lomas de Zamora para chicos. Tocá uno para ver su ficha.</p>
      <div className="dep-chips" role="tablist" aria-label="Deporte">
        <button role="tab" aria-selected={!disc} className={`dep-chip ${!disc ? "on" : ""}`} onClick={() => setDisc("")}>Todos</button>
        {deportes.map((d) => <button key={d} role="tab" aria-selected={disc === d} className={`dep-chip ${disc === d ? "on" : ""}`} onClick={() => setDisc(d)}>{d}</button>)}
      </div>
      {barrios.length > 1 && (
        <label className="elegir-barrio">
          <select value={barrio} onChange={(e) => setBarrio(e.target.value)} aria-label="Barrio">
            <option value="">📍 Todo Lomas</option>
            {barrios.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
      )}
      <ul className="lista">
        {visibles.map((i) => (
          <li key={i.id}>
            <button className="dep-card" onClick={() => { setAbierta(i.id); window.scrollTo({ top: 0 }); }}>
              {i.foto && /* eslint-disable-next-line @next/next/no-img-element */ <img className="foto-vecino" src={i.foto} alt="" loading="lazy" />}
              <span className="dep-card-texto">
                <b>{i.nombre}</b>
                <span className="dep-pildoras"><Costo i={i} /></span>
                <small>{i.disciplinas.join(" · ")}</small>
                <small>{[i.barrio, i.edades ? `Edades: ${i.edades}` : ""].filter(Boolean).join(" · ") || "Barrio y edades: consultar"}</small>
              </span>
              <span className="flecha" aria-hidden>›</span>
            </button>
          </li>
        ))}
      </ul>
      {visibles.length === 0 && <p className="vacio">{lista.length === 0 ? "Todavía no hay clubes cargados." : "No hay clubes con ese filtro. Probá con otro deporte o barrio."}</p>}
    </>
  );
}
