"use client";
import { useEffect, useState } from "react";
import { post } from "./api";
import type { EstadoEnlaces } from "@/lib/enlaces";

// Una línea con el resultado del control semanal de enlaces: "todo OK" o la lista de los que fallan.
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "numeric" });

export default function ControlEnlaces() {
  const [e, setE] = useState<EstadoEnlaces | null | undefined>(undefined);
  useEffect(() => { post("/api/panel/enlaces", { accion: "estado" }).then((r) => r.json()).then((j) => setE(j.ok ? j.estado : null)).catch(() => setE(null)); }, []);
  if (e === undefined) return null;
  if (!e) return <section className="emp-aviso" aria-label="Control de enlaces">🔗 Último control de enlaces: todavía no se hizo (se hace solo, una vez por semana).</section>;
  const rotos = e.resultados.filter((r) => !r.ok), sinVerificar = e.resultados.filter((r) => r.ok && r.sinVerificar).length;
  return (
    <section className={`emp-aviso${rotos.length ? " emp-aviso-rojo" : ""}`} aria-label="Control de enlaces">
      🔗 Último control de enlaces: {fecha(e.ultimo)} · {rotos.length ? <b>fallan {rotos.length} de {e.total}</b> : <b>todo OK</b>}{sinVerificar > 0 && <span style={{ fontWeight: 400 }}> ({sinVerificar} del Municipio y otros sitios no se pueden verificar a fondo: certificado incompleto del sitio)</span>}
      {rotos.length > 0 && (
        <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontWeight: 400 }}>
          {rotos.map((r) => <li key={r.url} style={{ overflowWrap: "anywhere" }}><b>{r.seccion}</b>: <a href={r.url} target="_blank" rel="noreferrer">{r.url}</a> ({r.detalle}{r.semanas > 1 ? ` · ${r.semanas} controles seguidos` : ""})</li>)}
        </ul>
      )}
    </section>
  );
}
