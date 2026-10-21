"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { config } from "@/lomas.config.mjs";
import {
  cargarDatos, armarNovedades, type Anses, clasificarTren, fechaLarga, hora, hoyMMDD, nombreLindo, proximasHoras,
  CATEGORIAS, ordenarLugares, distanciaKm, distanciaTexto, normalizar, mapaBusqueda, mapaBuscador, ZONA,
  type Todo, type Lugar, type Novedad,
} from "@/lib/datos";
import { ahoraAR } from "@/lib/avisos";
import { Icono } from "./Iconos";
import Pie from "./Pie";
import LugarCard from "./LugarCard";
import Notificaciones, { CartelInstalar, CartelAvisos, PreguntaLocalidad } from "./Notificaciones";
import MisAvisos, { useAvisos } from "./MisAvisos";
import MapaLuz from "./MapaLuz";
import { transporteDe, luzEnZona, estadoEnUnaFrase } from "@/lib/transporte";
import { mismaLocalidad } from "@/lib/localidades";
import { MascotaCard, ListaMascotas, FormularioMascota } from "./Mascotas";
import { ListaTrabajo, FormularioTrabajo } from "./Trabajo";
import { TrabajoCard } from "./Trabajo";
import { ListaTrueque, FormularioTrueque, FormularioFeria, PublicacionCard, FeriaCard } from "./Trueque";
import { avisosDeFeriado } from "@/lib/feriados";
import { resumenAnses, terminaciones, fechaPago, URL_ANSES } from "@/lib/anses";
import { esNueva, type MascotaPublica } from "@/lib/mascotas-comun";
import { esNuevaTrueque, type TruequePublico } from "@/lib/trueque-comun";
import { esNuevaTrabajo, type PublicacionTrabajo } from "@/lib/trabajo-comun";
import { usePush } from "./usePush";

type Coord = { lat: number; lng: number };
type Tono = "ok" | "aviso" | "grave" | "neutro";
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const CATEGORIAS_DE: Record<string, string[]> = {
  guardias: ["guardias", "salitas"], vets: ["veterinarias"], otros: ["comisarias", "bomberos", "servicios"],
};
const TITULO_DE: Record<string, string> = {
  guardias: "Guardias y salitas", vets: "Veterinarias y salud animal", otros: "Emergencias y servicios",
};

function Tile({ icono, titulo, resumen, estado, tono, onClick, color }: {
  color: string; icono: string; titulo: string; resumen: React.ReactNode; estado: string; tono: Tono; onClick: () => void;
}) {
  return (
    <button className={`tile coloreado c-${color}`} onClick={onClick}>
      <span className="tile-arriba">
        <span className="tile-icono"><Icono nombre={icono} tam={28} /></span>
        <span className={`pildora ${tono}`}>{estado}</span>
      </span>
      <b>{titulo}</b>
      <span className="tile-resumen">{resumen}</span>
    </button>
  );
}

function Detalle({ titulo, onVolver, color, children }: { titulo: string; onVolver: () => void; color?: string; children: React.ReactNode }) {
  return (
    <main className={`detalle${color ? ` coloreado c-${color}` : ""}`}>
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

const TEXTO_FARMACIAS = "En feriados y de noche, llamá antes de ir: en el mapa tocá la farmacia y después “Llamar”.";

const SinDatos = ({ error }: { error?: string | null }) => (
  <p className="vacio">Sin datos por ahora.{error ? " La fuente no respondió." : ""}</p>
);

export default function Inicio() {
  const [datos, setDatos] = useState<Todo | null>(null);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [mascotas, setMascotas] = useState<MascotaPublica[]>([]);
  const [trueque, setTrueque] = useState<TruequePublico>({ publicaciones: [], ferias: [] });
  const [trabajo, setTrabajo] = useState<PublicacionTrabajo[]>([]);
  const [anses, setAnses] = useState<Anses>({ entradas: [], actualizado: null });
  const [sinConexion, setSinConexion] = useState(false);
  const [yo, setYo] = useState<Coord | null>(null);
  const [errorUbicacion, setErrorUbicacion] = useState(false);
  const [q, setQ] = useState("");
  const [vista, setVista] = useState<string | null>(null);
  const push = usePush();
  const avisosApp = useAvisos();
  const [panel, setPanel] = useState<string | null>(null); // adónde lleva el enlace del pie: mi panel
  const s = config.secciones;

  useEffect(() => {
    cargarDatos().then((r) => { setDatos(r.datos); setLugares(r.lugares); setMascotas(r.mascotas); setTrueque(r.trueque); setTrabajo(r.trabajo); setAnses(r.anses); setSinConexion(r.sinConexion); });
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
    // Al volver a la app después de un rato, se piden los datos de nuevo (el clima se renueva solo en el servidor).
    let ultima = Date.now();
    const alVolverAVer = () => {
      if (document.visibilityState === "visible" && Date.now() - ultima > 3 * 60_000) {
        ultima = Date.now();
        cargarDatos().then((r) => { setDatos(r.datos); setLugares(r.lugares); setMascotas(r.mascotas); setTrueque(r.trueque); setTrabajo(r.trabajo); setAnses(r.anses); setSinConexion(r.sinConexion); });
      }
    };
    document.addEventListener("visibilitychange", alVolverAVer);
    fetch("/api/sesion").then((r) => r.json()).then((s) => setPanel(s.destino)).catch(() => {});
    // Si venís de una notificación (/?v=tren), se abre directo en esa sección; "Volver" te lleva al inicio.
    const directo = new URLSearchParams(location.search).get("v");
    if (directo) {
      history.replaceState({}, "", "/");
      history.pushState({ lomasHoy: directo }, "");
      setVista(directo);
    }
    // Si la persona ya había dado permiso de ubicación, se usa para mostrar distancias (sin volver a preguntar).
    navigator.permissions?.query({ name: "geolocation" }).then((p) => {
      if (p.state === "granted") navigator.geolocation.getCurrentPosition((g) => setYo({ lat: g.coords.latitude, lng: g.coords.longitude }), () => {});
    }).catch(() => {});
    // "Volver" del celular cierra el detalle (o la búsqueda) en vez de salir de la app.
    const alVolver = (e: PopStateEvent) => {
      const v = e.state?.lomasHoy;
      if (v === "buscar") setVista(null); // de una sección a los resultados de la búsqueda
      else { setVista(v ?? null); if (!v) setQ(""); } // de la búsqueda (o de una sección) a la pantalla principal
    };
    window.addEventListener("popstate", alVolver);
    return () => { window.removeEventListener("popstate", alVolver); document.removeEventListener("visibilitychange", alVolverAVer); };
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

  // Al empezar a escribir se anota un paso en el historial: el "atrás" del celular cierra la búsqueda en vez de salir de la app.
  const cambiarBusqueda = (texto: string) => {
    if (!q.trim() && texto.trim() && history.state?.lomasHoy !== "buscar") history.pushState({ lomasHoy: "buscar" }, "");
    setQ(texto);
    if (q.trim() && !texto.trim() && history.state?.lomasHoy === "buscar") history.back();
  };
  const cerrarBusqueda = () => {
    if (history.state?.lomasHoy === "buscar") history.back(); // el aviso del historial vuelve a poner el texto en blanco
    else setQ("");
    window.scrollTo({ top: 0 });
  };

  const d: Todo = datos ?? {};
  const aguaVisible = !!d.agua; // el servidor solo manda "agua" si el interruptor del panel está prendido
  const botonVolverInicio = <button className="btn claro ancho" onClick={cerrarBusqueda}>Volver al inicio</button>;
  const { novedades } = armarNovedades(d, config.luz, { tren: s.tren.activa, luz: s.luz.activa });
  const ahora = ahoraAR();
  const totalAlertas = novedades.length;
  const tren = d.tren?.contenido ? clasificarTren(d.tren.contenido.novedades, hoyMMDD()) : null;
  const cortes = d.luz?.contenido?.cortes ?? [];
  const alertasLuz = novedades.filter((n) => n.vista === "luz");
  const paros = (d.colectivos?.contenido?.paros ?? []).filter((p) => Date.now() - new Date(p.fecha).getTime() <= config.colectivos.diasMaximos * 86400_000);
  const clima = d.clima?.contenido ?? null;
  const programados = (d.programados?.contenido?.cortes ?? []).filter((c) => c.fin >= ahora).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const diaCorto = (f: string) => capitalizar(new Date(`${f}T12:00:00-03:00`).toLocaleDateString("es-AR", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" }).replace(",", ""));
  const horaCorte = (f: string) => f.slice(11, 16);
  const horaCorta = (f: string) => { const [h, m] = f.slice(11, 16).split(":"); return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`; }; // 18:00 → "18"
  // Agua: cortes en curso (cargados a mano), próximos y notas de diarios (sin horario) de los últimos días
  const aguaTodos = (d.agua?.contenido?.cortes ?? []).filter((c) => (c.hasta ? c.hasta >= ahora : Date.now() - new Date(c.fecha).getTime() <= config.agua.diasMaximos * 86400_000));
  const aguaAhora = aguaTodos.filter((c) => c.desde && c.desde <= ahora).sort((a, b) => (a.hasta ?? "").localeCompare(b.hasta ?? ""));
  const aguaProx = aguaTodos.filter((c) => c.desde && c.desde > ahora).sort((a, b) => (a.desde ?? "").localeCompare(b.desde ?? ""));
  const aguaNotas = aguaTodos.filter((c) => !c.desde);
  const [aguaEstado, aguaTono, aguaResumen]: [string, Tono, string] = !d.agua?.contenido ? ["Sin datos", "neutro", "Sin cortes informados"]
    : aguaAhora.length ? [plural(aguaAhora.length, "corte", "cortes"), "aviso", `Corte en ${aguaAhora[0].localidad}${aguaAhora[0].hasta ? ` hasta las ${horaCorta(aguaAhora[0].hasta)} hs` : ""}${aguaAhora.length > 1 ? ` y ${aguaAhora.length - 1} más` : ""}`]
    : aguaProx.length ? ["Programado", "aviso", `Corte en ${aguaProx[0].localidad}: ${diaCorto((aguaProx[0].desde ?? "").slice(0, 10))}, desde las ${horaCorta(aguaProx[0].desde ?? "")} hs`]
    : aguaNotas.length ? ["Aviso", "aviso", `Nota de ${aguaNotas[0].fuente}: corte en ${aguaNotas[0].localidad}`]
    : ["Normal", "ok", "Sin cortes informados"];
  const nombreDiaCorto = (f: string) => capitalizar(new Date(`${f}T12:00:00-03:00`).toLocaleDateString("es-AR", { timeZone: ZONA, weekday: "short", day: "numeric" }).replace(/[.,]/g, ""));
  const hoyDia = clima?.porDia?.find((x) => x.fecha === ahora.slice(0, 10)) ?? clima?.porDia?.[0];
  const maxMin = hoyDia ? { max: Math.round(hoyDia.max), min: Math.round(hoyDia.min) } : null;
  const transp = transporteDe(d);
  const hAR = Number(ahora.slice(11, 13));
  const saludo = hAR >= 6 && hAR < 12 ? "Buen día" : hAR >= 12 && hAR < 20 ? "Buenas tardes" : "Buenas noches";
  const estadoFrase = estadoEnUnaFrase(transp, luzEnZona(d, push.prefs.localidad, ahora));
  const filaHoras = clima ? proximasHoras(clima, ahora) : [];
  const hoyStr = ahora.slice(0, 10);
  const nuevasMascotas = mascotas.filter((m) => esNueva(m, config.mascotas.diasNuevas)).length;
  const rAnses = resumenAnses(anses.entradas, hoyStr);
  const nuevasTrabajo = trabajo.filter((p) => esNuevaTrabajo(p, config.trabajo.diasNuevas)).length;
  const nuevasTrueque = trueque.publicaciones.filter((p) => esNuevaTrueque(p, config.trueque.diasNuevas)).length;
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
    novedades.forEach((n) => lineas.push(`${n.gravedad === "grave" ? "🔴" : "🟡"} ${n.titulo}: ${n.detalle}`));
    if (!totalAlertas) lineas.push("✅ Sin alertas hoy");
    if (clima) lineas.push(`🌡️ ${Math.round(clima.ahora.temp)}° – ${clima.ahora.etiqueta}`);
    lineas.push(location.origin);
    wsp(lineas.join("\n"));
  }

  // Tocar un aviso guardado lleva a su sección (o a la pantalla principal)
  function irA(url: string) {
    const v = new URL(url, location.origin).searchParams.get("v");
    if (v && v !== "avisos") abrir(v); else volver();
  }

  const km = (l: Lugar) => (yo && l.lat != null && l.lng != null ? distanciaKm(yo, { lat: l.lat, lng: l.lng }) : undefined);

  // ---- Buscador: mira lugares, tren, colectivos, luz y clima ----
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
      trueque: s.trueque.activa ? trueque.publicaciones.filter((p) => coincide(`trueque cambio ${p.ofrezco} ${p.busco} ${p.categoria} ${p.barrio}`)) : [],
      trabajo: s.trabajo.activa ? trabajo.filter((p) => coincide(`trabajo empleo changa ofrezco busco ${p.texto} ${p.rubro} ${p.barrio} ${p.horario}`)) : [],
      ferias: s.trueque.activa ? trueque.ferias.filter((f) => coincide(`trueque feria ferias de trueque ${f.lugar} ${f.direccion} ${f.barrio} ${f.dias}`)) : [],
      tren: s.tren.activa ? (d.tren?.contenido?.novedades ?? []).filter((n) => coincide(`${s.tren.titulo} tren roca ${n.ramal} ${n.motivo}`)) : [],
      paros: s.colectivos.activa ? paros.filter((p) => coincide(`colectivo colectivos paro uta ${p.titular}`)) : [],
      programados: s.luz.activa ? programados.filter((c) => coincide(`corte programado luz edesur ${c.localidad} ${c.motivo}`)) : [],
      luz: s.luz.activa ? cortes.filter((c) => coincide(`${s.luz.titulo} luz corte edesur ${nombreLindo(c.localidad ?? "")}`)) : [],
      mascotas: s.mascotas.activa ? mascotas.filter((m) => coincide(`mascota mascotas perdida perdido encontrada encontrado ${m.especie} ${m.barrio} ${m.descripcion}`)) : [],
      agua: s.agua.activa && aguaVisible && coincide("agua aysa corte cortes de agua"),
      anses: s.anses.activa && coincide("anses cobran cobro hoy cobran jubilacion jubilaciones jubilados pension auh asignacion"),
      farmacias: s.farmacias.activa && coincide("farmacia farmacias turno turnos de turno remedios medicamentos"),
      clima: s.clima.activa && clima && coincide(`clima tiempo temperatura lluvia ${clima.ahora.etiqueta} ${clima.dias.map((d) => d.etiqueta).join(" ")}`) ? clima : null,
    };
  }, [busqueda, lugares, mascotas, trueque, trabajo, rAnses.texto, d.tren, paros, cortes, programados, clima, yo]); // eslint-disable-line react-hooks/exhaustive-deps
  const hayResultados = resultados && (resultados.lugares.length || resultados.trueque.length || resultados.trabajo.length || resultados.ferias.length || resultados.tren.length || resultados.paros.length || resultados.luz.length || resultados.programados.length || resultados.mascotas.length || resultados.agua || resultados.anses || resultados.farmacias || resultados.clima);

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
  const centroLomas = { lat: config.clima.latitud, lng: config.clima.longitud }; // el partido de Lomas de Zamora
  const mapaFarmacias = mapaBusqueda("farmacias abiertas ahora", yo, centroLomas, config.ciudad);

  // ---- Pantallas de detalle ----
  if (vista === "clima") {
    const a = clima?.ahora;
    return (
      <Detalle titulo="Clima" onVolver={volver}>
        {!clima || !a ? <SinDatos error={d.clima?.error} /> : (
          <>
            <div className="bloque-azul">
              <p className="fecha-azul">{capitalizar(fechaLarga())}</p>
              {filaHoras.length > 0 && (
                <span className="horas-azul">
                  {filaHoras.map((h) => (
                    <span key={h.hora} className={h.hora === "Ahora" ? "ahora" : ""}>
                      <small>{h.hora === "Ahora" ? "Ahora" : h.hora.slice(11, 16)}</small>
                      <Icono nombre={h.icono} tam={22} />
                      <b>{Math.round(h.temp)}°</b>
                      {h.lluvia != null && h.lluvia >= 30 ? <small className="lluvia"><Icono nombre="gota" tam={11} ancho={2.4} />{h.lluvia}%</small> : <small className="lluvia">&nbsp;</small>}
                    </span>
                  ))}
                </span>
              )}
            </div>
            <div className="clima-detalle"><Icono nombre={a.icono} tam={64} />
              <div><span className="temp-chica">{Math.round(a.temp)}°</span><br />{a.etiqueta}</div></div>
            {clima.frase && <p className="frase">{clima.frase}</p>}
            <p className="vacio">
              {a.medidoEn ? `Medido en ${a.estacion} a las ${a.medidoEn} · SMN${d.clima?.ok_en ? ` · Actualizado ${hora(d.clima.ok_en)}` : ""}` : "Estimado por Open-Meteo (no hay una medición reciente del SMN)"}
            </p>
            <p>
              {[a.sensacion != null && `Sensación ${Math.round(a.sensacion)}°`, a.humedad != null && `Humedad ${a.humedad}%`, a.viento != null && `Viento ${Math.round(a.viento)} km/h`]
                .filter(Boolean).join(" · ")}
            </p>
            <h2>Próximas 24 horas</h2>
            <ul className="lista">
              {filaHoras.map((h) => (
                <li key={h.hora} className="fila-hora">
                  <b>{h.hora === "Ahora" ? "Ahora" : h.hora.slice(11, 16)}</b><Icono nombre={h.icono} tam={22} />
                  <span>{h.etiqueta}</span><b>{Math.round(h.temp)}°</b>
                  <small className="detalle-hora">
                    {[h.lluvia != null ? `Lluvia ${h.lluvia}%` : null, h.viento != null ? `Viento ${Math.round(h.viento)} km/h` : null, h.sensacion != null ? `Sensación ${Math.round(h.sensacion)}°` : null]
                      .filter(Boolean).join(" · ")}
                  </small>
                </li>
              ))}
            </ul>
            <h2>Próximos 5 días</h2>
            <ul className="lista">
              {clima.dias.map((x) => (
                <li key={x.fecha} className="fila-dia tocable" role="button" tabIndex={0} onClick={() => abrir(`dia:${x.fecha}`)} onKeyDown={(e) => e.key === "Enter" && abrir(`dia:${x.fecha}`)}>
                  <b>{capitalizar(new Date(`${x.fecha}T12:00:00-03:00`).toLocaleDateString("es-AR", { timeZone: ZONA, weekday: "long", day: "numeric" }).replace(",", ""))}</b>
                  <Icono nombre={x.icono} tam={22} /><span>{x.palabra}</span>
                  <b>{Math.round(x.max)}° / {Math.round(x.min)}°</b>
                </li>
              ))}
            </ul>
            <p className="vacio">Pronóstico para {config.ciudad}. Fuente: SMN y Open-Meteo.</p>
          </>
        )}
        <Pie seccion="clima" fuente={config.clima.fuente} url={config.clima.url} fila={d.clima} minutosViejo={config.clima.minutosParaAvisarViejo} />
      </Detalle>
    );
  }

  if (vista?.startsWith("dia:")) {
    const lista = clima?.porDia ?? [];
    const i = lista.findIndex((x) => x.fecha === vista.slice(4));
    const dia = lista[i];
    if (!dia) return <Detalle titulo="Clima" onVolver={volver}><SinDatos error={d.clima?.error} /></Detalle>;
    const irADia = (k: number) => { if (k < 0 || k >= lista.length) return; const v = `dia:${lista[k].fecha}`; history.replaceState({ lomasHoy: v }, ""); setVista(v); };
    const esHoy = dia.fecha === hoyStr;
    const horasDia = esHoy ? dia.horas.filter((h) => h.hora.slice(0, 13) >= ahora.slice(0, 13)) : dia.horas;
    const frase = esHoy ? (clima?.frase ?? dia.frase) : dia.frase;
    let x0 = 0, y0 = 0;
    return (
      <Detalle titulo={capitalizar(new Date(`${dia.fecha}T12:00:00-03:00`).toLocaleDateString("es-AR", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" }).replace(",", ""))} onVolver={volver}>
        <div onTouchStart={(e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }}
          onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; if (Math.abs(dx) > 60 && Math.abs(dy) < 40) irADia(i + (dx < 0 ? 1 : -1)); }}>
          <div className="navegar-dia">
            <button className="btn claro" disabled={i === 0} onClick={() => irADia(i - 1)} aria-label="Día anterior">‹ Anterior</button>
            <button className="btn claro" disabled={i === lista.length - 1} onClick={() => irADia(i + 1)} aria-label="Día siguiente">Siguiente ›</button>
          </div>
          <div className="clima-detalle"><Icono nombre={dia.icono} tam={64} />
            <div><span className="temp-chica">{Math.round(dia.max)}°</span> <small>/ {Math.round(dia.min)}°</small><br />Máxima y mínima</div></div>
          {frase && <p className="frase">{frase}</p>}
          <h2>Hora por hora</h2>
          <ul className="lista">
            {horasDia.map((h) => (
              <li key={h.hora} className="fila-hora">
                <b>{h.hora.slice(11, 16)}</b><Icono nombre={h.icono} tam={22} />
                <span>{h.lluvia != null ? `Lluvia ${h.lluvia}%` : "—"}</span><b>{h.temp}°</b>
                <small className="detalle-hora">{[h.viento != null ? `Viento ${h.viento} km/h` : null, h.sensacion != null ? `Sensación ${h.sensacion}°` : null].filter(Boolean).join(" · ")}</small>
              </li>
            ))}
          </ul>
          <p className="vacio">Pronóstico para {config.ciudad}. Fuente: Open-Meteo.</p>
        </div>
      </Detalle>
    );
  }

  if (vista === "subte") {
    const lineas = d.subte?.contenido?.lineas ?? [];
    const fechaDesde = (iso: string) => new Date(iso).toLocaleString("es-AR", { timeZone: ZONA, day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false });
    return (
      <Detalle color="subte" titulo="Subte" onVolver={volver}>
        {!d.subte?.contenido ? <p className="vacio">Sin datos por ahora.</p> : (
          <ul className="lista">
            {lineas.map((l) => (
              <li key={l.id} className="lugar">
                <span className={`pildora ${l.estado === "normal" ? "ok" : l.estado === "demora" ? "aviso" : "grave"}`}>
                  {l.estado === "normal" ? "Normal" : l.estado === "demora" ? "Demoras" : l.estado === "paro" ? "Paro" : "Interrumpida"}
                </span>
                <b>{l.id === "Premetro" ? "Premetro" : `Línea ${l.id}`}</b>
                {l.estado !== "normal" && (
                  <>
                    <span>{l.texto || "Sin más detalles"}</span>
                    <small>Afecta a: {l.id === "Premetro" ? "el Premetro" : `la línea ${l.id}`}{l.desde ? ` · Desde: ${fechaDesde(l.desde)} hs` : ""}</small>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <Pie seccion="subte" fuente={config.subte.fuente} url={config.subte.paginaPublica} fila={d.subte} />
      </Detalle>
    );
  }

  if (vista === "tren")
    return (
      <Detalle color="tren" titulo={s.tren.titulo} onVolver={volver}>
        {!tren ? <SinDatos error={d.tren?.error} /> : (
          <>
            {tren.delDia.length === 0
              ? <p>Sin novedades hoy en los ramales que pasan por {config.tren.estaciones.join(", ")}.</p>
              : <ul className="lista">{tren.delDia.map((n, i) => <li key={i}><b>{n.ramal}</b><br />{n.motivo}{n.desde && <><br /><small>Desde el {n.desde.slice(3, 5)}/{n.desde.slice(0, 2)}</small></>}</li>)}</ul>}
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
      <Detalle color="colectivos" titulo={s.colectivos.titulo} onVolver={volver}>
        {!d.colectivos?.contenido ? <SinDatos error={d.colectivos?.error} /> : (
          <>
            {paros.length === 0 ? <p>Sin paros anunciados.</p> : (
              <ul className="lista">
                {paros.map((p) => (
                  <li key={p.link} className="lugar">
                    <span className="pildora aviso">Paro anunciado</span>
                    <b>{p.resumen ?? p.titular}</b>
                    <span>{p.titular}</span>
                    <small>Afecta a: {p.alcance ?? "colectivos del AMBA"}</small>
                    <small>Desde: {p.medio} · {new Date(p.fecha).toLocaleString("es-AR", { timeZone: ZONA, day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} hs</small>
                    <a className="btn claro" href={p.link} target="_blank" rel="noreferrer">Leer la nota en {p.medio}</a>
                  </li>
                ))}
              </ul>
            )}
            {d.colectivos.contenido.diariosSinLeer.length > 0 && (
              <p className="aviso-pie">No se pudo leer: {d.colectivos.contenido.diariosSinLeer.join(", ")}.</p>
            )}
            <p className="vacio">No hay una fuente oficial en tiempo real. Se muestran titulares de diarios con paros y medidas de fuerza de colectivos de todo el AMBA (Capital Federal y Gran Buenos Aires), de los últimos {config.colectivos.diasMaximos} días.</p>
          </>
        )}
        <Pie seccion="colectivos" fuente={config.colectivos.fuente} fila={d.colectivos} />
      </Detalle>
    );

  if (vista === "luz") {
    const miLoc = push.prefs.localidad;
    const suyos = (l: string | null) => mismaLocalidad(miLoc, l);
    const cortesOrden = [...cortes].sort((a, b) => Number(suyos(b.localidad)) - Number(suyos(a.localidad)));
    const programadosOrden = [...programados].sort((a, b) => Number(suyos(b.localidad)) - Number(suyos(a.localidad)));
    return (
      <Detalle color="luz" titulo={s.luz.titulo} onVolver={volver}>
        {!d.luz?.contenido ? <SinDatos error={d.luz?.error} /> : cortes.length === 0 ? (
          <p>{programados.length === 0 ? "Sin cortes en Lomas." : "No hay cortes en este momento."}</p>
        ) : (
          <ul className="lista">
            {cortesOrden.map((x, i) => (
              <li key={i}>
                {suyos(x.localidad) && <span className="pildora aviso">Tu zona</span>}{" "}
                <b>{nombreLindo(x.localidad ?? config.ciudad)}</b> ·{" "}
                {x.tension === "media" ? "Media tensión" : x.tension === "baja" ? "Baja tensión" : "Corte"} · {plural(x.usuarios, "usuario", "usuarios")}
                <br />
                {x.normalizacion ? `Normalización estimada: ${x.normalizacion.slice(11, 16)} hs` : "Sin hora estimada de normalización"}
              </li>
            ))}
          </ul>
        )}
        <MapaLuz cortes={cortes} programados={programados} />
        <Pie seccion="luz" fuente={config.luz.fuente} url={config.luz.paginaPublica} fila={d.luz} />
        {config.programados.activa && (
          <div className="bloque">
            <h2>Cortes programados</h2>
            {!d.programados?.contenido ? <SinDatos error={d.programados?.error} /> : programados.length === 0 ? (
              <p>No hay cortes programados para los próximos días.</p>
            ) : (
              <ul className="lista">
                {programadosOrden.map((c) => (
                  <li key={c.id + c.inicio}>
                    {suyos(c.localidad) && <span className="pildora aviso">Tu zona</span>}{" "}
                    <b>{c.localidad}</b>
                    <br />
                    {c.inicio.slice(0, 10) === c.fin.slice(0, 10)
                      ? `${diaCorto(c.inicio.slice(0, 10))}, de ${horaCorte(c.inicio)} a ${horaCorte(c.fin)} hs`
                      : `Desde el ${diaCorto(c.inicio.slice(0, 10))} a las ${horaCorte(c.inicio)} hasta el ${diaCorto(c.fin.slice(0, 10))} a las ${horaCorte(c.fin)} hs`}
                    <br /><small>{c.clientes != null ? `${plural(c.clientes, "cliente", "clientes")} · ` : ""}{c.motivo}</small>
                    {c.lat != null && c.lng != null && (
                      <div className="acciones">
                        {yo && <small className="distancia">El corte está {distanciaTexto(distanciaKm(yo, { lat: c.lat, lng: c.lng }))} de vos</small>}
                        <a className="btn claro" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`}>Ver la zona en el mapa</a>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!yo && programados.some((c) => c.lat != null) && (
              <button className="btn claro ancho" onClick={pedirUbicacion}><Icono nombre="pin" tam={20} /> Ver a qué distancia está de mí</button>
            )}
            {errorUbicacion && <p className="aviso-pie">No pudimos obtener tu ubicación. Revisá el permiso del navegador.</p>}
            <p className="vacio">Horario estimado, según Edesur. Puede reprogramarse. El mapa marca el punto que informa Edesur; la zona afectada puede ser más grande.</p>
            <Pie seccion="luz" fuente={config.programados.fuente} url={config.programados.paginaPublica} fila={d.programados} />
          </div>
        )}
      </Detalle>
    );
  }

  if (vista === "agua" && aguaVisible) {
    const cuandoAgua = (c: { desde: string | null; hasta: string | null }) => !c.desde || !c.hasta ? "Sin horario informado"
      : c.desde.slice(0, 10) === c.hasta.slice(0, 10)
        ? `${diaCorto(c.desde.slice(0, 10))}, de ${horaCorte(c.desde)} a ${horaCorte(c.hasta)} hs`
        : `Desde el ${diaCorto(c.desde.slice(0, 10))} a las ${horaCorte(c.desde)} hasta el ${diaCorto(c.hasta.slice(0, 10))} a las ${horaCorte(c.hasta)} hs`;
    const fechaCarga = (iso: string) => new Date(iso).toLocaleString("es-AR", { timeZone: ZONA, day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false });
    return (
      <Detalle color="agua" titulo={s.agua.titulo} onVolver={volver}>
        {!d.agua?.contenido ? <SinDatos error={d.agua?.error} /> : aguaTodos.length === 0 ? (
          <p>Sin cortes informados.</p>
        ) : (
          <ul className="lista">
            {[...aguaAhora, ...aguaProx, ...aguaNotas].map((c) => (
              <li key={c.id} className="lugar">
                <b>{c.localidad}</b>
                <span>{c.desde ? c.zona : `“${c.zona}”`}</span>
                <small>{cuandoAgua(c)}{c.motivo ? ` · ${c.motivo}` : ""}</small>
                <small>Fuente: {c.fuente} · {c.desde ? "Cargado" : "Publicado"} el {fechaCarga(c.fecha)} hs</small>
                {c.link && <a className="btn claro" href={c.link} target="_blank" rel="noreferrer">Leer la nota en {c.fuente}</a>}
              </li>
            ))}
          </ul>
        )}
        {d.agua?.contenido && d.agua.contenido.diariosSinLeer.length > 0 && (
          <p className="aviso-pie">No se pudo leer: {d.agua.contenido.diariosSinLeer.join(", ")}.</p>
        )}
        <p className="vacio">AySA no publica los cortes en una fuente que se pueda leer sola. Acá se muestran los que cargamos a mano y las notas de diarios que nombran un corte de agua en Lomas o sus localidades. Para saber si tu domicilio está afectado, consultá en AySA.</p>
        <a className="btn claro ancho" target="_blank" rel="noreferrer" href={config.agua.paginaPublica}>Consultar en AySA</a>
        <Pie seccion="agua" fuente={config.agua.fuente} fila={d.agua} />
      </Detalle>
    );
  }

  if (vista === "mascotas")
    return (
      <Detalle color="mascotas" titulo={s.mascotas.titulo} onVolver={volver}>
        <ListaMascotas mascotas={mascotas} onPublicar={() => abrir("mascotas-publicar")} />
      </Detalle>
    );

  if (vista === "mascotas-publicar")
    return (
      <Detalle color="mascotas" titulo="Publicar" onVolver={volver}>
        <FormularioMascota onListo={volver} />
      </Detalle>
    );

  if (vista === "anses") {
    const porPrestacion = [...new Set(rAnses.delMes.map((p) => p.prestacion))];
    return (
      <Detalle color="anses" titulo={s.anses.titulo} onVolver={volver}>
        <p className="frase">{rAnses.texto}</p>
        {rAnses.sinDatos ? null : porPrestacion.map((pr) => (
          <div key={pr}>
            <h2>{pr}</h2>
            <ul className="lista">
              {rAnses.delMes.filter((p) => p.prestacion === pr).map((p) => (
                <li key={p.id} className="pago"><b>DNI terminado en {terminaciones(p.dnis)}</b><br />{capitalizar(fechaPago(p.fecha))}</li>
              ))}
            </ul>
          </div>
        ))}
        <a className="btn claro ancho" target="_blank" rel="noreferrer" href={URL_ANSES}>Ver el calendario oficial en ANSES</a>
        <Pie seccion="anses" fuente="ANSES" url={URL_ANSES} minutosViejo={60 * 24 * 60}
          fila={anses.actualizado ? { clave: "anses", contenido: null, ok_en: anses.actualizado, intento_en: null, error: null } : undefined} />
      </Detalle>
    );
  }

  if (vista === "farmacias")
    return (
      <Detalle color="farmacias" titulo={s.farmacias.titulo} onVolver={volver}>
        <p>Todavía no tenemos el cronograma oficial de turnos.</p>
        <a className="btn grande-btn" target="_blank" rel="noreferrer" href={mapaFarmacias}>Ver farmacias abiertas ahora</a>
        <small className="chico">{TEXTO_FARMACIAS}</small>
        <p className="vacio">Se abre Google Maps y busca las farmacias abiertas {yo ? "cerca de tu ubicación" : `en ${config.ciudad}`}.</p>
      </Detalle>
    );

  if (vista === "vets") {
    const de24 = (l: Lugar) => /24 hs/i.test(l.horario);
    const guardia = ordenarLugares(vets.filter(de24), yo);
    const municipal = vets.filter((l) => !de24(l) && l.etiqueta);
    const otras = vets.filter((l) => !de24(l) && !l.etiqueta);
    // con ubicación, por cercanía; sin ubicación, por localidad
    const resto = yo ? ordenarLugares(otras, yo) : [...otras].sort((a, b) => a.localidad.localeCompare(b.localidad, "es") || a.nombre.localeCompare(b.nombre, "es"));
    return (
      <Detalle color="vets" titulo={TITULO_DE.vets} onVolver={volver}>
        {yo
          ? <p className="vacio">Ordenado por cercanía a tu ubicación.</p>
          : <button className="btn claro ancho" onClick={pedirUbicacion}><Icono nombre="pin" tam={20} /> Ordenar por cercanía</button>}
        {errorUbicacion && <p className="aviso-pie">No pudimos obtener tu ubicación. Revisá el permiso del navegador.</p>}
        {lugares.length === 0 && <SinDatos />}
        {guardia.length > 0 && (<><h2>Guardia 24 hs</h2><ul className="lista">{guardia.map((l) => <LugarCard key={l.id} lugar={l} km={km(l)} />)}</ul></>)}
        {municipal.length > 0 && (<><h2>Hospital Municipal de Animales</h2><ul className="lista">{municipal.map((l) => <LugarCard key={l.id} lugar={l} km={km(l)} />)}</ul></>)}
        {resto.length > 0 && (<><h2>Todas las veterinarias</h2><ul className="lista">{resto.map((l) => <LugarCard key={l.id} lugar={l} km={km(l)} />)}</ul></>)}
      </Detalle>
    );
  }

  if (vista === "guardias" || vista === "otros") {
    const cats = CATEGORIAS.filter((c) => CATEGORIAS_DE[vista].includes(c.id));
    return (
      <Detalle color={vista === "guardias" ? "guardias" : "otros"} titulo={TITULO_DE[vista]} onVolver={volver}>
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

  if (vista === "notificaciones")
    return (
      <Detalle titulo="Configurar avisos" onVolver={volver}>
        <Notificaciones push={push} agua={aguaVisible} />
      </Detalle>
    );

  if (vista === "avisos")
    return (
      <Detalle titulo="Mis avisos" onVolver={volver}>
        <MisAvisos avisos={avisosApp} onConfigurar={() => abrir("notificaciones")} onAbrir={irA} />
      </Detalle>
    );

  if (vista === "trabajo")
    return (
      <Detalle color="trabajo" titulo={s.trabajo.titulo} onVolver={volver}>
        <ListaTrabajo publicaciones={trabajo} onPublicar={(m) => abrir(`trabajo-${m}`)} />
      </Detalle>
    );

  if (vista === "trabajo-ofrezco" || vista === "trabajo-busco")
    return (
      <Detalle color="trabajo" titulo={vista === "trabajo-ofrezco" ? "Ofrezco trabajo" : "Busco trabajo"} onVolver={volver}>
        <FormularioTrabajo modo={vista === "trabajo-ofrezco" ? "ofrezco" : "busco"} onListo={volver} />
      </Detalle>
    );

  if (vista === "trueque")
    return (
      <Detalle color="trueque" titulo={s.trueque.titulo} onVolver={volver}>
        <ListaTrueque publicaciones={trueque.publicaciones} ferias={trueque.ferias} onPublicar={() => abrir("trueque-publicar")} onAvisarFeria={() => abrir("trueque-feria")} />
      </Detalle>
    );

  if (vista === "trueque-publicar")
    return (
      <Detalle color="trueque" titulo="Publicar" onVolver={volver}>
        <FormularioTrueque onListo={volver} />
      </Detalle>
    );

  if (vista === "trueque-feria")
    return (
      <Detalle color="trueque" titulo="Avisar de una feria" onVolver={volver}>
        <FormularioFeria onListo={volver} />
      </Detalle>
    );

  // ---- Pantalla principal ----
  return (
    <main className="home">
      <header className="azul compacto" onClick={() => abrir("clima")}>
        <div className="azul-fila">
          <span className="marca">Lomas Hoy</span>
          <button className="campana" aria-label={avisosApp.sinVer ? `Mis avisos: ${avisosApp.sinVer} sin ver` : "Mis avisos"} onClick={(e) => { e.stopPropagation(); abrir("avisos"); }}>
            <Icono nombre="campana" tam={22} />
            {avisosApp.sinVer > 0 ? <span className="num-rojo">{avisosApp.sinVer > 9 ? "9+" : avisosApp.sinVer}</span>
              : (push.estado === "inactivo" || push.estado === "iosSinInstalar") && <span className="punto" />}
          </button>
        </div>
        <div className="saludo-azul">
          <b>{saludo} · {capitalizar(fechaLarga())}</b>
          {estadoFrase && <span>{estadoFrase}</span>}
        </div>
        <button className="clima-compacto" aria-label="Ver el clima: hora por hora y 5 días">
          <span className="cc-fila">
            <span className="clima-icono"><Icono nombre={clima ? clima.ahora.icono : "nube"} tam={52} ancho={1.7} /></span>
            <span className="temp-c">{clima ? `${Math.round(clima.ahora.temp)}°` : "--°"}</span>
            <span className="frase-c">{clima?.frase ?? (clima ? clima.ahora.etiqueta : datos ? "Sin datos del clima" : "Cargando…")}</span>
          </span>
          {maxMin && <span className="cc-minmax">Máx {maxMin.max}° · Mín {maxMin.min}°</span>}
          <span className="cc-link">Ver hora por hora y 5 días ›</span>
        </button>
      </header>

      <section className="hoja">
        <form className="buscador" role="search" onSubmit={(e) => { e.preventDefault(); (document.activeElement as HTMLElement | null)?.blur(); }}>
          <Icono nombre="lupa" tam={24} ancho={2.5} />
          <input type="search" placeholder="¿Qué buscás? Farmacia, veterinaria…" aria-label="Buscar" value={q} onChange={(e) => cambiarBusqueda(e.target.value)} />
          {q && <button className="borrar-btn" type="button" aria-label="Borrar la búsqueda y volver al inicio" onClick={cerrarBusqueda}><Icono nombre="cerrar" tam={20} ancho={2.8} /></button>}
          <button className="buscar-btn" type="submit" aria-label="Buscar"><Icono nombre="lupa" tam={24} ancho={2.5} /></button>
        </form>
        {avisosDeFeriado(hoyStr).length > 0 && (
          <div className="franja" role="status">{avisosDeFeriado(hoyStr).map((t) => <p key={t}>{t}</p>)}</div>
        )}
        {sinConexion && <p className="offline">Sin conexión: se muestra lo último que se cargó.</p>}

        {resultados ? (
          <section aria-live="polite">
            {!hayResultados && <p className="vacio">No encontramos nada para “{q.trim()}”.</p>}
            {resultados.trueque.length > 0 && (
              <div className="grupo"><h2>{s.trueque.titulo}</h2>
                <ul className="lista">{resultados.trueque.map((p) => <PublicacionCard key={p.id} p={p} />)}</ul>
              </div>)}
            {resultados.trabajo.length > 0 && (
              <div className="grupo"><h2>{s.trabajo.titulo}</h2>
                <ul className="lista">{resultados.trabajo.map((p) => <TrabajoCard key={p.id} p={p} />)}</ul>
              </div>)}
            {resultados.ferias.length > 0 && (
              <div className="grupo"><h2>Ferias de trueque</h2>
                <ul className="lista">{resultados.ferias.map((f) => <FeriaCard key={f.id} f={f} />)}</ul>
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
            {resultados.programados.length > 0 && (
              <div className="grupo"><h2>Cortes programados</h2>
                {resultados.programados.map((c) => <p key={c.id + c.inicio} className="tarjeta aviso"><b>{c.localidad}</b><span>{diaCorto(c.inicio.slice(0, 10))}, de {horaCorte(c.inicio)} a {horaCorte(c.fin)} hs</span><small>Horario estimado, según Edesur</small></p>)}
              </div>)}
            {resultados.agua && (
              <div className="grupo"><h2>{s.agua.titulo}</h2>
                <button className="tarjeta muni" onClick={() => abrir("agua")}><b>{aguaResumen}</b><small>Ver los cortes de agua</small></button>
              </div>)}
            {resultados.anses && (
              <div className="grupo"><h2>{s.anses.titulo}</h2>
                <button className="tarjeta muni" onClick={() => abrir("anses")}><b>{rAnses.texto}</b><small>Ver el calendario del mes</small></button>
              </div>)}
            {resultados.mascotas.length > 0 && (
              <div className="grupo"><h2>{s.mascotas.titulo}</h2>
                <ul className="lista">{resultados.mascotas.map((m) => <MascotaCard key={m.id} m={m} />)}</ul>
              </div>)}
            {resultados.farmacias && (
              <div className="grupo"><h2>{s.farmacias.titulo}</h2>
                <p>Todavía no tenemos el cronograma oficial de turnos.</p>
                <a className="btn grande-btn" target="_blank" rel="noreferrer" href={mapaFarmacias}>Ver farmacias abiertas ahora</a>
                <small className="chico">{TEXTO_FARMACIAS}</small>
              </div>)}
            {resultados.clima && (
              <div className="grupo"><h2>Clima</h2><p className="tarjeta ok"><b>{Math.round(resultados.clima.ahora.temp)}° · {resultados.clima.ahora.etiqueta}</b></p></div>)}
            {resultados.lugares.length > 0 && (
              <div className="grupo"><h2>Lugares</h2>
                <ul className="lista">{resultados.lugares.map((l) => <LugarCard key={l.id} lugar={l} km={km(l)} />)}</ul>
              </div>)}
            {!hayResultados && (
              <a className="btn grande-btn" target="_blank" rel="noreferrer"
                href={mapaBuscador(q.trim(), yo, centroLomas, config.ciudad)}>
                Buscar “{q.trim()}” en Google Maps
              </a>
            )}
            {botonVolverInicio}
          </section>
        ) : (
          <>
            {totalAlertas > 0 && (
              <div className="alertas">
                <h2>{plural(totalAlertas, "alerta", "alertas")} hoy</h2>
                {novedades.map((n) => (
                  <button key={n.id} className={`tarjeta ${n.gravedad}`} onClick={() => abrir(n.vista)}>
                    <b>{n.titulo}</b>
                    <span>{n.detalle}</span>
                  </button>
                ))}
              </div>
            )}

            {(s.tren.activa || s.colectivos.activa) && (
              <section className="transporte coloreado c-tren" aria-label="Transporte">
                <h2><Icono nombre="tren" tam={24} /> Transporte</h2>
                {transp.map((r) => (
                  <button key={r.id} className="renglon" onClick={() => abrir(r.id)}>
                    <span className={`punto-estado ${r.punto}`} aria-hidden />
                    <b>{r.nombre}</b>
                    <span className={`renglon-texto ${r.punto}`}>{r.texto}</span>
                    <span className="renglon-flecha" aria-hidden>›</span>
                  </button>
                ))}
              </section>
            )}
            <div className="grilla">
              {s.luz.activa && (
                <Tile color="luz" icono="luz" titulo="Luz" estado={luzEstado} tono={luzTono} onClick={() => abrir("luz")}
                  resumen={(!d.luz?.contenido ? "Sin datos por ahora" : cortes.length === 0 ? "Sin cortes" : `${plural(cortes.length, "corte", "cortes")} · ${plural(usuariosSinLuz, "usuario", "usuarios")}`) + (programados.length ? ` · ${plural(programados.length, "programado", "programados")}` : "")} />
              )}
              {s.agua.activa && aguaVisible && (
                <Tile color="agua" icono="gota" titulo="Agua" estado={aguaEstado} tono={aguaTono} onClick={() => abrir("agua")} resumen={aguaResumen} />
              )}
              {s.urgencias.activa && (
                <>
                  <Tile color="guardias" icono="guardia" titulo="Guardias y salitas" estado={plural(lugaresDe("guardias").length, "lugar", "lugares")} tono="neutro" onClick={() => abrir("guardias")}
                    resumen="Hospitales, guardias y centros de salud" />
                  <Tile color="vets" icono="patita" titulo="Veterinarias" estado={`${vets.length} en total`} tono="neutro" onClick={() => abrir("vets")}
                    resumen={abiertas24 ? `${abiertas24} de guardia 24 hs` : "Veterinarias y salud animal"} />
                </>
              )}
              {s.farmacias.activa && (
                <Tile color="farmacias" icono="farmacia" titulo={s.farmacias.titulo} estado="Mapa" tono="neutro" onClick={() => abrir("farmacias")}
                  resumen="Farmacias abiertas ahora, cerca tuyo" />
              )}
              {s.mascotas.activa && (
                <Tile color="mascotas" icono="patita" titulo={s.mascotas.titulo} onClick={() => abrir("mascotas")}
                  estado={nuevasMascotas ? plural(nuevasMascotas, "nueva", "nuevas") : "Ver"} tono={nuevasMascotas ? "aviso" : "neutro"}
                  resumen={mascotas.length ? `${plural(mascotas.length, "publicación", "publicaciones")} de vecinos` : "Perdidos y encontrados"} />
              )}
              {s.anses.activa && (
                <Tile color="anses" icono="dinero" titulo={s.anses.titulo} onClick={() => abrir("anses")}
                  estado={rAnses.hayHoy ? "Hoy" : rAnses.sinDatos ? "Sin datos" : "Mes"} tono={rAnses.hayHoy ? "ok" : "neutro"}
                  resumen={rAnses.hayHoy ? rAnses.lineasHoy.map((l) => <span key={l} className="linea-tile">{l}</span>) : rAnses.texto} />
              )}
              {s.trueque.activa && (
                <Tile color="trueque" icono="trueque" titulo={s.trueque.titulo} onClick={() => abrir("trueque")}
                  estado={nuevasTrueque ? plural(nuevasTrueque, "nueva", "nuevas") : "Ver"} tono={nuevasTrueque ? "aviso" : "neutro"}
                  resumen={trueque.publicaciones.length ? `${plural(trueque.publicaciones.length, "publicación", "publicaciones")} de vecinos` : "Cambios entre vecinos"} />
              )}
              {s.trabajo.activa && (
                <Tile color="trabajo" icono="trabajo" titulo={s.trabajo.titulo} onClick={() => abrir("trabajo")}
                  estado={nuevasTrabajo ? plural(nuevasTrabajo, "nueva", "nuevas") : "Ver"} tono={nuevasTrabajo ? "aviso" : "neutro"}
                  resumen="Busco trabajo · Ofrezco trabajo" />
              )}
              {s.urgencias.activa && (
                <Tile color="otros" icono="escudo" titulo="Emergencias y servicios" estado={plural(lugaresDe("otros").length, "número", "números")} tono="neutro" onClick={() => abrir("otros")}
                  resumen="Policía, bomberos y reclamos" />
              )}
            </div>
            <CartelInstalar /><CartelAvisos push={push} agua={aguaVisible} /><PreguntaLocalidad push={push} />
            <button className="btn whatsapp" onClick={compartirDia}>Compartir por WhatsApp</button>
          </>
        )}
        <p className="pie-ingresar"><a href={panel ?? "/entrar"}>{panel ? "Mi panel" : "Ingresar"}</a></p>
      </section>
    </main>
  );
}
