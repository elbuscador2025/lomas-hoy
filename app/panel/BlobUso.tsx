"use client";
import { useEffect, useState } from "react";
import { post } from "./api";

// Cuántas subidas de fotos (operaciones avanzadas de Vercel Blob) van en el mes. El plan gratis permite 2.000: pasado eso, Blob se corta hasta 30 días después.
export default function BlobUso() {
  const [u, setU] = useState<{ operaciones: number; limite: number; aviso: boolean } | null>(null);
  useEffect(() => { post("/api/panel/blob").then((r) => r.json()).then((j) => j.ok && setU(j)).catch(() => {}); }, []);
  if (!u) return null;
  const pct = Math.round((u.operaciones / u.limite) * 100);
  return (
    <section className={`emp-aviso${u.aviso ? " emp-aviso-rojo" : ""}`} aria-label="Uso de fotos">
      {u.aviso ? "⚠️ " : "📷 "}Fotos subidas este mes: <b>{u.operaciones} de {u.limite}</b> ({pct}%).
      {u.aviso ? " Ya pasó el 80% del límite gratis: si se llega a 2.000, las fotos dejan de funcionar hasta 30 días después." : " El plan gratis permite 2.000 por mes."}
    </section>
  );
}
