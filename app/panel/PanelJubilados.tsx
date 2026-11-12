"use client";
import { useCallback, useEffect, useState } from "react";
import { config } from "@/lomas.config.mjs";
import type { Actividad, Centro } from "@/lib/jubilados";
import { post } from "./api";

const centroVacio: Centro = { id: "", nombre: "", direccion: "", barrio: "", actividades: "", horarios: "", telefono: "", fuente: "", fuenteUrl: "", activo: true, actualizado: "" };
const actVacia: Actividad = { id: "", titulo: "", descripcion: "", donde: "", cuando: "", telefono: "", fuente: "", fuenteUrl: "", activa: true, actualizado: "" };

// Pestaña "Jubilados": centros de jubilados y actividades. Agregar, editar y desactivar (la sección es pública).
export default function PanelJubilados() {
  const [centros, setCentros] = useState<Centro[]>([]);
  const [acts, setActs] = useState<Actividad[]>([]);
  const [ed, setEd] = useState<Centro | null>(null);
  const [edA, setEdA] = useState<Actividad | null>(null);
  const [buscar, setBuscar] = useState("");
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    try {
      const r = await post("/api/panel/centros", { accion: "listar" });
      if (r.ok) { const d = await r.json(); setCentros(d.centros); setActs(d.actividades); }
    } catch { setMsg("No se pudo cargar la lista. Revisá tu internet y volvé a entrar a la pestaña."); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!ed) return;
    const r = await post("/api/panel/centros", { accion: "guardar-centro", centro: ed });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setMsg("Guardado."); setEd(null); cargar(); } else setMsg(d.error ?? "No se pudo guardar.");
  }
  async function guardarAct(e: React.FormEvent) {
    e.preventDefault();
    if (!edA) return;
    const r = await post("/api/panel/centros", { accion: "guardar-actividad", actividad: edA });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setMsg("Guardado."); setEdA(null); cargar(); } else setMsg(d.error ?? "No se pudo guardar.");
  }
  const campo = (k: keyof Centro) => ({ value: String(ed?.[k] ?? ""), onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => ed && setEd({ ...ed, [k]: e.target.value }) });
  const campoA = (k: keyof Actividad) => ({ value: String(edA?.[k] ?? ""), onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => edA && setEdA({ ...edA, [k]: e.target.value }) });
  const q = buscar.trim().toLowerCase();
  const visibles = centros.filter((c) => !q || `${c.nombre} ${c.direccion} ${c.barrio}`.toLowerCase().includes(q));

  if (ed) return (
    <form onSubmit={guardar} className="form">
      <h2>{ed.id ? "Editar centro" : "Nuevo centro de jubilados"}</h2>
      {msg && <p className="normal">{msg}</p>}
      <label>Nombre<input {...campo("nombre")} maxLength={120} required /></label>
      <label>Dirección<input {...campo("direccion")} maxLength={160} /></label>
      <label>Barrio o localidad<input {...campo("barrio")} list="may-barrios" maxLength={60} /></label>
      <datalist id="may-barrios">{config.localidades.map((l) => <option key={l} value={l} />)}</datalist>
      <label>Actividades (solo si el centro las publica)<textarea {...campo("actividades")} maxLength={300} rows={2} /></label>
      <label>Días y horarios<textarea {...campo("horarios")} maxLength={300} rows={2} /></label>
      <label>Teléfono<input {...campo("telefono")} maxLength={40} inputMode="tel" /></label>
      <label>Fuente (quién lo publica)<input {...campo("fuente")} maxLength={120} placeholder="Ej: Facebook oficial del centro" /></label>
      <label>Enlace de la fuente<input {...campo("fuenteUrl")} maxLength={300} inputMode="url" placeholder="https://…" /></label>
      <label className="casilla"><input type="checkbox" checked={ed.activo} onChange={(e) => setEd({ ...ed, activo: e.target.checked })} /> Activo (se muestra en la sección)</label>
      <button className="btn">Guardar</button>
      <button type="button" className="btn claro" onClick={() => { setEd(null); setMsg(""); }}>Cerrar</button>
    </form>
  );
  if (edA) return (
    <form onSubmit={guardarAct} className="form">
      <h2>{edA.id ? "Editar actividad" : "Nueva actividad"}</h2>
      {msg && <p className="normal">{msg}</p>}
      <label>Nombre<input {...campoA("titulo")} maxLength={120} required /></label>
      <label>De qué se trata<textarea {...campoA("descripcion")} maxLength={400} rows={3} /></label>
      <label>Dónde<input {...campoA("donde")} maxLength={200} /></label>
      <label>Cuándo (días y horarios)<input {...campoA("cuando")} maxLength={200} /></label>
      <label>Teléfono<input {...campoA("telefono")} maxLength={40} inputMode="tel" /></label>
      <label>Fuente (quién lo publica)<input {...campoA("fuente")} maxLength={120} /></label>
      <label>Enlace de la fuente<input {...campoA("fuenteUrl")} maxLength={300} inputMode="url" placeholder="https://…" /></label>
      <label className="casilla"><input type="checkbox" checked={edA.activa} onChange={(e) => setEdA({ ...edA, activa: e.target.checked })} /> Activa (se muestra en la sección)</label>
      <button className="btn">Guardar</button>
      <button type="button" className="btn claro" onClick={() => { setEdA(null); setMsg(""); }}>Cerrar</button>
    </form>
  );

  return (
    <div>
      {msg && <p className="normal">{msg}</p>}
      <h2>Actividades ({acts.length})</h2>
      <button className="btn" onClick={() => { setEdA({ ...actVacia }); setMsg(""); }}>+ Agregar actividad</button>
      {acts.length === 0 && <p className="vacio">Todavía no hay actividades cargadas.</p>}
      {acts.map((a) => (
        <div key={a.id} className="fila-panel">
          <span><b>{a.titulo}</b>{!a.activa && " (desactivada)"}<br /><small>{a.donde || "dónde: consultar"} · {a.cuando || "cuándo: consultar"}</small></span>
          <span className="acciones">
            <button className="btn claro chico" onClick={() => { setEdA(a); setMsg(""); }}>Editar</button>
            <button className="btn claro chico" onClick={async () => { await post("/api/panel/centros", { accion: "activar-actividad", id: a.id, valor: !a.activa }); cargar(); }}>{a.activa ? "Desactivar" : "Activar"}</button>
          </span>
        </div>
      ))}
      <h2>Centros de jubilados ({centros.length})</h2>
      <button className="btn" onClick={() => { setEd({ ...centroVacio }); setMsg(""); }}>+ Agregar centro</button>
      <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar un centro" aria-label="Buscar un centro" style={{ width: "100%", margin: "8px 0" }} />
      {visibles.slice(0, 60).map((c) => (
        <div key={c.id} className="fila-panel">
          <span><b>{c.nombre}</b>{!c.activo && " (desactivado)"}<br /><small>{c.direccion} · {c.barrio}{c.telefono ? ` · ${c.telefono}` : ""}</small></span>
          <span className="acciones">
            <button className="btn claro chico" onClick={() => { setEd(c); setMsg(""); }}>Editar</button>
            <button className="btn claro chico" onClick={async () => { await post("/api/panel/centros", { accion: "activar-centro", id: c.id, valor: !c.activo }); cargar(); }}>{c.activo ? "Desactivar" : "Activar"}</button>
          </span>
        </div>
      ))}
      {visibles.length > 60 && <p className="vacio">Se muestran 60 de {visibles.length}. Usá el buscador para encontrar el resto.</p>}
    </div>
  );
}
