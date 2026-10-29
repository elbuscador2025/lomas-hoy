"use client";
import { useEffect, useState } from "react";
import { CATEGORIAS, type Lugar } from "@/lib/datos";
import PanelBarrios from "./PanelBarrios";
import PanelTrueque from "./PanelTrueque";
import PanelTrabajo from "./PanelTrabajo";
import PanelBloqueados from "./PanelBloqueados";
import PanelDenuncias from "./PanelDenuncias";
import AvisarmeAqui from "./AvisarmeAqui";
import PanelPush from "./PanelPush";
import PanelMascotas from "./PanelMascotas";
import PanelAnses from "./PanelAnses";
import { config } from "@/lomas.config.mjs";
import PanelCoop from "./PanelCoop";
import PanelPasa from "./PanelPasa";
import PanelSugerencias from "./PanelSugerencias";
import PanelOficinasAnses from "./PanelOficinasAnses";
import PanelCastraciones from "./PanelCastraciones";
import PanelAgua from "./PanelAgua";
import MiCuenta from "./MiCuenta";
import { post, salir } from "./api";

type Datos = {
  dias: { dia: string; visitantes: number; volvieron: number }[];
  resumen: { visitantes_totales: number; volvieron_otro_dia: number } | null;
  reportes: { creado_en: string; seccion: string; mensaje: string }[];
  corridas?: { t: string; o: string }[];
  quiniela?: { ultimo: string | null; problemas: string[] } | null;
};

const vacio: Lugar = { id: "", categoria: "guardias", nombre: "", direccion: "", localidad: "", telefonos: [], horario: "", fuente: "", fuenteUrl: "" };
const fecha = (iso: string) => new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });

export default function Panel() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [pestana, setPestana] = useState<"stats" | "lugares" | "barrios" | "push" | "mascotas" | "anses" | "coop" | "ansesof" | "castracion" | "pasa" | "sugerencias" | "agua" | "trueque" | "trabajo" | "bloqueados" | "denuncias">("stats");
  const [editando, setEditando] = useState<(Lugar & { tels: string; direccionOriginal?: string }) | null>(null);
  const [mensaje, setMensaje] = useState("");

  const llamar = post;

  // Al abrir el panel: si no hay sesión, la primera llamada manda a la pantalla de entrada.
  useEffect(() => {
    if (location.hash === "#mascotas") setPestana("mascotas");
    if (location.hash === "#trueque") setPestana("trueque");
    if (location.hash === "#trabajo") setPestana("trabajo");
    if (location.hash === "#denuncias") setPestana("denuncias");
    post("/api/panel").then(async (r) => { if (r.ok) { setDatos(await r.json()); cargarLugares(); } });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function cargarLugares() {
    const r = await llamar("/api/panel/lugares", { accion: "listar" });
    if (r.ok) setLugares((await r.json()).lugares);
  }

  async function guardar() {
    if (!editando) return;
    const { tels, direccionOriginal, ...lugar } = editando;
    const r = await llamar("/api/panel/lugares", {
      accion: "guardar",
      lugar: {
        ...lugar,
        telefonos: tels.split(",").map((t) => t.trim()).filter(Boolean),
        direccionCambio: lugar.direccion !== direccionOriginal,
      },
    });
    setMensaje(r.ok ? "Guardado." : "No se pudo guardar (falta el nombre o la categoría).");
    if (r.ok) { setEditando(null); cargarLugares(); }
  }

  async function borrar(l: Lugar) {
    if (!confirm(`¿Borrar "${l.nombre}"?`)) return;
    await llamar("/api/panel/lugares", { accion: "borrar", id: l.id });
    setEditando(null);
    cargarLugares();
  }

  const editar = (l: Lugar) => setEditando({ ...l, tels: l.telefonos.join(", "), direccionOriginal: l.direccion });
  const set = (campo: keyof Lugar | "tels", valor: string) => setEditando((e) => (e ? { ...e, [campo]: valor } : e));

  if (!datos) return <main className="wrap"><p className="vacio">Cargando…</p></main>;

  return (
    <main className="wrap">
      <div className="encabezado-panel">
        <h1>Panel</h1>
        <button className="btn claro chico" onClick={() => salir()}>Salir</button>
      </div>
      <AvisarmeAqui />
      <MiCuenta />
      <div className="pestanas">
        <button className={`btn ${pestana === "stats" ? "" : "claro"}`} onClick={() => setPestana("stats")}>Visitas y reportes</button>
        <button className={`btn ${pestana === "lugares" ? "" : "claro"}`} onClick={() => setPestana("lugares")}>Lugares ({lugares.length})</button>
        <button className={`btn ${pestana === "barrios" ? "" : "claro"}`} onClick={() => setPestana("barrios")}>Barrios</button>
        <button className={`btn ${pestana === "push" ? "" : "claro"}`} onClick={() => setPestana("push")}>Avisos push</button>
        <button className={`btn ${pestana === "mascotas" ? "" : "claro"}`} onClick={() => setPestana("mascotas")}>Mascotas</button>
        <button className={`btn ${pestana === "anses" ? "" : "claro"}`} onClick={() => setPestana("anses")}>ANSES</button>
        <button className={`btn ${pestana === "ansesof" ? "" : "claro"}`} onClick={() => setPestana("ansesof")}>Oficinas ANSES</button>
        <button className={`btn ${pestana === "castracion" ? "" : "claro"}`} onClick={() => setPestana("castracion")}>Castraciones</button>
        {config.secciones.pasa.activa && <button className={`btn ${pestana === "pasa" ? "" : "claro"}`} onClick={() => setPestana("pasa")}>Avisos de vecinos</button>}
        <button className={`btn ${pestana === "sugerencias" ? "" : "claro"}`} onClick={() => setPestana("sugerencias")}>Sugerencias</button>
        <button className={`btn ${pestana === "coop" ? "" : "claro"}`} onClick={() => setPestana("coop")}>COOP</button>
        <button className={`btn ${pestana === "agua" ? "" : "claro"}`} onClick={() => setPestana("agua")}>Agua</button>
        <button className={`btn ${pestana === "trueque" ? "" : "claro"}`} onClick={() => setPestana("trueque")}>Trueque</button>
        <button className={`btn ${pestana === "trabajo" ? "" : "claro"}`} onClick={() => setPestana("trabajo")}>Trabajo</button>
        <button className={`btn ${pestana === "bloqueados" ? "" : "claro"}`} onClick={() => setPestana("bloqueados")}>Bloqueados</button>
        <button className={`btn ${pestana === "denuncias" ? "" : "claro"}`} onClick={() => setPestana("denuncias")}>Denuncias</button>
      </div>

      {pestana === "barrios" && <PanelBarrios />}
      {pestana === "trueque" && <PanelTrueque />}
      {pestana === "trabajo" && <PanelTrabajo />}
      {pestana === "bloqueados" && <PanelBloqueados />}
      {pestana === "denuncias" && <PanelDenuncias />}
      {pestana === "push" && <PanelPush />}
      {pestana === "mascotas" && <PanelMascotas />}
      {pestana === "anses" && <PanelAnses />}
      {pestana === "coop" && <PanelCoop />}
      {pestana === "pasa" && config.secciones.pasa.activa && <PanelPasa />}
      {pestana === "sugerencias" && <PanelSugerencias />}
      {pestana === "ansesof" && <PanelOficinasAnses />}
      {pestana === "castracion" && <PanelCastraciones />}
      {pestana === "agua" && <PanelAgua />}

      {pestana === "stats" && (
        <>
          <p className={`normal ${datos.corridas?.[0] && Date.now() - new Date(datos.corridas[0].t).getTime() > 45 * 60_000 ? "error" : ""}`}>
            <b>Última actualización de datos:</b> {datos.corridas?.[0] ? `hace ${Math.max(0, Math.round((Date.now() - new Date(datos.corridas[0].t).getTime()) / 60_000))} minutos` : "todavía sin registro"}
            {datos.corridas && datos.corridas.length > 1 && (
              <><br /><small>Últimas corridas: {datos.corridas.map((x) => `${new Date(x.t).toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hour12: false })} (${x.o === "despertador" ? "despertador" : "GitHub"})`).join(" · ")}</small></>
            )}
          </p>
          {datos.quiniela && (
            <p className={`normal ${datos.quiniela.problemas.length ? "error" : ""}`}>
              {datos.quiniela.problemas.length
                ? <><b>Quiniela:</b> no pasaron el control hoy:<br /><small>{datos.quiniela.problemas.join(" · ")}</small></>
                : <><b>Quiniela:</b> {datos.quiniela.ultimo ? `último control OK a las ${new Date(datos.quiniela.ultimo).toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hour12: false })}` : "todavía sin controles"}</>}
            </p>
          )}
          <p>
            Visitantes distintos: <b>{datos.resumen?.visitantes_totales ?? 0}</b> · Volvieron otro día:{" "}
            <b>{datos.resumen?.volvieron_otro_dia ?? 0}</b>
          </p>
          <h2>Por día</h2>
          <table>
            <thead><tr><th>Día</th><th>Visitantes</th><th>Que ya habían venido</th></tr></thead>
            <tbody>
              {datos.dias.map((d) => (
                <tr key={d.dia}><td>{d.dia}</td><td>{d.visitantes}</td><td>{d.volvieron}</td></tr>
              ))}
            </tbody>
          </table>
          <h2>Reportes de error</h2>
          {datos.reportes.length === 0 && <p>Todavía no hay reportes.</p>}
          <ul className="lista">
            {datos.reportes.map((r, i) => {
              const lugar = r.seccion.startsWith("lugar:") ? lugares.find((l) => l.id === r.seccion.slice(6)) : null;
              return (
                <li key={i}>
                  <b>{lugar ? `Lugar: ${lugar.nombre}` : r.seccion}</b> · {fecha(r.creado_en)}
                  <br />{r.mensaje || <i>(sin texto)</i>}
                  {lugar && <><br /><button className="link" onClick={() => { setPestana("lugares"); editar(lugar); }}>Corregir este lugar</button></>}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {pestana === "lugares" && !editando && (
        <>
          <button className="btn ancho" onClick={() => setEditando({ ...vacio, tels: "" })}>+ Agregar lugar</button>
          {mensaje && <p>{mensaje}</p>}
          {CATEGORIAS.map((cat) => (
            <div key={cat.id}>
              <h2>{cat.titulo} ({lugares.filter((l) => l.categoria === cat.id).length})</h2>
              {lugares.filter((l) => l.categoria === cat.id).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map((l) => (
                <div key={l.id} className="fila-panel">
                  <span><b>{l.nombre}</b><br /><small>{l.direccion || "sin dirección"} · {l.telefonos.join(", ") || "sin teléfono"}</small></span>
                  <button className="btn claro chico" onClick={() => editar(l)}>Editar</button>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {pestana === "lugares" && editando && (
        <div className="form">
          <h2>{editando.id ? "Editar lugar" : "Nuevo lugar"}</h2>
          <label>Categoría
            <select value={editando.categoria} onChange={(e) => set("categoria", e.target.value)}>
              {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
            </select>
          </label>
          <label>Nombre<input value={editando.nombre} onChange={(e) => set("nombre", e.target.value)} /></label>
          <label>Dirección<input value={editando.direccion} onChange={(e) => set("direccion", e.target.value)} /></label>
          <label>Localidad<input value={editando.localidad} onChange={(e) => set("localidad", e.target.value)} /></label>
          <label>Teléfonos (separados por coma)<input value={editando.tels} onChange={(e) => set("tels", e.target.value)} /></label>
          <label>Horario<input value={editando.horario} onChange={(e) => set("horario", e.target.value)} /></label>
          <label>Etiqueta (opcional, ej. Municipal y gratuito)<input value={editando.etiqueta ?? ""} onChange={(e) => set("etiqueta", e.target.value)} /></label>
          <label>Fuente (de dónde salió el dato)<input value={editando.fuente} onChange={(e) => set("fuente", e.target.value)} /></label>
          <label>Link de la fuente<input value={editando.fuenteUrl} onChange={(e) => set("fuenteUrl", e.target.value)} /></label>
          <button className="btn" onClick={guardar}>Guardar</button>
          <button className="btn claro" onClick={() => setEditando(null)}>Cancelar</button>
          {editando.id && <button className="btn claro" onClick={() => borrar(editando)}>Borrar este lugar</button>}
        </div>
      )}
    </main>
  );
}
