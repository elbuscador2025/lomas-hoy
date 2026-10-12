"use client";
import { useCallback, useEffect, useState } from "react";
import { terminaciones, fechaPago, URL_ANSES, type PagoAnses } from "@/lib/anses";
import { post } from "./api";

// Pestaña "ANSES": carga simple por mes. ANSES no tiene una fuente pública que se pueda leer sola.
export default function PanelAnses() {
  const [entradas, setEntradas] = useState<PagoAnses[]>([]);
  const [v, setV] = useState({ prestacion: "", dnis: "", fecha: "" });
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    const r = await post("/api/panel/anses", { accion: "listar" });
    if (r.ok) setEntradas((await r.json()).entradas);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    const r = await post("/api/panel/anses", { accion: "agregar", ...v });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Agregado." : d.error ?? "No se pudo agregar.");
    if (r.ok) { setV({ ...v, dnis: "" }); cargar(); } // se conservan la prestación y la fecha para cargar la siguiente
  }

  const meses = [...new Set(entradas.map((e) => e.fecha.slice(0, 7)))];
  return (
    <div>
      <p className="vacio">Copiá las fechas del <a href={URL_ANSES} target="_blank" rel="noreferrer">calendario oficial de ANSES</a>, una por una. Si el mes no tiene datos, la app dice “Calendario de este mes todavía sin publicar”.</p>
      <form onSubmit={agregar} className="form">
        <label>Prestación (por ejemplo Jubilaciones y pensiones)<input value={v.prestacion} onChange={(e) => setV({ ...v, prestacion: e.target.value })} /></label>
        <label>Terminación de DNI (por ejemplo 4 y 5)<input inputMode="numeric" value={v.dnis} onChange={(e) => setV({ ...v, dnis: e.target.value })} /></label>
        <label>Fecha de pago<input type="date" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></label>
        <button className="btn">Agregar</button>
        {msg && <p className="normal">{msg}</p>}
      </form>
      {meses.length === 0 && <p className="vacio">Todavía no hay fechas cargadas.</p>}
      {meses.map((m) => (
        <div key={m}>
          <h2>{m}</h2>
          {entradas.filter((e) => e.fecha.startsWith(m)).map((e) => (
            <div key={e.id} className="fila-panel">
              <span><b>{e.prestacion}</b><br /><small>DNI terminado en {terminaciones(e.dnis)} · {fechaPago(e.fecha)}</small></span>
              <button className="btn claro chico" onClick={async () => { await post("/api/panel/anses", { accion: "borrar", id: e.id }); cargar(); }}>Borrar</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
