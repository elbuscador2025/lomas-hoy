"use client";
import { useCallback, useEffect, useState } from "react";
import { type OficinaAnses, URL_OFICINAS_ANSES } from "@/lib/ansesof";
import { post } from "./api";

// Pestaña "Oficinas ANSES": agregar, editar y borrar a mano.
const VACIO: OficinaAnses = { id: "", nombre: "", direccion: "", localidad: "", horario: "" };
export default function PanelOficinasAnses() {
  const [lista, setLista] = useState<OficinaAnses[]>([]);
  const [v, setV] = useState<OficinaAnses>(VACIO);
  const [msg, setMsg] = useState("");
  const cargar = useCallback(async () => { const r = await post("/api/panel/ansesof", { accion: "listar" }); if (r.ok) setLista((await r.json()).oficinas); }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const r = await post("/api/panel/ansesof", { accion: "guardar", ...v });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Guardado." : d.error ?? "No se pudo guardar.");
    if (r.ok) { setV(VACIO); cargar(); }
  }
  const campo = (k: "nombre" | "direccion" | "localidad" | "horario", t: string, ph = "") => (
    <label>{t}<input value={v[k]} placeholder={ph} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>
  );
  return (
    <div>
      <p className="vacio">Datos del <a href={URL_OFICINAS_ANSES} target="_blank" rel="noreferrer">buscador oficial de ANSES</a>. Las oficinas cargadas ya tienen su ubicación para ordenar por distancia; una oficina nueva se muestra igual, pero sin “a X km”.</p>
      <form onSubmit={guardar} className="form">
        <b>{v.id ? "Editando una oficina" : "Agregar una oficina"}</b>
        {campo("nombre", "Nombre", "ANSES Lomas de Zamora (UDAI)")}
        {campo("direccion", "Dirección")}
        {campo("localidad", "Localidad")}
        {campo("horario", "Horario", "8:30 a 14:30 hs")}
        <button className="btn">Guardar</button>
        {v.id && <button type="button" className="btn claro" onClick={() => setV(VACIO)}>Cancelar</button>}
        {msg && <p className="normal">{msg}</p>}
      </form>
      {lista.map((o) => (
        <div key={o.id} className="fila-panel">
          <span><b>{o.nombre}</b><br /><small>{o.direccion}, {o.localidad} · {o.horario || "sin horario"}{o.lat == null ? " · sin ubicación" : ""}</small></span>
          <span>
            <button className="btn claro chico" onClick={() => { setV(o); window.scrollTo({ top: 0 }); }}>Editar</button>{" "}
            <button className="btn claro chico" onClick={async () => { if (confirm(`¿Borrar ${o.nombre}?`)) { await post("/api/panel/ansesof", { accion: "borrar", id: o.id }); cargar(); } }}>Borrar</button>
          </span>
        </div>
      ))}
    </div>
  );
}
