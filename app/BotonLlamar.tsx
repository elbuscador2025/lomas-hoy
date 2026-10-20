"use client";
import { useState } from "react";
import { telLink } from "@/lib/datos";

// Botón verde "Llamar": antes de marcar pide confirmación, para no llamar sin querer.
export default function BotonLlamar({ nombre, numero }: { nombre: string; numero: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button className="btn llamar" onClick={() => setAbierto(true)}>Llamar {numero}</button>
      {abierto && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Confirmar llamada">
          <div className="modal">
            <b>¿Llamar a {nombre} ({numero})?</b>
            <a className="btn llamar-si" href={telLink(numero)} onClick={() => setAbierto(false)}>Llamar</a>
            <button className="btn cancelar-rojo" onClick={() => setAbierto(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}
