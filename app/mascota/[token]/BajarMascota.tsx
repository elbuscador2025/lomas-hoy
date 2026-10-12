"use client";
import { useState } from "react";

export default function BajarMascota({ token }: { token: string }) {
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState("");
  async function bajar() {
    setError("");
    const r = await fetch(`/api/mascotas/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    if (r?.ok) setHecho(true); else setError("No se pudo. Probá de nuevo.");
  }
  if (hecho) return <><p className="normal">¡Qué alegría! Bajamos la publicación y borramos la foto.</p><a className="btn" href="/">Volver a Lomas Hoy</a></>;
  return (
    <>
      <button className="btn ancho grande-btn" onClick={() => confirm("¿Ya apareció? Se baja la publicación y se borra la foto.") && bajar()}>Ya apareció</button>
      {error && <p className="error">{error}</p>}
    </>
  );
}
