"use client";
import { useState } from "react";
import { MOTIVOS_ESTAFA } from "@/lib/moderacion-comun";

// Botón rojo fijo arriba de Trueque y de Trabajo: "Denunciar una estafa".
export default function DenunciarEstafa({ seccion, publicaciones }: { seccion: "trueque" | "trabajo"; publicaciones: string[] }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [publicacion, setPublicacion] = useState("");
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!motivo) return setError("Elegí qué pasó.");
    setEnviando(true);
    let disp = "";
    try { disp = localStorage.getItem("lomas-hoy:id") ?? ""; } catch {}
    try {
      const r = await fetch("/api/estafa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seccion, motivo, whatsapp, publicacion, texto, dispositivo: disp || crypto.randomUUID() }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setError(d.error ?? "No se pudo enviar. Probá de nuevo.");
      setListo(true);
    } catch {
      setError("No se pudo enviar. Revisá tu internet.");
    } finally {
      setEnviando(false);
    }
  }
  const cerrar = () => { setAbierto(false); setListo(false); setMotivo(""); setWhatsapp(""); setPublicacion(""); setTexto(""); setError(""); };

  return (
    <>
      <button className="btn denuncia-estafa" onClick={() => setAbierto(true)}>Denunciar una estafa</button>
      {abierto && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Denunciar una estafa">
          <div className="modal modal-largo">
            {listo ? (
              <>
                <p className="normal">Gracias, la vamos a revisar.</p>
                <button className="btn ancho" onClick={cerrar}>Cerrar</button>
              </>
            ) : (
              <form onSubmit={enviar} className="form">
                <button type="button" className="cancelar-form" onClick={cerrar}>✕ Cancelar</button>
                <label>¿Qué pasó?
                  <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                    <option value="">Elegí una</option>
                    {MOTIVOS_ESTAFA.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </label>
                <label>Número de WhatsApp de la persona (opcional)
                  <input type="tel" inputMode="tel" placeholder="11 5555-5555" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                </label>
                <label>Qué publicación era (opcional: elegila o escribila)
                  <input list={`pubs-${seccion}`} maxLength={150} value={publicacion} onChange={(e) => setPublicacion(e.target.value)} />
                  <datalist id={`pubs-${seccion}`}>{publicaciones.map((p) => <option key={p} value={p} />)}</datalist>
                </label>
                <label>Contanos qué pasó (opcional) ({texto.length}/300)
                  <textarea rows={3} maxLength={300} value={texto} onChange={(e) => setTexto(e.target.value)} />
                </label>
                <button className="btn grande-btn" disabled={enviando}>{enviando ? "Enviando…" : "Enviar denuncia"}</button>
                {error && <p className="error">{error}</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
