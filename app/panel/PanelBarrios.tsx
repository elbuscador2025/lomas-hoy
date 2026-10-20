"use client";
import { useCallback, useEffect, useState } from "react";
import { post } from "./api";

// Pestaña "Barrios": la lista que se usa en Mascotas y Trueque.
export default function PanelBarrios() {
  const [barrios, setBarrios] = useState<string[]>([]);
  const [barrioNuevo, setBarrioNuevo] = useState("");
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    const r = await post("/api/panel/barrios", { accion: "listar" });
    if (r.ok) setBarrios((await r.json()).barrios);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function accion(cuerpo: object, ok = "Listo.") {
    const r = await post("/api/panel/barrios", cuerpo);
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? ok : d.error ?? "No se pudo.");
    if (r.ok) cargar();
    return r.ok;
  }

  return (
    <div>
      {msg && <p className="normal">{msg}</p>}
      <h2>Barrios</h2>
      <p className="vacio">Son los que se pueden elegir al publicar en Mascotas y en Trueque.</p>
      {barrios.map((b) => (
        <div key={b} className="fila-panel">
          <b>{b}</b>
          <span className="acciones">
            <button className="btn claro chico" onClick={() => { const nuevo = prompt(`Nuevo nombre para "${b}":`, b); if (nuevo && nuevo !== b) accion({ accion: "renombrarBarrio", viejo: b, nuevo }, "Barrio renombrado."); }}>Renombrar</button>
            <button className="btn claro chico" onClick={() => confirm(`¿Quitar "${b}" de la lista?`) && accion({ accion: "quitarBarrio", nombre: b }, "Barrio quitado.")}>Quitar</button>
          </span>
        </div>
      ))}
      <form className="avisar" onSubmit={async (e) => { e.preventDefault(); if (await accion({ accion: "agregarBarrio", nombre: barrioNuevo }, "Barrio agregado.")) setBarrioNuevo(""); }}>
        <input placeholder="Barrio nuevo" value={barrioNuevo} onChange={(e) => setBarrioNuevo(e.target.value)} />
        <button className="btn chico">Agregar</button>
      </form>
    </div>
  );
}
