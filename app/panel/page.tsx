"use client";
import { useState } from "react";
import { CATEGORIAS, type Lugar } from "@/lib/datos";
import PanelMunicipio from "./PanelMunicipio";
import PanelPush from "./PanelPush";

type Datos = {
  dias: { dia: string; visitantes: number; volvieron: number }[];
  resumen: { visitantes_totales: number; volvieron_otro_dia: number } | null;
  reportes: { creado_en: string; seccion: string; mensaje: string }[];
};

const vacio: Lugar = { id: "", categoria: "guardias", nombre: "", direccion: "", localidad: "", telefonos: [], horario: "", fuente: "", fuenteUrl: "" };
const fecha = (iso: string) => new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });

export default function Panel() {
  const [password, setPassword] = useState("");
  const [datos, setDatos] = useState<Datos | null>(null);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [pestana, setPestana] = useState<"stats" | "lugares" | "muni" | "push">("stats");
  const [editando, setEditando] = useState<(Lugar & { tels: string; direccionOriginal?: string }) | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const llamar = (ruta: string, cuerpo: object) =>
    fetch(ruta, { method: "POST", body: JSON.stringify({ password, ...cuerpo }) });

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const r = await llamar("/api/panel", {});
    if (!r.ok) return setError("Contraseña incorrecta");
    setError("");
    setDatos(await r.json());
    cargarLugares();
  }

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

  if (!datos)
    return (
      <main className="wrap">
        <h1>Panel</h1>
        <form onSubmit={entrar} className="form">
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn">Entrar</button>
          {error && <p className="error">{error}</p>}
        </form>
      </main>
    );

  return (
    <main className="wrap">
      <h1>Panel</h1>
      <div className="pestanas">
        <button className={`btn ${pestana === "stats" ? "" : "claro"}`} onClick={() => setPestana("stats")}>Visitas y reportes</button>
        <button className={`btn ${pestana === "lugares" ? "" : "claro"}`} onClick={() => setPestana("lugares")}>Lugares ({lugares.length})</button>
        <button className={`btn ${pestana === "muni" ? "" : "claro"}`} onClick={() => setPestana("muni")}>Municipio</button>
        <button className={`btn ${pestana === "push" ? "" : "claro"}`} onClick={() => setPestana("push")}>Avisos push</button>
      </div>

      {pestana === "muni" && <PanelMunicipio password={password} />}
      {pestana === "push" && <PanelPush password={password} />}

      {pestana === "stats" && (
        <>
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
