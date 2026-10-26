"use client";
import { useState } from "react";

const dispositivo = () => { try { return localStorage.getItem("lomas-hoy:id") ?? ""; } catch { return ""; } };

// "¿Qué le agregarías a Lomas Hoy?": un cuadro para escribir y Enviar. No pide ningún dato.
export default function Sugerir() {
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<"" | "enviando" | "listo">("");
  const [error, setError] = useState("");
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setEstado("enviando");
    const r = await fetch("/api/sugerencias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto, dispositivo: dispositivo() || crypto.randomUUID() }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (r?.ok) setEstado("listo");
    else { setEstado(""); setError(d?.error ?? "No se pudo enviar. Probá de nuevo."); }
  }
  if (estado === "listo") return <p className="normal">¡Gracias! Lo vamos a leer.</p>;
  return (
    <form onSubmit={enviar} className="form">
      <label>¿Qué le agregarías a Lomas Hoy? ({texto.length}/500)
        <textarea rows={6} maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn ancho" disabled={estado === "enviando" || texto.trim().length < 3}>Enviar</button>
    </form>
  );
}
