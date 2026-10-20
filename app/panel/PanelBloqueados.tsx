"use client";
import { useCallback, useEffect, useState } from "react";
import { post } from "./api";

type Bloqueo = { id: string; whatsapp: string; t: string; nota: string };
const fecha = (iso: string) => new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short", hour12: false });

// Pestaña "Bloqueados": quienes ya no pueden publicar en Trueque ni en Trabajo +50.
export default function PanelBloqueados() {
  const [lista, setLista] = useState<Bloqueo[]>([]);
  const cargar = useCallback(async () => {
    const r = await post("/api/panel/bloqueos", { accion: "listar" });
    if (r.ok) setLista((await r.json()).bloqueados);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  return (
    <div>
      <h2>Bloqueados ({lista.length})</h2>
      <p className="vacio">No pueden publicar en Trueque ni en Trabajo +50 (ni ese número ni ese celular).</p>
      {lista.length === 0 && <p className="vacio">No hay nadie bloqueado.</p>}
      {lista.map((b) => (
        <div key={b.id} className="fila-panel">
          <span><b>{b.whatsapp}</b><br /><small>{fecha(b.t)} · {b.nota}</small></span>
          <button className="btn claro chico" onClick={async () => { await post("/api/panel/bloqueos", { accion: "desbloquear", id: b.id }); cargar(); }}>Desbloquear</button>
        </div>
      ))}
    </div>
  );
}
