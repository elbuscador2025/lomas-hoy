"use client";
import { useState } from "react";
import { post } from "./api";

// "Cambiar mi contraseña": la actual y la nueva dos veces.
export default function MiCuenta() {
  const [v, setV] = useState({ actual: "", nueva: "", repetir: "" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setError("");
    const r = await post("/api/panel/cuenta", v);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setError(d.error ?? "No se pudo cambiar.");
    setV({ actual: "", nueva: "", repetir: "" });
    setMsg("Contraseña cambiada.");
  }
  return (
    <details className="seccion-chica">
      <summary>Cambiar mi contraseña</summary>
      <form onSubmit={guardar} className="form">
        <label>Contraseña actual<input type="password" autoComplete="current-password" value={v.actual} onChange={(e) => setV({ ...v, actual: e.target.value })} /></label>
        <label>Contraseña nueva (mínimo 8)<input type="password" autoComplete="new-password" value={v.nueva} onChange={(e) => setV({ ...v, nueva: e.target.value })} /></label>
        <label>Repetí la contraseña nueva<input type="password" autoComplete="new-password" value={v.repetir} onChange={(e) => setV({ ...v, repetir: e.target.value })} /></label>
        <button className="btn">Guardar</button>
        {error && <p className="error">{error}</p>}
        {msg && <p className="normal">{msg}</p>}
      </form>
    </details>
  );
}
