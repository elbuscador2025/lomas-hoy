"use client";
import { useState } from "react";

export default function BajarTrabajo({ token, modo }: { token: string; modo: "ofrezco" | "busco" }) {
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState("");
  const texto = modo === "busco" ? "Ya conseguí" : "Ya lo cubrí";
  async function bajar() {
    setError("");
    const r = await fetch(`/api/trabajo/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    if (r?.ok) setHecho(true); else setError("No se pudo. Probá de nuevo.");
  }
  if (hecho) return <><p className="normal">¡Qué bueno! Bajamos la publicación.</p><a className="btn" href="/">Volver a Lomas Hoy</a></>;
  return (
    <>
      <button className="btn ancho grande-btn" onClick={() => confirm(`¿${texto}? Se baja la publicación.`) && bajar()}>{texto}</button>
      {error && <p className="error">{error}</p>}
    </>
  );
}
