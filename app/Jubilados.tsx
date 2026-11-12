"use client";
import { useMemo, useState } from "react";
import BotonLlamar from "./BotonLlamar";
import { Icono } from "./Iconos";
import Pie from "./Pie";
import { URL_MAYORES as U, type DatosJubilados, type Centro } from "@/lib/jubilados";

const ext = (url: string) => ({ href: url, target: "_blank", rel: "noreferrer" });
const Boton = ({ url, children, claro }: { url: string; children: React.ReactNode; claro?: boolean }) => <a className={`btn ${claro ? "claro" : "grande-btn"}`} {...ext(url)}>{children} ↗</a>;
const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const mapaDe = (c: Centro) => c.lat && c.lng
  ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`
  : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${c.direccion}, ${c.barrio}, Lomas de Zamora, Buenos Aires, Argentina`)}`;
const POR_VEZ = 12;

// Tarjeta de un centro de jubilados: lo que no está publicado dice "Consultar". Nunca se inventa un dato.
function CentroCard({ c }: { c: Centro }) {
  const sinDatos = !c.actividades && !c.horarios && !c.telefono;
  return (
    <li className="lugar-principal mayores-centro">
      <b>{c.nombre}</b>
      <span className="dato"><Icono nombre="pin" tam={22} /> {c.direccion}{c.barrio ? ` · ${c.barrio}` : ""}</span>
      {sinDatos
        ? <span className="dato mayores-consultar">Teléfono, días, horarios y actividades: consultar</span>
        : (
          <>
            <span className="dato"><b>Actividades:</b> {c.actividades || "Consultar"}</span>
            <span className="dato"><b>Días y horarios:</b> {c.horarios || "Consultar"}</span>
            {c.telefono ? <span className="dato"><Icono nombre="telefono" tam={22} /> {c.telefono}</span> : <span className="dato"><b>Teléfono:</b> Consultar</span>}
          </>
        )}
      <div className="acciones">
        {c.telefono && <BotonLlamar nombre={c.nombre} numero={c.telefono} />}
        <a className="btn claro" {...ext(mapaDe(c))}>Cómo llegar ↗</a>
      </div>
      <Pie seccion={`jubilados:${c.id}`} fuente={c.fuente || "Consultar"} url={c.fuenteUrl} />
    </li>
  );
}

// Pantalla "Jubilados": talleres gratis de PAMI, cursos UPAMI, centros de jubilados de Lomas, el área del Municipio y un enlace a "Hoy cobran".
// Letra grande y botones grandes. Todos los botones llevan a sitios oficiales.
export default function Jubilados({ datos, abrir }: { datos: DatosJubilados; abrir: (v: string) => void }) {
  const [barrio, setBarrio] = useState("");
  const [buscar, setBuscar] = useState("");
  const [cuantos, setCuantos] = useState(POR_VEZ);
  const barrios = useMemo(() => [...new Set(datos.centros.map((c) => c.barrio).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [datos.centros]);
  const q = normal(buscar.trim());
  const lista = datos.centros.filter((c) => (!barrio || c.barrio === barrio) && (!q || normal(`${c.nombre} ${c.direccion} ${c.barrio} ${c.actividades}`).includes(q)));

  return (
    <div className="mayores">
      <p className="mayores-intro">Actividades, talleres y lugares para juntarse, aprender y pasarla bien.</p>

      <section className="lugar-principal" aria-label="Talleres gratis de PAMI">
        <h2>🎨 Talleres gratis de PAMI</h2>
        <span>Clases para aprender, moverte y compartir buenos momentos, en centros de jubilados y otras instituciones de tu zona. Son sin costo, no hace falta tener estudios y se hacen en persona.</span>
        <span>Hay música y canto, teatro, danza, memoria, yoga, gimnasia, computación y más.</span>
        <Boton url={U.pamiTalleres}>Buscar y anotarme en PAMI</Boton>
        <small className="mayores-ayuda">En el buscador elegí <b>BUENOS AIRES</b> y tu departamento (<b>Lomas de Zamora</b>). Solo podés anotarte en los talleres de tu departamento.</small>
        <Boton url={U.pamiBuenVivir} claro>Programa Buen Vivir (salud y bienestar en los centros)</Boton>
        <small className="chico">Fuente: PAMI.</small>
      </section>

      <section className="lugar-principal" aria-label="Cursos en la universidad">
        <h2>🎓 Cursos en la universidad (UPAMI)</h2>
        <span>Cursos dados por docentes universitarios, sin costo, para afiliados de PAMI. No necesitás estudios previos (no hace falta el secundario).</span>
        <span>Pueden ser en persona, virtuales o mixtos. Si son en persona, te anotás en la universidad más cercana a tu casa. Los lugares dependen de cada universidad.</span>
        <span>Hoy, cerca de Lomas, el buscador de PAMI muestra cursos de la <b>Universidad Nacional de Lanús</b> y de la <b>Universidad Provincial de Ezeiza</b>. La lista cambia en cada cuatrimestre.</span>
        <Boton url={U.pamiUpami}>Ver cursos y anotarme</Boton>
        <small className="mayores-ayuda">En cada curso vas a ver las fechas de inscripción y cuántos lugares quedan.</small>
        <small className="chico">Fuente: PAMI (lista de universidades consultada en noviembre de 2026).</small>
      </section>

      <h2 className="mayores-titulo">🏠 Centros de jubilados de Lomas</h2>
      <p className="mayores-intro">Encontrá el centro de tu barrio. Para saber qué actividades hay y en qué horarios, consultá en el centro o en la Agencia de Personas Adultas Mayores (ver más abajo).</p>
      <label className="elegir-barrio mayores-filtro">
        <span>Barrio</span>
        <select value={barrio} onChange={(e) => { setBarrio(e.target.value); setCuantos(POR_VEZ); }} aria-label="Barrio">
          <option value="">📍 Todos los barrios ({datos.centros.length})</option>
          {barrios.map((b) => <option key={b} value={b}>{b} ({datos.centros.filter((c) => c.barrio === b).length})</option>)}
        </select>
      </label>
      <input className="mayores-buscar" type="search" value={buscar} onChange={(e) => { setBuscar(e.target.value); setCuantos(POR_VEZ); }} placeholder="Buscar por nombre o calle" aria-label="Buscar un centro" />
      <ul className="lista mayores-lista">{lista.slice(0, cuantos).map((c) => <CentroCard key={c.id} c={c} />)}</ul>
      {lista.length === 0 && <p className="vacio">{datos.centros.length === 0 ? "Todavía no hay centros cargados." : "No encontramos centros con ese filtro."}</p>}
      {lista.length > cuantos && <button className="btn claro ancho" onClick={() => setCuantos((n) => n + POR_VEZ)}>Mostrar más ({lista.length - cuantos} más)</button>}

      {datos.actividades.length > 0 && (
        <>
          <h2 className="mayores-titulo">📅 Más actividades</h2>
          <ul className="lista mayores-lista">
            {datos.actividades.map((a) => (
              <li key={a.id} className="lugar-principal">
                <b>{a.titulo}</b>
                {a.descripcion && <span>{a.descripcion}</span>}
                <span className="dato"><Icono nombre="pin" tam={22} /> {a.donde || "Consultar"}</span>
                <span className="dato"><Icono nombre="reloj" tam={22} /> {a.cuando || "Consultar"}</span>
                {a.telefono && <BotonLlamar nombre={a.titulo} numero={a.telefono} />}
                <Pie seccion={`jubilados-act:${a.id}`} fuente={a.fuente || "Consultar"} url={a.fuenteUrl} />
              </li>
            ))}
          </ul>
        </>
      )}

      <section className="lugar-principal" aria-label="Agencia de Personas Adultas Mayores del Municipio">
        <h2>🏛️ El Municipio y las personas mayores</h2>
        <span>La Agencia de Personas Adultas Mayores de Lomas de Zamora trabaja con más de 120 centros de jubilados.</span>
        <b>Qué hace</b>
        <ul className="mayores-puntos">
          <li>Talleres en los centros: memoria, manualidades y tejidos, ritmos latinos, nuevas tecnologías, yoga y zumba adaptados, y talleres literarios.</li>
          <li>Curso gratuito de cuidadores domiciliarios (dos veces por año).</li>
          <li>Vacunación y controles de salud con los centros de jubilados.</li>
          <li>Registro de residencias geriátricas habilitadas.</li>
        </ul>
        <span>Para saber en qué centro se da cada taller y cómo anotarte, escribile a la Agencia.</span>
        <Boton url={U.agencia}>Ver la página de la Agencia</Boton>
        <a className="btn claro" href="mailto:agenciadepersonasmayores@lomasdezamora.gov.ar">✉️ Escribir a la Agencia</a>
        <Boton url={U.instagram} claro>Instagram de la Agencia</Boton>
        <Boton url={U.geriatricos} claro>Residencias geriátricas habilitadas</Boton>
        <small className="chico">Fuente: Municipio de Lomas de Zamora (consultado en noviembre de 2026).</small>
      </section>

      <section className="lugar-principal mayores-cobran" aria-label="Hoy cobran">
        <b>¿Buscás las fechas de cobro?</b>
        <span>Las fechas de jubilaciones y pensiones están en la sección “Hoy cobran”.</span>
        <button className="btn grande-btn" onClick={() => abrir("anses")}>Ir a “Hoy cobran”</button>
      </section>

      <p className="aviso-pie">Lomas Hoy no inscribe ni cobra nada: te lleva a las páginas oficiales. Los talleres y cursos de PAMI son gratis: nadie te puede pedir plata para darte un lugar.</p>
    </div>
  );
}
