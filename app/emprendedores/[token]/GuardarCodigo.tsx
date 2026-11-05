"use client";
import { useEffect } from "react";
import { guardarCodigoEmprendimiento } from "../../Emprendedores";

// Guarda el código del dueño en este celular y abre la publicación.
export default function GuardarCodigo({ id, token }: { id: string; token: string }) {
  useEffect(() => {
    guardarCodigoEmprendimiento(id, token);
    location.replace(`/?v=${encodeURIComponent(`emprendedores-ver:${id}`)}`);
  }, [id, token]);
  return <p className="vacio">Abriendo tu publicación…</p>;
}
