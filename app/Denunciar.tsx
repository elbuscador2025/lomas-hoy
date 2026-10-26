"use client";
import { useState } from "react";
import { MOTIVOS, MOTIVOS_PASA } from "@/lib/moderacion-comun";

// Botón "Denunciar" de cada publicación de Trueque y Trabajo para mayores de 50 años.
export default function Denunciar({ seccion, id }: { seccion: "trueque" | "trabajo" | "pasa"; id: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<"" | "enviando" | "listo" | "error">("");

  async function enviar(motivo: string) {
    setEstado("enviando");
    let disp = "";
    try { disp = localStorage.getItem("lomas-hoy:id") ?? ""; } catch {}
    const r = await fetch("/api/denunciar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seccion, id, motivo, dispositivo: disp || crypto.randomUUID() }) }).catch(() => null);
    setEstado(r?.ok ? "listo" : "error");
  }

  if (estado === "listo") return <small className="chico">Gracias, la vamos a revisar.</small>;
  return (
    <>
      <button className="denunciar" onClick={() => { setEstado(""); setAbierto(true); }}>Denunciar</button>
      {abierto && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Denunciar">
          <div className="modal">
            <b>¿Por qué la denunciás?</b>
            {(seccion === "pasa" ? MOTIVOS_PASA : MOTIVOS).map((m) => <button key={m} className="btn claro ancho" disabled={estado === "enviando"} onClick={() => enviar(m)}>{m}</button>)}
            {estado === "error" && <p className="error">No se pudo enviar. Probá de nuevo.</p>}
            <button className="btn cancelar-rojo" onClick={() => setAbierto(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}
