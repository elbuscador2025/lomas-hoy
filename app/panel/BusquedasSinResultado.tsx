"use client";
import { useEffect, useState } from "react";
import { post } from "./api";

// Lo que la gente buscó en la app y no encontró, de los últimos 30 días (solo el texto y cuántas veces; sin datos personales)
export default function BusquedasSinResultado() {
  const [d, setD] = useState<{ lista: { texto: string; veces: number }[]; total: number } | null>(null);
  useEffect(() => { post("/api/panel/busquedas").then((r) => r.json()).then((j) => j.ok && setD(j)).catch(() => {}); }, []);
  if (!d) return null;
  return (
    <>
      <h2>Búsquedas sin resultado (últimos 30 días)</h2>
      {d.lista.length === 0 ? <p className="vacio">Todavía no hay búsquedas sin resultado.</p> : (
        <>
          <p className="vacio">{d.total} {d.total === 1 ? "búsqueda" : "búsquedas"} en total. Es lo que la gente escribió y no encontró: sirve para saber qué agregar.</p>
          <table>
            <thead><tr><th>Lo que escribieron</th><th>Veces</th></tr></thead>
            <tbody>{d.lista.map((x) => <tr key={x.texto}><td>{x.texto}</td><td>{x.veces}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </>
  );
}
