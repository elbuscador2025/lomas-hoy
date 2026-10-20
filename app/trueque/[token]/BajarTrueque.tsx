"use client";
import { useState } from "react";

export default function BajarTrueque({ token }: { token: string }) {
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState("");
  async function bajar() {
    setError("");
    const r = await fetch(`/api/trueque/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    if (r?.ok) setHecho(true); else setError("No se pudo. Probá de nuevo.");
  }
  if (hecho) return <><p className="normal">¡Qué bueno! Bajamos la publicación y borramos la foto.</p><a className="btn" href="/">Volver a Lomas Hoy</a></>;
  return (
    <>
      <button className="btn ancho grande-btn" onClick={() => confirm("¿Ya lo cambiaste? Se baja la publicación y se borra la foto.") && bajar()}>Ya lo cambié</button>
      {error && <p className="error">{error}</p>}
    </>
  );
}
