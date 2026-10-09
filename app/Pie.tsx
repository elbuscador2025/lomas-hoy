"use client";
import { useState } from "react";
import { config } from "@/lomas.config.mjs";
import { hora, type Fila } from "@/lib/datos";

// Pie de cada dato: fuente, hora de actualización y botón "Avisar error".
export default function Pie({ seccion, fuente, url, fila, minutosViejo }: { seccion: string; fuente: string; url?: string; fila?: Fila<unknown>; minutosViejo?: number }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [falloEnvio, setFalloEnvio] = useState(false);
  const viejo = fila?.ok_en && Date.now() - new Date(fila.ok_en).getTime() > (minutosViejo ?? config.horasParaAvisarDatoViejo * 60) * 60_000;

  async function enviar() {
    try {
      const r = await fetch("/api/reporte", { method: "POST", body: JSON.stringify({ seccion, mensaje: texto }) });
      if (!r.ok) throw new Error();
      setEnviado(true);
    } catch {
      setFalloEnvio(true);
    }
  }

  return (
    <div className="pie">
      <span>
        Fuente: {url ? <a href={url} target="_blank" rel="noreferrer">{fuente}</a> : fuente}
        {fila?.ok_en && <> · Actualizado {hora(fila.ok_en)} hs</>}
      </span>
      {fila?.error && fila.ok_en && (
        <span className="aviso-pie">La última lectura falló; se muestra el dato de las {hora(fila.ok_en)} hs.</span>
      )}
      {viejo && <span className="aviso-pie">Este dato puede estar desactualizado.</span>}
      {enviado ? (
        <span>¡Gracias! Recibimos tu aviso.</span>
      ) : abierto ? (
        <span className="avisar">
          <input maxLength={300} placeholder="¿Qué está mal? (opcional)" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <button className="btn chico" onClick={enviar}>Enviar</button>
          {falloEnvio && <span className="aviso-pie">No se pudo enviar. Probá más tarde.</span>}
        </span>
      ) : (
        <button className="link" onClick={() => setAbierto(true)}>Avisar error</button>
      )}
    </div>
  );
}
