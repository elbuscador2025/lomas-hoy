"use client";
import { useCallback, useEffect, useState } from "react";
import { type Coop, FUENTE_COOP } from "@/lib/coop";
import { post } from "./api";

// Pestaña "COOP": agregar, editar y borrar a mano.
const VACIO: Coop = { id: "", barrio: "", direccion: "", horario: "", telefono: "", whatsapp: "" };
export default function PanelCoop() {
  const [lista, setLista] = useState<Coop[]>([]);
  const [v, setV] = useState<Coop>(VACIO);
  const [msg, setMsg] = useState("");
  const cargar = useCallback(async () => { const r = await post("/api/panel/coop", { accion: "listar" }); if (r.ok) setLista((await r.json()).coop); }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const r = await post("/api/panel/coop", { accion: "guardar", ...v });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Guardado." : d.error ?? "No se pudo guardar.");
    if (r.ok) { setV(VACIO); cargar(); }
  }
  const campo = (k: "barrio" | "direccion" | "horario" | "telefono" | "whatsapp", t: string, ph = "") => (
    <label>{t}<input value={v[k]} placeholder={ph} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>
  );
  return (
    <div>
      <p className="vacio">Datos oficiales del <a href={FUENTE_COOP} target="_blank" rel="noreferrer">Municipio</a>. Tocá “Editar” para corregir uno, o completá el formulario para agregar otro.</p>
      <form onSubmit={guardar} className="form">
        <b>{v.id ? "Editando una COOP" : "Agregar una COOP"}</b>
        {campo("barrio", "Barrio")}
        {campo("direccion", "Dirección")}
        {campo("horario", "Horario", "Lunes a Viernes de 8 a 16 hs")}
        {campo("telefono", "Teléfono (opcional)", "4273-0800")}
        {campo("whatsapp", "WhatsApp (opcional)", "11-5565-7081")}
        <button className="btn">Guardar</button>
        {v.id && <button type="button" className="btn claro" onClick={() => setV(VACIO)}>Cancelar</button>}
        {msg && <p className="normal">{msg}</p>}
      </form>
      {lista.map((c) => (
        <div key={c.id} className="fila-panel">
          <span><b>{c.barrio}</b><br /><small>{c.direccion} · {c.horario || "sin horario"}<br />Tel: {c.telefono || "—"} · WhatsApp: {c.whatsapp || "—"}</small></span>
          <span>
            <button className="btn claro chico" onClick={() => { setV(c); window.scrollTo({ top: 0 }); }}>Editar</button>{" "}
            <button className="btn claro chico" onClick={async () => { if (confirm(`¿Borrar la COOP ${c.barrio}?`)) { await post("/api/panel/coop", { accion: "borrar", id: c.id }); cargar(); } }}>Borrar</button>
          </span>
        </div>
      ))}
    </div>
  );
}
