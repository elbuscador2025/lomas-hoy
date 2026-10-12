"use client";
import { useCallback, useEffect, useState } from "react";

type Aviso = { id: string; titulo: string; texto: string; zona: string; actividad: string | null; direccion: string; firma: string; creado: string; propio: boolean };
type Estado = { usuario: { nombre: string; firma: string }; avisos: Aviso[]; zonas: string[]; cupo: { publicadosHoy: number; tope: number } };
const vacio = { id: "", titulo: "", texto: "", zona: "Todo Lomas", actividad: "", direccion: "" };
const cuando = (a: string) => new Date(a + ":00-03:00").toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "medium", timeStyle: "short" });
const json = { "Content-Type": "application/json" };

export default function Municipio() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(vacio);
  const [msg, setMsg] = useState("");
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const r = await fetch("/api/municipio/avisos");
    if (r.status === 401) { location.replace("/entrar"); return; } // sin sesión: pantalla de entrada
    setEstado(r.ok ? await r.json() : null);
    setCargando(false);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function salir() {
    await fetch("/api/salir", { method: "POST" }).catch(() => {});
    location.href = "/";
  }

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMsg("");
    const r = await fetch("/api/municipio/avisos", { method: "POST", headers: json, body: JSON.stringify({ accion: "guardar", ...form }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setError(d.error ?? "No se pudo publicar.");
    setMsg(form.id ? "Cambios guardados." : "¡Publicado! Ya se ve en la app.");
    setForm(vacio);
    cargar();
  }

  async function borrar(a: Aviso) {
    if (!confirm(`¿Borrar el aviso "${a.titulo}"?`)) return;
    await fetch("/api/municipio/avisos", { method: "POST", headers: json, body: JSON.stringify({ accion: "borrar", id: a.id }) });
    cargar();
  }

  const set = (k: keyof typeof vacio, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (cargando) return <main className="wrap"><p className="vacio">Cargando…</p></main>;

  if (!estado) return <main className="wrap"><p className="vacio">No se pudieron cargar los avisos. Probá de nuevo.</p></main>;

  const sinCupo = estado.cupo.publicadosHoy >= estado.cupo.tope && !form.id;
  return (
    <main className="wrap">
      <h1>Avisos del municipio</h1>
      <p className="vacio">Hola, {estado.usuario.nombre}. Tus avisos salen firmados: <b>{estado.usuario.firma}</b>.</p>
      <p className="vacio">Avisos publicados hoy en todo el municipio: {estado.cupo.publicadosHoy} de {estado.cupo.tope}.</p>

      <form onSubmit={publicar} className="form">
        <h2>{form.id ? "Editar aviso" : "Nuevo aviso"}</h2>
        <label>Título<input maxLength={100} required value={form.titulo} onChange={(e) => set("titulo", e.target.value)} /></label>
        <label>Texto (solo texto, sin fotos ni enlaces)<textarea maxLength={1000} required rows={5} value={form.texto} onChange={(e) => set("texto", e.target.value)} /></label>
        <label>Barrio (va al principio del título; “Todo Lomas” va sin etiqueta)
          <select value={form.zona} onChange={(e) => set("zona", e.target.value)}>
            {estado.zonas.map((z) => <option key={z}>{z}</option>)}
          </select>
        </label>
        <label>Fecha y hora de la actividad (opcional)
          <input type="datetime-local" value={form.actividad} onChange={(e) => set("actividad", e.target.value)} />
        </label>
        <label>Dirección (opcional; si la ponés, los vecinos ven “Cómo llegar”)
          <input maxLength={150} value={form.direccion} onChange={(e) => set("direccion", e.target.value)} />
        </label>
        <button className="btn" disabled={sinCupo}>{form.id ? "Guardar cambios" : "Publicar"}</button>
        {form.id && <button type="button" className="btn claro" onClick={() => setForm(vacio)}>Cancelar edición</button>}
        {sinCupo && <p className="error">Ya se llegó al tope de avisos de hoy. Probá mañana.</p>}
        {error && <p className="error">{error}</p>}
        {msg && <p className="normal">{msg}</p>}
      </form>

      <h2>Historial de avisos</h2>
      <label className="campo">Filtrar por barrio
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todos los barrios</option>
          {estado.zonas.map((z) => <option key={z}>{z}</option>)}
        </select>
      </label>
      {estado.avisos.filter((a) => !filtro || a.zona === filtro).length === 0 && <p className="vacio">No hay avisos para mostrar.</p>}
      <ul className="lista">
        {estado.avisos.filter((a) => !filtro || a.zona === filtro).map((a) => (
          <li key={a.id} className="lugar">
            <b>{a.titulo}</b>
            <span>{a.zona}{a.actividad ? ` · actividad ${cuando(a.actividad)}` : ""}</span>
            <small>Publicado {new Date(a.creado).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "medium", timeStyle: "short" })} · {a.firma}{a.propio ? " (tuyo)" : ""}</small>
            {a.propio && (
              <div className="acciones">
                <button className="btn claro" onClick={() => { setMsg(""); setForm({ id: a.id, titulo: a.titulo, texto: a.texto, zona: a.zona, actividad: a.actividad ?? "", direccion: a.direccion }); window.scrollTo({ top: 0 }); }}>Editar</button>
                <button className="btn claro" onClick={() => borrar(a)}>Borrar</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <a className="btn claro ancho" target="_blank" rel="noreferrer"
        href={`https://wa.me/?text=${encodeURIComponent(`Mirá Lomas Hoy: la app con lo que pasa hoy en Lomas de Zamora (tren, luz, clima, guardias y avisos del municipio). Es gratis y no hace falta registrarse:
${location.origin}`)}`}>Compartir Lomas Hoy</a>
      <button className="btn claro ancho" onClick={salir}>Salir</button>
    </main>
  );
}
