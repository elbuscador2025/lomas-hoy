"use client";
import { useCallback, useEffect, useState } from "react";
import { type Jornada, URL_HOSPITAL_ANIMALES } from "@/lib/castracion";
import { post } from "./api";

// Pestaña "Castraciones": cargar a mano las jornadas anunciadas oficialmente. Las vencidas dejan de verse solas en la app.
const VACIO: Jornada = { id: "", fecha: "", desde: "", hasta: "", horario: "", direccion: "", barrio: "", requisitos: "", modalidad: "" };
const hoy = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
const fechaLarga = (f: string) => new Date(f + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
export default function PanelCastraciones() {
  const [lista, setLista] = useState<Jornada[]>([]);
  const [v, setV] = useState<Jornada>(VACIO);
  const [msg, setMsg] = useState("");
  const cargar = useCallback(async () => { const r = await post("/api/panel/castracion", { accion: "listar" }); if (r.ok) setLista((await r.json()).jornadas); }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const r = await post("/api/panel/castracion", { accion: "guardar", ...v });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Guardado." : d.error ?? "No se pudo guardar.");
    if (r.ok) { setV(VACIO); cargar(); }
  }
  const campo = (k: "direccion" | "barrio" | "modalidad" | "requisitos", t: string, ph = "") => (
    <label>{t}<input value={v[k]} placeholder={ph} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>
  );
  return (
    <div>
      <p className="vacio">Cargá acá las jornadas que el Municipio anuncia en <a href={URL_HOSPITAL_ANIMALES} target="_blank" rel="noreferrer">su página</a> o en Instagram (@hospitaldeanimaleslomas, @saludlomas). Las que ya pasaron dejan de mostrarse solas en la app. Al cargar una jornada nueva les llega un aviso a quienes lo activaron (si la editás, no se avisa de nuevo).</p>
      <form onSubmit={guardar} className="form">
        <b>{v.id ? "Editando una jornada" : "Agregar una jornada"}</b>
        <label>Fecha<input type="date" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></label>
        <label>Desde (hora)<input type="time" value={v.desde} onChange={(e) => setV({ ...v, desde: e.target.value })} /></label>
        <label>Hasta (hora)<input type="time" value={v.hasta} onChange={(e) => setV({ ...v, hasta: e.target.value })} /></label>
        {campo("direccion", "Dirección")}
        {campo("barrio", "Barrio")}
        {campo("modalidad", "Modalidad", "Ej.: entrega de turnos con DNI, sin llevar al animal")}
        {campo("requisitos", "Requisitos (solo los oficiales)")}
        <button className="btn">Guardar</button>
        {v.id && <button type="button" className="btn claro" onClick={() => setV(VACIO)}>Cancelar</button>}
        {msg && <p className="normal">{msg}</p>}
      </form>
      {lista.length === 0 && <p className="vacio">No hay jornadas cargadas.</p>}
      {lista.map((j) => (
        <div key={j.id} className="fila-panel">
          <span><b>{fechaLarga(j.fecha)}</b>{j.fecha < hoy() ? " · VENCIDA (no se muestra)" : ""}<br /><small>{j.barrio} · {j.direccion}{j.horario ? ` · ${j.horario}` : ""}</small></span>
          <span>
            <button className="btn claro chico" onClick={() => { setV(j); window.scrollTo({ top: 0 }); }}>Editar</button>{" "}
            <button className="btn claro chico" onClick={async () => { if (confirm("¿Borrar esta jornada?")) { await post("/api/panel/castracion", { accion: "borrar", id: j.id }); cargar(); } }}>Borrar</button>
          </span>
        </div>
      ))}
    </div>
  );
}
