"use client";
import { useEffect, useMemo, useState } from "react";
import { config } from "@/lomas.config.mjs";
import {
  cargarDatos, armarNovedades, clasificarTren, fechaLarga, hora, hoyMMDD, textoClima, nombreLindo,
  CATEGORIAS, ordenarLugares, distanciaKm, normalizar,
  type Todo, type Lugar,
} from "@/lib/datos";
import Pie from "./Pie";
import LugarCard from "./LugarCard";

type Coord = { lat: number; lng: number };

function Seccion({ id, icono, titulo, resumen, children }: {
  id: string; icono: string; titulo: string; resumen: string; children: React.ReactNode;
}) {
  return (
    <details className="seccion" id={id}>
      <summary>
        <span className="icono">{icono}</span>
        <span className="textos"><b>{titulo}</b><small>{resumen}</small></span>
        <span className="flecha" aria-hidden>›</span>
      </summary>
      <div className="cuerpo">{children}</div>
    </details>
  );
}

const SinDatos = ({ error }: { error?: string | null }) => (
  <p className="vacio">Sin datos por ahora.{error ? " La fuente no respondió." : ""}</p>
);

export default function Inicio() {
  const [datos, setDatos] = useState<Todo | null>(null);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [sinConexion, setSinConexion] = useState(false);
  const [yo, setYo] = useState<Coord | null>(null);
  const [errorUbicacion, setErrorUbicacion] = useState(false);
  const [q, setQ] = useState("");
  const s = config.secciones;

  useEffect(() => {
    cargarDatos().then((r) => { setDatos(r.datos); setLugares(r.lugares); setSinConexion(r.sinConexion); });
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
  }, []);

  const d: Todo = datos ?? {};
  const { novedades, normales } = armarNovedades(d, config.luz.graveDesdeUsuarios, { tren: s.tren.activa, luz: s.luz.activa });
  const sinDatos = (["tren", "luz"] as const).filter((k) => s[k].activa && !d[k]?.contenido);
  const tren = d.tren?.contenido ? clasificarTren(d.tren.contenido.novedades, hoyMMDD()) : null;

  function pedirUbicacion() {
    setErrorUbicacion(false);
    navigator.geolocation?.getCurrentPosition(
      (p) => setYo({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setErrorUbicacion(true),
    );
  }

  function compartir() {
    const lineas = [`*Lomas Hoy* – ${fechaLarga()}`];
    novedades.forEach((n) => lineas.push(`${n.gravedad === "grave" ? "🔴" : "🟡"} ${n.titulo}: ${n.detalle}`));
    if (normales.length) lineas.push(`✅ Sin novedades: ${normales.join(", ")}`);
    const c = d.clima?.contenido;
    if (s.clima.activa && c) lineas.push(`🌡️ ${Math.round(c.ahora.temp)}° – ${textoClima(c.ahora.codigo)}`);
    lineas.push(location.origin);
    window.open(`https://wa.me/?text=${encodeURIComponent(lineas.join("\n"))}`, "_blank");
  }

  const km = (l: Lugar) => (yo && l.lat != null && l.lng != null ? distanciaKm(yo, { lat: l.lat, lng: l.lng }) : undefined);

  // ---- Buscador: mira lugares, tren, luz y clima ----
  const busqueda = normalizar(q.trim());
  const resultados = useMemo(() => {
    if (!busqueda) return null;
    const palabras = busqueda.split(/\s+/);
    const coincide = (texto: string) => { const t = normalizar(texto); return palabras.every((p) => t.includes(p)); };
    const catTitulo = (id: string) => CATEGORIAS.find((c) => c.id === id)?.titulo ?? "";
    return {
      lugares: ordenarLugares(
        lugares.filter((l) => coincide([l.nombre, l.direccion, l.localidad, l.telefonos.join(" "), l.horario, catTitulo(l.categoria)].join(" "))),
        yo,
      ),
      tren: s.tren.activa ? (d.tren?.contenido?.novedades ?? []).filter((n) => coincide(`${s.tren.titulo} tren roca ${n.ramal} ${n.motivo}`)) : [],
      luz: s.luz.activa ? (d.luz?.contenido?.cortes ?? []).filter((c) => coincide(`${s.luz.titulo} luz corte edesur ${c.localidad ?? ""}`)) : [],
      clima: s.clima.activa && d.clima?.contenido && coincide(`clima tiempo temperatura lluvia ${textoClima(d.clima.contenido.ahora.codigo)}`)
        ? d.clima.contenido : null,
    };
  }, [busqueda, lugares, d.tren, d.luz, d.clima, yo]); // eslint-disable-line react-hooks/exhaustive-deps
  const hayResultados = resultados && (resultados.lugares.length || resultados.tren.length || resultados.luz.length || resultados.clima);

  const resumenTren = !d.tren?.contenido ? "Sin datos por ahora"
    : tren!.delDia.length ? `${tren!.delDia.length} ${tren!.delDia.length === 1 ? "novedad" : "novedades"} hoy`
    : tren!.obras.length ? "Sin novedades hoy · hay obras y avisos" : "Sin novedades";
  const cortes = d.luz?.contenido?.cortes ?? [];
  const localidadesLuz = [...new Set(cortes.map((c) => nombreLindo(c.localidad ?? config.ciudad)))];
  const resumenLuz = !d.luz?.contenido ? "Sin datos por ahora"
    : cortes.length === 0 ? "Sin cortes" : `${cortes.length} ${cortes.length === 1 ? "corte" : "cortes"} en ${localidadesLuz.slice(0, 2).join(", ")}${localidadesLuz.length > 2 ? "…" : ""}`;
  const c = d.clima?.contenido;
  const resumenClima = c ? `${Math.round(c.ahora.temp)}° · ${textoClima(c.ahora.codigo)}` : "Sin datos por ahora";

  return (
    <main className="wrap">
      <header>
        <h1>{config.nombre}</h1>
        <p className="fecha">
          {fechaLarga()} · {datos ? `${novedades.length} ${novedades.length === 1 ? "novedad" : "novedades"}` : "Cargando…"}
        </p>
        <label className="buscador">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <input type="search" placeholder="Buscar: farmacia, Banfield, tren…" aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {sinConexion && <p className="offline">Sin conexión: se muestra lo último que se cargó.</p>}
      </header>

      {resultados ? (
        <section aria-live="polite">
          {!hayResultados && <p className="vacio">No encontramos nada para “{q.trim()}”.</p>}
          {resultados.tren.length > 0 && (
            <div className="grupo"><h2>Tren Roca</h2>
              {resultados.tren.map((n, i) => <p key={i} className="tarjeta aviso"><b>{n.ramal}</b><span>{n.motivo}</span></p>)}
            </div>)}
          {resultados.luz.length > 0 && (
            <div className="grupo"><h2>Cortes de luz</h2>
              {resultados.luz.map((x, i) => <p key={i} className="tarjeta aviso"><b>{nombreLindo(x.localidad ?? config.ciudad)}</b><span>{x.usuarios} usuarios · {x.normalizacion ? `hasta las ${x.normalizacion.slice(11, 16)} hs` : "sin hora estimada"}</span></p>)}
            </div>)}
          {resultados.clima && (
            <div className="grupo"><h2>Clima</h2><p className="tarjeta blanca"><b>{Math.round(resultados.clima.ahora.temp)}° · {textoClima(resultados.clima.ahora.codigo)}</b></p></div>)}
          {resultados.lugares.length > 0 && (
            <div className="grupo"><h2>Urgencias y guardias</h2>
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
          {novedades.map((n) => (
            <article key={n.id} className={`tarjeta ${n.gravedad}`}>
              <b>{n.titulo}</b>
              <span>{n.detalle}</span>
            </article>
          ))}
          {datos && normales.length > 0 && <p className="normal">✅ Sin novedades: {normales.join(", ")}</p>}
          {datos && sinDatos.length > 0 && <p className="vacio">Sin datos por ahora: {sinDatos.join(", ")}</p>}

          {s.tren.activa && (
            <Seccion id="tren" icono="🚆" titulo={s.tren.titulo} resumen={resumenTren}>
              {!tren ? <SinDatos error={d.tren?.error} /> : (
                <>
                  {tren.delDia.length === 0
                    ? <p>Sin novedades hoy en los ramales que pasan por {config.tren.estaciones.join(", ")}.</p>
                    : <ul className="lista">{tren.delDia.map((n, i) => <li key={i}><b>{n.ramal}</b><br />{n.motivo}</li>)}</ul>}
                  {tren.obras.length > 0 && (
                    <div className="bloque">
                      <h3>Obras y avisos</h3>
                      <ul className="lista">{tren.obras.map((n, i) => <li key={i}><b>{n.ramal}</b><br />{n.motivo}</li>)}</ul>
                    </div>
                  )}
                </>
              )}
              <Pie seccion="tren" fuente={config.tren.fuente} url={config.tren.url} fila={d.tren} />
            </Seccion>
          )}

          {s.luz.activa && (
            <Seccion id="luz" icono="💡" titulo={s.luz.titulo} resumen={resumenLuz}>
              {!d.luz?.contenido ? <SinDatos error={d.luz?.error} /> : cortes.length === 0 ? (
                <p>No hay cortes informados en {config.ciudad}.</p>
              ) : (
                <ul className="lista">
                  {cortes.map((x, i) => (
                    <li key={i}>
                      <b>{nombreLindo(x.localidad ?? config.ciudad)}</b> ·{" "}
                      {x.tension === "media" ? "Media tensión" : x.tension === "baja" ? "Baja tensión" : "Corte"} ·{" "}
                      {x.usuarios} {x.usuarios === 1 ? "usuario" : "usuarios"}
                      <br />
                      {x.normalizacion ? `Normalización estimada: ${x.normalizacion.slice(11, 16)} hs` : "Sin hora estimada de normalización"}
                    </li>
                  ))}
                </ul>
              )}
              <Pie seccion="luz" fuente={config.luz.fuente} url={config.luz.paginaPublica} fila={d.luz} />
            </Seccion>
          )}

          {s.clima.activa && (
            <Seccion id="clima" icono="🌤️" titulo={s.clima.titulo} resumen={resumenClima}>
              {!c ? <SinDatos error={d.clima?.error} /> : (
                <>
                  <p className="grande">{Math.round(c.ahora.temp)}° <small>{textoClima(c.ahora.codigo)}</small></p>
                  <p>Sensación {Math.round(c.ahora.sensacion)}° · Humedad {c.ahora.humedad}% · Viento {Math.round(c.ahora.viento)} km/h</p>
                  <div className="horas">
                    {c.horas.map((h) => (
                      <div key={h.hora}>
                        <b>{h.hora.slice(11, 16)}</b>
                        <span>{Math.round(h.temp)}°</span>
                        <small>{textoClima(h.codigo)}</small>
                        <small>💧{h.lluvia}%</small>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <Pie seccion="clima" fuente={config.clima.fuente} url={config.clima.url} fila={d.clima} />
            </Seccion>
          )}

          {s.urgencias.activa && (
            <Seccion id="urgencias" icono="🚨" titulo={s.urgencias.titulo} resumen={lugares.length ? `${lugares.length} lugares en el partido` : "Sin datos por ahora"}>
              {lugares.length === 0 ? <SinDatos /> : (
                <>
                  {yo
                    ? <p className="vacio">Ordenado por cercanía a tu ubicación.</p>
                    : <button className="btn claro ancho" onClick={pedirUbicacion}>📍 Ordenar por cercanía</button>}
                  {errorUbicacion && <p className="aviso-pie">No pudimos obtener tu ubicación. Revisá el permiso del navegador.</p>}
                  {CATEGORIAS.map((cat) => {
                    const items = ordenarLugares(lugares.filter((l) => l.categoria === cat.id), yo);
                    if (!items.length) return null;
                    return (
                      <details key={cat.id} className="subseccion">
                        <summary><b>{cat.titulo}</b><small>{items.length}</small><span className="flecha" aria-hidden>›</span></summary>
                        <ul className="lista">{items.map((l) => <LugarCard key={l.id} lugar={l} km={km(l)} />)}</ul>
                      </details>
                    );
                  })}
                </>
              )}
            </Seccion>
          )}

          <button className="btn whatsapp" onClick={compartir}>Compartir por WhatsApp</button>
        </>
      )}
    </main>
  );
}
