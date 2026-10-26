"use client";
import { useCallback, useEffect, useState } from "react";
import { post } from "./api";

type Sug = { id: string; texto: string; t: string };
const fecha = (iso: string) => new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short", hour12: false });

// Pestaña "Sugerencias": lo que mandan los vecinos, de la más nueva a la más vieja. No son públicas.
export default function PanelSugerencias() {
  const [lista, setLista] = useState<Sug[]>([]);
  const cargar = useCallback(async () => { const r = await post("/api/panel/sugerencias", { accion: "listar" }); if (r.ok) setLista((await r.json()).sugerencias); }, []);
  useEffect(() => { cargar(); }, [cargar]);
  return (
    <div>
      <h2>Sugerencias ({lista.length})</h2>
      {lista.length === 0 && <p className="vacio">Todavía no hay sugerencias.</p>}
      {lista.map((s) => (
        <div key={s.id} className="fila-panel">
          <span><small>{fecha(s.t)}</small><br />{s.texto}</span>
          <button className="btn claro chico" onClick={async () => { await post("/api/panel/sugerencias", { accion: "borrar", id: s.id }); cargar(); }}>Borrar</button>
        </div>
      ))}
    </div>
  );
}
