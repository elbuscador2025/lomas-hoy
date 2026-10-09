"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { config } from "@/lomas.config.mjs";
import {
  cargarDatos, armarNovedades, clasificarTren, fechaLarga, hora, hoyMMDD, textoClima, nombreLindo,
  CATEGORIAS, ordenarLugares, distanciaKm, normalizar, ZONA,
  type Todo, type Lugar, type Novedad,
} from "@/lib/datos";
import { ahoraAR, esDeHoy, type AvisoPublico } from "@/lib/avisos";
import { Icono, iconoClima } from "./Iconos";
import Pie from "./Pie";
import LugarCard from "./LugarCard";

type Coord = { lat: number; lng: number };
type Tono = "ok" | "aviso" | "grave" | "neutro";
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const cuando = (a: string) =>
  new Date(`${a}:00-03:00`).toLocaleString("es-AR", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false });
const CATEGORIAS_DE: Record<string, string[]> = {
  guardias: ["guardias", "salitas"], vets: ["veterinarias"], otros: ["comisarias", "bomberos", "servicios"],
};
const TITULO_DE: Record<string, string> = {
  guardias: "Guardias y salitas", vets: "Veterinarias y salud animal", otros: "Emergencias y servicios",
};

function Tile({ icono, titulo, resumen, estado, tono, onClick }: {
  icono: string; titulo: string; resumen: string; estado: string; tono: Tono; onClick: () => void;
}) {
  return (
    <button className="tile" onClick={onClick}>
      <span className="tile-arriba">
        <span className="tile-icono"><Icono nombre={icono} tam={28} /></span>
        <span className={`pildora ${tono}`}>{estado}</span>
      </span>
      <b>{titulo}</b>
      <span className="tile-resumen">{resumen}</span>
    </button>
  );
}

function Detalle({ titulo, onVolver, children }: { titulo: string; onVolver: () => void; children: React.ReactNode }) {
  return (
    <main className="detalle">
      <div className="barra">
        <button className="volver" onClick={onVolver}><Icono nombre="volver" tam={22} ancho={2.5} /> Volver</button>
      </div>
      <div className="detalle-cuerpo">
        <h1 className="titulo-detalle">{titulo}</h1>
        {children}
      </div>
    </main>
  );
}

const SinDatos = ({ error }: { error?: string | null }) => (
  <p className="vacio">Sin datos por ahora.{error ? " La fuente no respondió." : ""}</p>
);

export default function Inicio() {
  const [datos, setDatos] = useState<Todo | null>(null);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [avisos, setAvisos] = useState<AvisoPublico[]>([]);
  const [sinConexion, setSinConexion] = useState(false);
  const [yo, setYo] = useState<Coord | null>(null);
  const [errorUbicacion, setErrorUbicacion] = useState(false);
  const [q, setQ] = useState("");
  const [vista, setVista] = useState<string | null>(null);
  const s = config.secciones;

  useEffect(() => {
    cargarDatos().then((r) => { setDatos(r.datos); setLugares(r.lugares); setAvisos(r.avisos); setSinConexion(r.sinConexion); });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    // Visita anónima: un número al azar guardado en el celu, avisado una vez por día.
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      let id = localStorage.getItem("lomas-hoy:id");
      if (!id) { id = crypto.randomUUID(); localStorage.setItem("lomas-hoy:id", id); }
      if (localStorage.getItem("lomas-hoy:visita") !== hoy) {
        fetch("/api/visita", { method: "POST", body: JSON.stringify({ id }) })
          .then((r) => { if (r.ok) localStorage.setItem("lomas-hoy:visita", hoy); })
          .catch(() => {});
      }
    } catch {}
    // "Volver" del celular cierra el detalle en vez de salir de la app.
    const alVolver = (e: PopStateEvent) => setVista(e.state?.lomasHoy ?? null);
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, []);

  const abrir = useCallback((v: string) => {
    history.pushState({ lomasHoy: v }, "");
    setVista(v);
    window.scrollTo({ top: 0 });
  }, []);
  const volver = useCallback(() => {
    if (history.state?.lomasHoy) history.back();
    else setVista(null);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [vista]);

  const d: Todo = datos ?? {};
  const { novedades } = armarNovedades(d, config.luz, { tren: s.tren.activa, luz: s.luz.activa });
  const ahora = ahoraAR();
  const avisosHoy = avisos.filter((a) => esDeHoy(a, ahora));
  const totalAlertas = novedades.length + avisosHoy.length;
  const tren = d.tren?.contenido ? clasificarTren(d.tren.contenido.novedades, hoyMMDD()) : null;
  const cortes = d.luz?.contenido?.cortes ?? [];
  const alertasLuz = novedades.filter((n) => n.vista === "luz");
  const paros = (d.colectivos?.contenido?.paros ?? []).filter((p) => Date.now() - new Date(p.fecha).getTime() <= config.colectivos.diasMaximos * 86400_000);
  const clima = d.clima?.contenido ?? null;
  const proximasHoras = clima ? clima.horas.filter((h) => h.hora > ahora.slice(0, 13) + ":00").slice(0, 5) : [];
  const avisosOrdenados = [...avisos].sort((a, b) => Number(esDeHoy(b, ahora)) - Number(esDeHoy(a, ahora)) || (a.actividad ?? a.creado).localeCompare(b.actividad ?? b.creado));
  const lugaresDe = (vistaId: string) => lugares.filter((l) => CATEGORIAS_DE[vistaId].includes(l.categoria));

  function pedirUbicacion() {
    setErrorUbicacion(false);
    navigator.geolocation?.getCurrentPosition(
      (p) => setYo({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setErrorUbicacion(true),
    );
  }

  function wsp(texto: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }
  function compartirDia() {
    const lineas = [`*Lomas Hoy* – ${capitalizar(fechaLarga())}`];
    avisosHoy.forEach((a) => lineas.push(`📢 ${a.titulo} (${a.firma})`));
    novedades.forEach((n) => lineas.push(`${n.gravedad === "grave" ? "🔴" : "🟡"} ${n.titulo}: ${n.detalle}`));
    if (!totalAlertas) lineas.push("✅ Sin alertas hoy");
    if (clima) lineas.push(`🌡️ ${Math.round(clima.ahora.temp)}° – ${textoClima(clima.ahora.codigo)}`);
    lineas.push(location.origin);
    wsp(lineas.join("\n"));
  }
  function compartirAviso(a: AvisoPublico) {
    wsp([`*${a.titulo}*`, a.firma, a.zona + (a.actividad ? ` · ${cuando(a.actividad)}` : ""), "", a.texto, a.direccion, "", location.origin].filter((x) => x !== undefined).join("\n"));
  }

  const km = (l: Lugar) => (yo && l.lat != null && l.lng != null ? distanciaKm(yo, { lat: l.lat, lng: l.lng }) : undefined);

  // ---- Buscador: mira lugares, avisos, tren, colectivos, luz y clima ----
  const busqueda = normalizar(q.trim());
  const resultados = useMemo(() => {
    if (!busqueda) return null;
    const palabras = busqueda.split(/\s+/);
    const coincide = (texto: string) => { const t = normalizar(texto); return palabras.every((p) => t.includes(p)); };
    const cat = (id: string) => CATEGORIAS.find((c) => c.id === id);
    return {
      lugares: ordenarLugares(
        lugares.filter((l) => coincide([l.nombre, l.direccion, l.localidad, l.telefonos.join(" "), l.horario, cat(l.categoria)?.titulo, cat(l.categoria)?.claves].join(" "))),
        yo,
      ),
      avisos: avisos.filter((a) => coincide(`aviso municipio ${a.titulo} ${a.texto} ${a.zona} ${a.firma} ${a.direccion}`)),
      tren: s.tren.activa ? (d.tren?.contenido?.novedades ?? []).filter((n) => coincide(`${s.tren.titulo} tren roca ${n.ramal} ${n.motivo}`)) : [],
      paros: s.colectivos.activa ? paros.filter((p) => coincide(`colectivo colectivos paro uta ${p.titular}`)) : [],
      luz: s.luz.activa ? cortes.filter((c) => coincide(`${s.luz.titulo} luz corte edesur ${nombreLindo(c.localidad ?? "")}`)) : [],
      clima: s.clima.activa && clima && coincide(`clima tiempo temperatura lluvia ${textoClima(clima.ahora.codigo)}`) ? clima : null,
    };
  }, [busqueda, lugares, avisos, d.tren, paros, cortes, clima, yo]); // eslint-disable-line react-hooks/exhaustive-deps
  const hayResultados = resultados && (resultados.lugares.length || resultados.avisos.length || resultados.tren.length || resultados.paros.length || resultados.luz.length || resultados.clima);

  // ---- Estado de cada cuadradito ----
  const hayGrave = (v: Novedad["vista"]) => novedades.some((n) => n.vista === v && n.gravedad === "grave");
  const estadoAlertas = (v: Novedad["vista"], n: number, hayDatos: boolean): [string, Tono] =>
    !hayDatos ? ["Sin datos", "neutro"] : hayGrave(v) ? ["Grave", "grave"] : n ? [plural(n, "aviso", "avisos"), "aviso"] : ["Normal", "ok"];
  const trenN = tren?.delDia.length ?? 0;
  const [trenEstado, trenTono] = estadoAlertas("tren", trenN, !!tren);
  const [luzEstado, luzTono] = estadoAlertas("luz", alertasLuz.length, !!d.luz?.contenido);
  const usuariosSinLuz = cortes.reduce((t, c) => t + c.usuarios, 0);
  const vets = lugaresDe("vets");
  const abiertas24 = vets.filter((l) => /24 hs/i.test(l.horario)).length;

  // ---- Pantallas de detalle ----
  if (vista === "clima")
    return (
      <Detalle titulo="Clima" onVolver={volver}>
        {!clima ? <SinDatos error={d.clima?.error} /> : (
          <>
            <div className="clima-detalle"><Icono nombre={iconoClima(clima.ahora.codigo)} tam={64} />
              <div><span className="temp-chica">{Math.round(clima.ahora.temp)}°</span><br />{textoClima(clima.ahora.codigo)}</div></div>
            <p>Sensación {Math.round(clima.ahora.sensacion)}° · Humedad {clima.ahora.humedad}% · Viento {Math.round(clima.ahora.viento)} km/h</p>
            <h2>Hora por hora</h2>
            <ul className="lista">
              {clima.horas.map((h) => (
                <li key={h.hora} className="fila-hora">
                  <b>{h.hora.slice(11, 16)}</b><Icono nombre={iconoClima(h.codigo)} tam={22} />
                  <span>{textoClima(h.codigo)}</span><b>{Math.round(h.temp)}°</b><small>{h.lluvia}% lluvia</small>
                </li>
              ))}
            </ul>
          </>
        )}
        <Pie seccion="clima" fuente={config.clima.fuente} url={config.clima.url} fila={d.clima} />
      </Detalle>
    );

  if (vista === "tren")
    return (
      <Detalle titulo={s.tren.titulo} onVolver={volver}>
        {!tren ? <SinDatos error={d.tren?.error} /> : (
          <>
            {tren.delDia.length === 0
              ? <p>Sin novedades hoy en los ramales que pasan por {config.tren.estaciones.join(", ")}.</p>
              : <ul className="lista">{tren.delDia.map((n, i) => <li key={i}><b>{n.ramal}</b><br />{n.motivo}</li>)}</ul>}
            {tren.obras.length > 0 && (
              <div className="bloque">
                <h2>Obras y avisos</h2>
                <ul className="lista">{tren.obras.map((n, i) => <li key={i}><b>{n.ramal}</b><br />{n.motivo}</li>)}</ul>
              </div>
            )}
          </>
        )}
        <Pie seccion="tren" fuente={config.tren.fuente} url={config.tren.url} fila={d.tren} />
      </Detalle>
    );

  if (vista === "colectivos")
    return (
      <Detalle titulo={s.colectivos.titulo} onVolver={volver}>
        {!d.colectivos?.contenido ? <SinDatos error={d.colectivos?.error} /> : (
          <>
            {paros.length === 0 ? <p>Sin paros anunciados.</p> : (
              <ul className="lista">
                {paros.map((p) => (
                  <li key={p.link} className="lugar">
                    <span className="pildora aviso">Paro anunciado</span>
                    <b>{p.titular}</b>
                    <small>{p.medio} · {new Date(p.fecha).toLocaleString("es-AR", { timeZone: ZONA, day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} hs</small>
                    <a className="btn claro" href={p.link} target="_blank" rel="noreferrer">Leer la nota en {p.medio}</a>
                  </li>
                ))}
              </ul>
            )}
            {d.colectivos.contenido.diariosSinLeer.length > 0 && (
              <p className="aviso-pie">No se pudo leer: {d.colectivos.contenido.diariosSinLeer.join(", ")}.</p>
            )}
            <p className="vacio">No hay una fuente oficial en tiempo real. Se muestran titulares de diarios con paros de colectivos del AMBA o de la provincia, de los últimos {config.colectivos.diasMaximos} días.</p>
          </>
        )}
        <Pie seccion="colectivos" fuente={config.colectivos.fuente} fila={d.colectivos} />
      </Detalle>
    );

  if (vista === "luz")
    return (
      <Detalle titulo={s.luz.titulo} onVolver={volver}>
        {!d.luz?.contenido ? <SinDatos error={d.luz?.error} /> : cortes.length === 0 ? (
          <p>No hay cortes informados en {config.ciudad}.</p>
        ) : (
          <ul className="lista">
            {cortes.map((x, i) => (
              <li key={i}>
                <b>{nombreLindo(x.localidad ?? config.ciudad)}</b> ·{" "}
                {x.tension === "media" ? "Media tensión" : x.tension === "baja" ? "Baja tensión" : "Corte"} · {plural(x.usuarios, "usuario", "usuarios")}
                <br />
                {x.normalizacion ? `Normalización estimada: ${x.normalizacion.slice(11, 16)} hs` : "Sin hora estimada de normalización"}
              </li>
            ))}
          </ul>
        )}
        <Pie seccion="luz" fuente={config.luz.fuente} url={config.luz.paginaPublica} fila={d.luz} />
      </Detalle>
    );

  if (vista === "guardias" || vista === "vets" || vista === "otros") {
    const cats = CATEGORIAS.filter((c) => CATEGORIAS_DE[vista].includes(c.id));
    return (
      <Detalle titulo={TITULO_DE[vista]} onVolver={volver}>
        {yo
          ? <p className="vacio">Ordenado por cercanía a tu ubicación.</p>
          : <button className="btn claro ancho" onClick={pedirUbicacion}><Icono nombre="pin" tam={20} /> Ordenar por cercanía</button>}
        {errorUbicacion && <p className="aviso-pie">No pudimos obtener tu ubicación. Revisá el permiso del navegador.</p>}
        {cats.map((cat) => {
          const items = ordenarLugares(lugares.filter((l) => l.categoria === cat.id), yo);
          if (!items.length) return null;
          return (
            <details key={cat.id} className="subseccion" open={cats.length === 1 || cat.id === "guardias"}>
              <summary><b>{cat.titulo}</b><small>{items.length}</small><span className="flecha" aria-hidden>›</span></summary>
              <ul className="lista">{items.map((l) => <LugarCard key={l.id} lugar={l} km={km(l)} />)}</ul>
            </details>
          );
        })}
        {lugares.length === 0 && <SinDatos />}
      </Detalle>
    );
  }

  if (vista === "avisos")
    return (
      <Detalle titulo={s.avisos.titulo} onVolver={volver}>
        {avisosOrdenados.length === 0 ? <p>Sin avisos del municipio por ahora.</p> : (
          <ul className="lista">
            {avisosOrdenados.map((a) => (
              <li key={a.id}>
                <button className="tarjeta muni" onClick={() => abrir(`aviso:${a.id}`)}>
                  <b>{a.titulo}</b>
                  <span>{a.zona}{a.actividad ? ` · ${capitalizar(cuando(a.actividad))} hs` : ""}</span>
                  <small>{a.firma}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Detalle>
    );

  if (vista?.startsWith("aviso:")) {
    const a = avisos.find((x) => x.id === vista.slice(6));
    return (
      <Detalle titulo={a?.titulo ?? "Aviso"} onVolver={volver}>
        {!a ? <p>Este aviso ya no está vigente.</p> : (
          <>
            <p className="firma">{a.firma}</p>
            <p className="vacio">{a.zona}{a.actividad ? ` · ${capitalizar(cuando(a.actividad))} hs` : ""}</p>
            <p className="texto-aviso">{a.texto}</p>
            <div className="acciones">
              {a.direccion && (
                <a className="btn claro" target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${a.direccion}, Lomas de Zamora, Buenos Aires, Argentina`)}`}>
                  Cómo llegar{a.direccion ? ` · ${a.direccion}` : ""}
                </a>
              )}
              <button className="btn whatsapp-chico" onClick={() => compartirAviso(a)}>Compartir por WhatsApp</button>
            </div>
            <Pie seccion={`aviso:${a.id}`} fuente={a.firma} />
          </>
        )}
      </Detalle>
    );
  }

  // ---- Pantalla principal ----
  return (
    <main className="home">
      <header className="azul">
        <div className="azul-fila">
          <span className="marca">Lomas Hoy</span>
          <button className="campana" aria-label="Avisos del municipio" onClick={() => abrir("avisos")}>
            <Icono nombre="campana" tam={22} />
            {avisos.length > 0 && <span className="punto" />}
          </button>
        </div>
        <button className="clima-bloque" onClick={() => abrir("clima")} aria-label="Ver detalle del clima">
          <span className="clima-fila">
            <span className="temp">{clima ? `${Math.round(clima.ahora.temp)}°` : "--°"}</span>
            <span className="clima-icono"><Icono nombre={clima ? iconoClima(clima.ahora.codigo) : "nube"} tam={84} ancho={1.6} /></span>
          </span>
          <span className="estado">{clima ? textoClima(clima.ahora.codigo) : datos ? "Sin datos del clima" : "Cargando…"}</span>
          <span className="fecha-azul">{capitalizar(fechaLarga())}</span>
          {proximasHoras.length > 0 && (
            <span className="horas-azul">
              {proximasHoras.map((h) => (
                <span key={h.hora}><small>{h.hora.slice(11, 16)}</small><b>{Math.round(h.temp)}°</b></span>
              ))}
            </span>
          )}
        </button>
      </header>

      <section className="hoja">
        <label className="buscador">
          <Icono nombre="lupa" tam={22} />
          <input type="search" placeholder="Buscar: veterinaria, Banfield, tren…" aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {sinConexion && <p className="offline">Sin conexión: se muestra lo último que se cargó.</p>}

        {resultados ? (
          <section aria-live="polite">
            {!hayResultados && <p className="vacio">No encontramos nada para “{q.trim()}”.</p>}
            {resultados.avisos.length > 0 && (
              <div className="grupo"><h2>Avisos del municipio</h2>
                {resultados.avisos.map((a) => (
                  <button key={a.id} className="tarjeta muni" onClick={() => abrir(`aviso:${a.id}`)}><b>{a.titulo}</b><small>{a.firma}</small></button>
                ))}
              </div>)}
            {resultados.tren.length > 0 && (
              <div className="grupo"><h2>Tren Roca</h2>
                {resultados.tren.map((n, i) => <p key={i} className="tarjeta aviso"><b>{n.ramal}</b><span>{n.motivo}</span></p>)}
              </div>)}
            {resultados.paros.length > 0 && (
              <div className="grupo"><h2>Colectivos</h2>
                {resultados.paros.map((p) => <p key={p.link} className="tarjeta aviso"><b>{p.titular}</b><small>{p.medio}</small></p>)}
              </div>)}
            {resultados.luz.length > 0 && (
              <div className="grupo"><h2>Cortes de luz</h2>
                {resultados.luz.map((x, i) => <p key={i} className="tarjeta aviso"><b>{nombreLindo(x.localidad ?? config.ciudad)}</b><span>{plural(x.usuarios, "usuario", "usuarios")} · {x.normalizacion ? `hasta las ${x.normalizacion.slice(11, 16)} hs` : "sin hora estimada"}</span></p>)}
              </div>)}
            {resultados.clima && (
              <div className="grupo"><h2>Clima</h2><p className="tarjeta ok"><b>{Math.round(resultados.clima.ahora.temp)}° · {textoClima(resultados.clima.ahora.codigo)}</b></p></div>)}
            {resultados.lugares.length > 0 && (
              <div className="grupo"><h2>Lugares</h2>
                <ul className="lista">{resultados.lugares.map((l) => <LugarCard key={l.id} lugar={l} km={km(l)} />)}</ul>
              </div>)}
            {!hayResultados && (
              <a className="btn grande-btn" target="_blank" rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${q.trim()} Lomas de Zamora`)}`}>
                Buscar “{q.trim()}” en Google Maps
              </a>
            )}
          </section>
        ) : (
          <>
            {totalAlertas > 0 && (
              <div className="alertas">
                <h2>{plural(totalAlertas, "alerta", "alertas")} hoy</h2>
                {avisosHoy.map((a) => (
                  <button key={a.id} className="tarjeta muni" onClick={() => abrir(`aviso:${a.id}`)}>
                    <b>{a.titulo}</b>
                    <span>{a.zona}{a.actividad ? ` · ${capitalizar(cuando(a.actividad))} hs` : ""}</span>
                    <small>{a.firma}</small>
                  </button>
                ))}
                {novedades.map((n) => (
                  <button key={n.id} className={`tarjeta ${n.gravedad}`} onClick={() => abrir(n.vista)}>
                    <b>{n.titulo}</b>
                    <span>{n.detalle}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="grilla">
              {s.tren.activa && (
                <Tile icono="tren" titulo={s.tren.titulo} estado={trenEstado} tono={trenTono} onClick={() => abrir("tren")}
                  resumen={!tren ? "Sin datos por ahora" : trenN ? tren.delDia[0].ramal : tren.obras.length ? "Sin novedades hoy · hay obras y avisos" : "Sin novedades hoy"} />
              )}
              {s.colectivos.activa && (
                <Tile icono="colectivo" titulo={s.colectivos.titulo} onClick={() => abrir("colectivos")}
                  estado={!d.colectivos?.contenido ? "Sin datos" : paros.length ? plural(paros.length, "aviso", "avisos") : "Normal"}
                  tono={!d.colectivos?.contenido ? "neutro" : paros.length ? "aviso" : "ok"}
                  resumen={!d.colectivos?.contenido ? "Sin datos por ahora" : paros.length ? "Paro anunciado" : "Sin paros anunciados"} />
              )}
              {s.luz.activa && (
                <Tile icono="luz" titulo="Luz" estado={luzEstado} tono={luzTono} onClick={() => abrir("luz")}
                  resumen={!d.luz?.contenido ? "Sin datos por ahora" : cortes.length === 0 ? "Sin cortes" : `${plural(cortes.length, "corte", "cortes")} · ${plural(usuariosSinLuz, "usuario", "usuarios")}`} />
              )}
              {s.urgencias.activa && (
                <>
                  <Tile icono="guardia" titulo="Guardias y salitas" estado={plural(lugaresDe("guardias").length, "lugar", "lugares")} tono="neutro" onClick={() => abrir("guardias")}
                    resumen="Hospitales, guardias y centros de salud" />
                  <Tile icono="patita" titulo="Veterinarias" estado={plural(vets.length, "lugar", "lugares")} tono="neutro" onClick={() => abrir("vets")}
                    resumen={abiertas24 ? `${plural(abiertas24, "abierta", "abiertas")} las 24 hs` : "Veterinarias y salud animal"} />
                </>
              )}
              {s.avisos.activa && (
                <Tile icono="megafono" titulo="Avisos del municipio" estado={avisos.length ? String(avisos.length) : "Sin avisos"} tono={avisos.length ? "ok" : "neutro"}
                  onClick={() => abrir("avisos")} resumen={avisos.length ? `${plural(avisos.length, "aviso vigente", "avisos vigentes")}` : "Nada por ahora"} />
              )}
              {s.urgencias.activa && (
                <Tile icono="escudo" titulo="Emergencias y servicios" estado={plural(lugaresDe("otros").length, "número", "números")} tono="neutro" onClick={() => abrir("otros")}
                  resumen="Policía, bomberos y reclamos" />
              )}
            </div>
            <button className="btn whatsapp" onClick={compartirDia}>Compartir por WhatsApp</button>
          </>
        )}
      </section>
    </main>
  );
}
