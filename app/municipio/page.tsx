"use client";
import { useCallback, useEffect, useState } from "react";

type Aviso = { id: string; titulo: string; texto: string; zona: string; actividad: string | null; direccion: string; firma: string; creado: string };
type Estado = { usuario: { nombre: string; firma: string }; avisos: Aviso[]; zonas: string[]; cupo: { publicadosHoy: number; tope: number } };
const vacio = { id: "", titulo: "", texto: "", zona: "Todo Lomas", actividad: "", direccion: "" };
const cuando = (a: string) => new Date(a + ":00-03:00").toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "medium", timeStyle: "short" });
const json = { "Content-Type": "application/json" };

export default function Municipio() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [form, setForm] = useState(vacio);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const r = await fetch("/api/municipio/avisos");
    setEstado(r.ok ? await r.json() : null);
    setCargando(false);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const r = await fetch("/api/municipio/login", { method: "POST", headers: json, body: JSON.stringify({ usuario, clave }) });
    if (!r.ok) return setError((await r.json().catch(() => ({}))).error ?? "No se pudo ingresar.");
    setClave("");
    cargar();
  }

  async function salir() {
    await fetch("/api/municipio/logout", { method: "POST", headers: json });
    setEstado(null);
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

  if (!estado)
    return (
      <main className="wrap">
        <h1>Avisos del municipio</h1>
        <p className="vacio">Ingresá con tu usuario para publicar avisos para los vecinos.</p>
        <form onSubmit={entrar} className="form">
          <input placeholder="Usuario" autoCapitalize="none" autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
          <input type="password" placeholder="Contraseña" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} />
          <button className="btn">Ingresar</button>
          {error && <p className="error">{error}</p>}
        </form>
      </main>
    );

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
        <label>Zona
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

      <h2>Mis avisos</h2>
      {estado.avisos.length === 0 && <p className="vacio">Todavía no publicaste avisos.</p>}
      <ul className="lista">
        {estado.avisos.map((a) => (
          <li key={a.id} className="lugar">
            <b>{a.titulo}</b>
            <span>{a.zona}{a.actividad ? ` · ${cuando(a.actividad)}` : ""}</span>
            <small>Publicado {new Date(a.creado).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "medium", timeStyle: "short" })}</small>
            <div className="acciones">
              <button className="btn claro" onClick={() => { setMsg(""); setForm({ id: a.id, titulo: a.titulo, texto: a.texto, zona: a.zona, actividad: a.actividad ?? "", direccion: a.direccion }); window.scrollTo({ top: 0 }); }}>Editar</button>
              <button className="btn claro" onClick={() => borrar(a)}>Borrar</button>
            </div>
          </li>
        ))}
      </ul>
      <button className="link" onClick={salir}>Salir</button>
    </main>
  );
}
