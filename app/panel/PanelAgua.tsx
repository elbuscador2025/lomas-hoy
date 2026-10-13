"use client";
import { useCallback, useEffect, useState } from "react";
import { config } from "@/lomas.config.mjs";
import type { CorteManual } from "@/lib/agua";
import { post } from "./api";

const cuando = (c: CorteManual) => {
  const f = (s: string) => new Date(`${s}:00-03:00`).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${f(c.desde)} → ${f(c.hasta)} hs`;
};

const vacio = { localidad: "", zona: "", desde: "", hasta: "", motivo: "" };

// Pestaña "Agua": carga a mano de un corte de AySA. Al guardar, les llega el aviso a los vecinos que lo tienen prendido.
export default function PanelAgua() {
  const [cortes, setCortes] = useState<CorteManual[]>([]);
  const [v, setV] = useState(vacio);
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);

  const cargar = useCallback(async () => {
    const r = await post("/api/panel/agua", { accion: "listar" });
    if (r.ok) { const d = await r.json(); setCortes(d.cortes); setVisible(d.visible); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    const r = await post("/api/panel/agua", { accion: "agregar", ...v });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Cargado. Se avisa a los vecinos que tienen prendidos los avisos de agua." : d.error ?? "No se pudo cargar.");
    if (r.ok) { setV(vacio); cargar(); }
  }

  const campo = (k: keyof typeof vacio) => ({ value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value }) });
  return (
    <div>
      <div className="interruptor-fila">
        <span><b>Mostrar Agua en la app</b><small>Apagado: los vecinos no ven el cuadradito ni el aviso, y no se mandan notificaciones.</small></span>
        <button role="switch" aria-checked={visible} aria-label="Mostrar Agua en la app" className={`interruptor ${visible ? "on" : ""}`}
          onClick={async () => { const n = !visible; setVisible(n); await post("/api/panel/agua", { accion: "visible", valor: n }); }}><span /></button>
      </div>
      <p className="vacio">AySA no publica los cortes en una fuente que se pueda leer sola. Cargá acá los que conozcas (por ejemplo del <a href={config.agua.paginaPublica} target="_blank" rel="noreferrer">sitio de AySA</a> o de un aviso oficial).</p>
      <form onSubmit={agregar} className="form">
        <label>Localidad
          <select {...campo("localidad")}>
            <option value="">Elegí una…</option>
            {config.localidades.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label>Calles o zona afectada<input {...campo("zona")} maxLength={160} /></label>
        <label>Desde<input type="datetime-local" {...campo("desde")} /></label>
        <label>Hasta<input type="datetime-local" {...campo("hasta")} /></label>
        <label>Motivo (opcional)<input {...campo("motivo")} maxLength={160} /></label>
        <button className="btn">Cargar corte</button>
        {msg && <p className="normal">{msg}</p>}
      </form>
      <h2>Cortes cargados</h2>
      {cortes.length === 0 && <p className="vacio">Todavía no hay cortes cargados.</p>}
      {cortes.map((c) => (
        <div key={c.id} className="fila-panel">
          <span><b>{c.localidad}</b> · {c.zona}<br /><small>{cuando(c)}{c.motivo ? ` · ${c.motivo}` : ""}</small></span>
          <button className="btn claro chico" onClick={async () => { await post("/api/panel/agua", { accion: "borrar", id: c.id }); cargar(); }}>Borrar</button>
        </div>
      ))}
    </div>
  );
}
