"use client";
import { useState } from "react";

const TEXTO = "Lomas Hoy: clima, cortes de luz y agua, farmacias, cobros y más. Gratis para los vecinos de Lomas 👉";

// Fila "Compartir por WhatsApp" + "Compartir en otras apps". Si el celular no tiene menú de compartir, se muestran Facebook, Telegram y Copiar enlace.
export default function Compartir({ onWhatsApp }: { onWhatsApp: () => void }) {
  const [alternativas, setAlternativas] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function otrasApps() {
    const url = location.origin;
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: "Lomas Hoy", text: TEXTO, url }); } catch {} // si cierra el menú no pasa nada
      return;
    }
    setAlternativas((v) => !v);
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(`${TEXTO} ${location.origin}`); setCopiado(true); window.setTimeout(() => setCopiado(false), 3000); } catch {}
  }
  const url = typeof location === "undefined" ? "" : location.origin;

  return (
    <>
      <div className="compartir-fila">
        <button className="btn whatsapp" onClick={onWhatsApp}>Compartir por WhatsApp</button>
        <button className="btn claro compartir-otras" onClick={otrasApps}>Compartir en otras apps</button>
      </div>
      {alternativas && (
        <div className="compartir-alt">
          <a className="btn claro" target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}>Facebook</a>
          <a className="btn claro" target="_blank" rel="noreferrer" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(TEXTO)}`}>Telegram</a>
          <button className="btn claro" onClick={copiar}>{copiado ? "¡Enlace copiado!" : "Copiar enlace"}</button>
        </div>
      )}
    </>
  );
}
