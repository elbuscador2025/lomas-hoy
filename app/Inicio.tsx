"use client";
import { useEffect, useState } from "react";
import { config } from "@/lomas.config.mjs";
import {
  cargarDatos, armarNovedades, fechaLarga, hora, textoClima, nombreLindo,
  type Todo, type Fila,
} from "@/lib/datos";

const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;

function Pie({ seccion, fuente, url, fila }: { seccion: string; fuente: string; url?: string; fila?: Fila<unknown> }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [falloEnvio, setFalloEnvio] = useState(false);
  const viejo = fila?.ok_en && Date.now() - new Date(fila.ok_en).getTime() > config.horasParaAvisarDatoViejo * 3600_000;

  async function enviar() {
    try {
      const r = await fetch("/api/reporte", { method: "POST", body: JSON.stringify({ seccion, mensaje: texto }) });
      if (!r.ok) throw new Error();
      setEnviado(true);
    } catch {
      setFalloEnvio(true);
    }
  }

  return (
    <div className="pie">
      <span>
        Fuente: {url ? <a href={url} target="_blank" rel="noreferrer">{fuente}</a> : fuente}
        {fila?.ok_en && <> · Actualizado {hora(fila.ok_en)} hs</>}
      </span>
      {fila?.error && fila.ok_en && (
        <span className="aviso-pie">La última lectura falló; se muestra el dato de las {hora(fila.ok_en)} hs.</span>
      )}
      {viejo && <span className="aviso-pie">Este dato puede estar desactualizado.</span>}
      {enviado ? (
        <span>¡Gracias! Recibimos tu aviso.</span>
      ) : abierto ? (
        <span className="avisar">
          <input maxLength={300} placeholder="¿Qué está mal? (opcional)" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <button className="btn chico" onClick={enviar}>Enviar</button>
          {falloEnvio && <span className="aviso-pie">No se pudo enviar. Probá más tarde.</span>}
        </span>
      ) : (
        <button className="link" onClick={() => setAbierto(true)}>Avisar error</button>
      )}
    </div>
  );
}

function SinDatos({ fila }: { fila?: Fila<unknown> }) {
  return <p className="vacio">Sin datos por ahora.{fila?.error ? " La fuente no respondió." : ""}</p>;
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <details className="seccion" id={id}>
      <summary>{titulo}</summary>
      <div className="cuerpo">{children}</div>
    </details>
  );
}

export default function Inicio() {
  const [datos, setDatos] = useState<Todo | null>(null);
  const [sinConexion, setSinConexion] = useState(false);
  const s = config.secciones;

  useEffect(() => {
    cargarDatos().then((r) => { setDatos(r.datos); setSinConexion(r.sinConexion); });
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

  function compartir() {
    const lineas = [`*Lomas Hoy* – ${fechaLarga()}`];
    novedades.forEach((n) => lineas.push(`${n.gravedad === "grave" ? "🔴" : "🟡"} ${n.titulo}: ${n.detalle}`));
    if (normales.length) lineas.push(`✅ Sin novedades: ${normales.join(", ")}`);
    const c = d.clima?.contenido;
    if (s.clima.activa && c) lineas.push(`🌡️ ${Math.round(c.ahora.temp)}° – ${textoClima(c.ahora.codigo)}`);
    lineas.push(location.origin);
    window.open(`https://wa.me/?text=${encodeURIComponent(lineas.join("\n"))}`, "_blank");
  }

  return (
    <main className="wrap">
      <header>
        <h1>{config.nombre}</h1>
        <p className="fecha">
          {fechaLarga()} · {datos ? `${novedades.length} ${novedades.length === 1 ? "novedad" : "novedades"}` : "Cargando…"}
        </p>
        {sinConexion && <p className="offline">Sin conexión: se muestra lo último que se cargó.</p>}
      </header>

      {novedades.map((n) => (
        <article key={n.id} className={`tarjeta ${n.gravedad}`}>
          <b>{n.titulo}</b>
          <span>{n.detalle}</span>
        </article>
      ))}
      {datos && normales.length > 0 && <p className="normal">✅ Sin novedades: {normales.join(", ")}</p>}
      {datos && sinDatos.length > 0 && <p className="vacio">Sin datos por ahora: {sinDatos.join(", ")}</p>}

      {s.tren.activa && (
        <Seccion id="tren" titulo={s.tren.titulo}>
          {!d.tren?.contenido ? <SinDatos fila={d.tren} /> : d.tren.contenido.novedades.length === 0 ? (
            <p>Sin novedades en los ramales que pasan por {config.tren.estaciones.join(", ")}.</p>
          ) : (
            <ul className="lista">
              {d.tren.contenido.novedades.map((n, i) => (
                <li key={i}><b>{n.ramal}</b><br />{n.motivo}</li>
              ))}
            </ul>
          )}
          <Pie seccion="tren" fuente={config.tren.fuente} url={config.tren.url} fila={d.tren} />
        </Seccion>
      )}

      {s.luz.activa && (
        <Seccion id="luz" titulo={s.luz.titulo}>
          {!d.luz?.contenido ? <SinDatos fila={d.luz} /> : d.luz.contenido.cortes.length === 0 ? (
            <p>No hay cortes informados en {config.ciudad}.</p>
          ) : (
            <ul className="lista">
              {d.luz.contenido.cortes.map((c, i) => (
                <li key={i}>
                  <b>{nombreLindo(c.localidad ?? config.ciudad)}</b> ·{" "}
                  {c.tension === "media" ? "Media tensión" : c.tension === "baja" ? "Baja tensión" : "Corte"} ·{" "}
                  {c.usuarios} {c.usuarios === 1 ? "usuario" : "usuarios"}
                  <br />
                  {c.normalizacion ? `Normalización estimada: ${c.normalizacion.slice(11, 16)} hs` : "Sin hora estimada de normalización"}
                </li>
              ))}
            </ul>
          )}
          <Pie seccion="luz" fuente={config.luz.fuente} url={config.luz.paginaPublica} fila={d.luz} />
        </Seccion>
      )}

      {s.clima.activa && (
        <Seccion id="clima" titulo={s.clima.titulo}>
          {!d.clima?.contenido ? <SinDatos fila={d.clima} /> : (
            <>
              <p className="grande">{Math.round(d.clima.contenido.ahora.temp)}° <small>{textoClima(d.clima.contenido.ahora.codigo)}</small></p>
              <p>
                Sensación {Math.round(d.clima.contenido.ahora.sensacion)}° · Humedad {d.clima.contenido.ahora.humedad}% · Viento{" "}
                {Math.round(d.clima.contenido.ahora.viento)} km/h
              </p>
              <div className="horas">
                {d.clima.contenido.horas.map((h) => (
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

      {s.telefonos.activa && (
        <Seccion id="telefonos" titulo={s.telefonos.titulo}>
          <ul className="lista">
            {config.telefonos.lista.map((t) => (
              <li key={t.nombre} className="fila">
                <span><b>{t.nombre}</b><br />{t.numero}</span>
                <a className="btn" href={tel(t.numero)}>Llamar</a>
              </li>
            ))}
          </ul>
          <Pie seccion="telefonos" fuente={config.telefonos.fuente} />
        </Seccion>
      )}

      <button className="btn whatsapp" onClick={compartir}>Compartir por WhatsApp</button>
    </main>
  );
}
