"use client";
import { useEffect, useMemo, useState } from "react";
import { IconoLinea } from "./IconosLinea";
import BotonLlamar from "./BotonLlamar";
import Pie from "./Pie";
import { FACULTADES, URL_UNLZ, TEL_UNLZ, REVISADO_UNLZ } from "@/lib/unlz";
import { NIVELES, buscarTexto, telefonoBonito, mapaEscuela, INSCRIPCIONES_POR_DEFECTO, type DatosEscuelas, type Escuela, type Nivel } from "@/lib/escuelas-comun";

const ext = (url: string) => ({ href: url, target: "_blank", rel: "noreferrer" });
const POR_VEZ = 20;
const hoyAR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
const diaLindo = (f: string) => new Date(`${f}T12:00:00-03:00`).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "long" });
const fechaLinda = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "long", year: "numeric" }) : "");

// ---- 1. Recuadro "Inscripciones 2027" ----
function Inscripciones({ d }: { d: DatosEscuelas["inscripciones"] }) {
  return (
    <section className="esc-insc" aria-label="Inscripciones 2027">
      <div className="esc-insc-cabeza">
        <span className="esc-icono"><IconoLinea nombre="calendario" tam={28} /></span>
        <div>
          <h2 className="rotulo">Inscripciones 2027</h2>
          <b className={d.fechas ? "esc-fechas-titulo" : "esc-sin-fechas"}>{d.fechas ? "Ya hay fechas publicadas" : d.resumen}</b>
        </div>
      </div>
      {d.fechas && <p className="esc-fechas">{d.fechas}</p>}
      {d.detalle && <p>{d.detalle}</p>}
      {d.modalidad && <><h3>¿Cómo se hace?</h3><p>{d.modalidad}</p></>}
      {d.papeles.length > 0 && <><h3>Qué papeles llevar</h3><ul className="esc-lista">{d.papeles.map((p) => <li key={p}>{p}</li>)}</ul></>}
      {d.nota && <p className="chico esc-nota">{d.nota}</p>}
      <div className="esc-botones">
        {d.enlaces.map((e, i) => <a key={e.url} className={`btn ${i === 0 ? "grande-btn" : "claro"}`} {...ext(e.url)}>{e.titulo} ↗</a>)}
      </div>
    </section>
  );
}

// ---- 3. Universidad Nacional de Lomas de Zamora ----
const estado = (f: (typeof FACULTADES)[number]) => {
  if (f.ingreso.consultar || !f.ingreso.cierra) return { texto: "Fechas: consultar", clase: "", cerrada: false };
  return hoyAR() > f.ingreso.cierra ? { texto: `Cerró el ${diaLindo(f.ingreso.cierra)}`, clase: "esc-cerro", cerrada: true } : { texto: `Abierta hasta el ${diaLindo(f.ingreso.cierra)}`, clase: "esc-abierta", cerrada: false };
};
function Universidad() {
  return (
    <section className="esc-univ" aria-label="Universidad Nacional de Lomas de Zamora">
      <div className="esc-insc-cabeza">
        <span className="esc-icono esc-icono-univ"><IconoLinea nombre="estudiar" tam={28} /></span>
        <div>
          <h2 className="rotulo">Universidad</h2>
          <b>Universidad Nacional de Lomas de Zamora (UNLZ)</b>
        </div>
      </div>
      <p>La UNLZ tiene cinco facultades. Cada una publica sus propias fechas de ingreso 2027: tocá una para ver las carreras y cómo inscribirte.</p>
      {FACULTADES.map((f) => (
        <details key={f.id} className="esc-facultad">
          <summary>
            <span className="esc-fac-titulo"><b>{f.nombre}</b><small className={estado(f).clase}>{estado(f).texto}</small></span>
            <span className="esc-fac-flecha" aria-hidden><IconoLinea nombre="flecha" tam={22} /></span>
          </summary>
          <div className="esc-fac-cuerpo">
            {estado(f).cerrada && <p className="esc-cerrada">La inscripción de esta etapa ya cerró. Consultá en la Facultad si hay una nueva.</p>}
            <h3>Cómo y cuándo inscribirse (ingreso 2027)</h3>
            <p><b>{f.ingreso.fechas}</b></p>
            <p>{f.ingreso.como}</p>
            <p><b>Curso de ingreso:</b> {f.ingreso.curso}</p>
            <a className="btn grande-btn" {...ext(f.ingreso.enlace)}>{estado(f).cerrada ? "Ver en el sitio de la Facultad" : `Inscribirme en ${f.nombre.replace("Facultad de ", "")}`} ↗</a>
            <h3>Carreras</h3>
            <ul className="esc-lista">{f.carreras.map((c) => <li key={c}>{c}</li>)}</ul>
            <a className="btn claro" {...ext(f.web)}>Sitio de la facultad ↗</a>
          </div>
        </details>
      ))}
      <div className="esc-botones">
        <a className="btn grande-btn" {...ext(URL_UNLZ.grado)}>Ver toda la oferta de grado ↗</a>
        <a className="btn claro" {...ext(URL_UNLZ.buscador)}>Buscador de carreras ↗</a>
        <a className="btn claro" {...ext(URL_UNLZ.guia)}>Guía de ingreso ↗</a>
        <BotonLlamar nombre="la UNLZ" numero="11 7091-8659" etiqueta="Llamar a la UNLZ" />
      </div>
      <small className="chico">Fuente: unlz.edu.ar y sitios de cada facultad, consultados en {REVISADO_UNLZ}. Las fechas pueden cambiar: confirmalas en el enlace de cada facultad.</small>
    </section>
  );
}

// ---- 2. Buscador de establecimientos ----
function Ficha({ e }: { e: Escuela }) {
  const estatal = e.sector === "Estatal";
  return (
    <li className="esc-ficha">
      <div className="esc-ficha-cabeza">
        <b>{e.nombre}</b>
        <span className={`esc-sector ${estatal ? "estatal" : "privada"}`}>{estatal ? "Estatal" : "Privada"}</span>
      </div>
      <div className="esc-niveles">{e.niveles.map((n) => <span key={n} className="esc-nivel">{n}</span>)}</div>
      <span className="dato"><IconoLinea nombre="ubicacion" tam={20} /> {e.direccion || "Dirección: consultar"}{e.barrio ? ` · ${e.barrio}` : ""}</span>
      <span className="dato"><IconoLinea nombre="telefono" tam={20} /> {e.telefono ? telefonoBonito(e.telefono) : "Teléfono: Consultar"}</span>
      <div className="esc-botones fila">
        {e.telefono && <BotonLlamar nombre={e.nombre} numero={telefonoBonito(e.telefono)} etiqueta="Llamar" />}
        <a className="btn claro" {...ext(mapaEscuela(e))}>Cómo llegar ↗</a>
      </div>
    </li>
  );
}

function Buscador({ lista }: { lista: Escuela[] }) {
  const [q, setQ] = useState("");
  const [nivel, setNivel] = useState<Nivel | "">("");
  const [barrio, setBarrio] = useState("");
  const [sector, setSector] = useState<"" | "Estatal" | "Privada">("");
  const [cuantas, setCuantas] = useState(POR_VEZ);
  const barrios = useMemo(() => [...new Set(lista.map((e) => e.barrio).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [lista]);
  const conteo = useMemo(() => Object.fromEntries(NIVELES.map((n) => [n, lista.filter((e) => e.niveles.includes(n)).length])), [lista]);
  const filtradas = useMemo(
    () => lista.filter((e) => (!nivel || e.niveles.includes(nivel)) && (!barrio || e.barrio === barrio) && (!sector || e.sector === sector) && buscarTexto(e, q)),
    [lista, nivel, barrio, sector, q],
  );
  useEffect(() => setCuantas(POR_VEZ), [q, nivel, barrio, sector]);
  return (
    <section className="esc-buscador" aria-label="Buscar escuelas">
      <div className="esc-insc-cabeza">
        <span className="esc-icono"><IconoLinea nombre="escuelas" tam={28} /></span>
        <div>
          <h2 className="rotulo">Establecimientos de Lomas</h2>
          <b>Jardines, escuelas, institutos y terciarios</b>
        </div>
      </div>
      <input className="esc-input" type="search" placeholder="Buscar por nombre o calle" aria-label="Buscar por nombre o calle" value={q} onChange={(x) => setQ(x.target.value)} />
      <div className="esc-chips" role="group" aria-label="Filtrar por nivel">
        <button className={`esc-chip${nivel === "" ? " activo" : ""}`} onClick={() => setNivel("")}>Todos ({lista.length})</button>
        {NIVELES.map((n) => <button key={n} className={`esc-chip${nivel === n ? " activo" : ""}`} onClick={() => setNivel(nivel === n ? "" : n)}>{n} ({conteo[n]})</button>)}
      </div>
      <div className="esc-selects">
        <label>Barrio<select value={barrio} onChange={(x) => setBarrio(x.target.value)}><option value="">Todos los barrios</option>{barrios.map((b) => <option key={b}>{b}</option>)}</select></label>
        <label>Tipo<select value={sector} onChange={(x) => setSector(x.target.value as "" | "Estatal" | "Privada")}><option value="">Estatales y privadas</option><option value="Estatal">Solo estatales</option><option value="Privada">Solo privadas</option></select></label>
      </div>
      <p className="esc-cuenta" role="status">{filtradas.length === 1 ? "1 establecimiento" : `${filtradas.length} establecimientos`}</p>
      {filtradas.length === 0 && <p className="vacio">No encontramos ninguno con esos filtros. Probá con otro nombre, nivel o barrio.</p>}
      <ul className="lista esc-resultados">{filtradas.slice(0, cuantas).map((e) => <Ficha key={e.id} e={e} />)}</ul>
      {filtradas.length > cuantas && <button className="btn claro ancho" onClick={() => setCuantas(cuantas + POR_VEZ)}>Ver más ({filtradas.length - cuantas} restantes)</button>}
    </section>
  );
}

// Pantalla "Escuelas y estudios"
export default function Escuelas() {
  const [d, setD] = useState<DatosEscuelas | null | undefined>(undefined);
  useEffect(() => { fetch("/api/escuelas").then((r) => (r.ok ? r.json() : null)).then((j) => setD(j?.escuelas ? j : null)).catch(() => setD(null)); }, []);
  return (
    <>
      <Inscripciones d={d?.inscripciones ?? INSCRIPCIONES_POR_DEFECTO} />
      <Universidad />
      {d === undefined && <p className="vacio">Cargando el listado de escuelas…</p>}
      {d === null && <p className="vacio">No se pudo cargar el listado de escuelas. Probá de nuevo en un rato.</p>}
      {d && <Buscador lista={d.escuelas} />}
      <Pie
        seccion="escuelas"
        fuente={`Padrón Oficial de Establecimientos Educativos (Ministerio de Educación de la Nación${d?.anio ? `, Relevamiento Anual ${d.anio}` : ""})${d?.actualizado ? `, cargado el ${fechaLinda(d.actualizado)}` : ""}; inscripciones: Dirección General de Cultura y Educación (abc.gob.ar)`}
        url="https://www.argentina.gob.ar/educacion/evaluacion-informacion-educativa/padron-oficial-de-establecimientos-educativos"
      />
    </>
  );
}
