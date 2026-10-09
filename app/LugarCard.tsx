"use client";
import { telLink, mapaLink, type Lugar } from "@/lib/datos";
import Pie from "./Pie";

export default function LugarCard({ lugar: l, km }: { lugar: Lugar; km?: number }) {
  return (
    <li className="lugar">
      <b>{l.nombre}</b>
      {l.direccion && (
        <span>{l.direccion}{l.localidad ? `, ${l.localidad}` : ""}{km != null && Number.isFinite(km) ? ` · a ${km.toFixed(1)} km` : ""}</span>
      )}
      {l.horario && <span>🕒 {l.horario}</span>}
      {l.telefonos.length > 0 && <span>📞 {l.telefonos.join(" · ")}</span>}
      <div className="acciones">
        {l.telefonos.map((t) => (
          <a key={t} className="btn" href={telLink(t)}>{l.telefonos.length > 1 ? `Llamar ${t}` : "Llamar"}</a>
        ))}
        {l.direccion && (
          <a className="btn claro" href={mapaLink(l)} target="_blank" rel="noreferrer">Cómo llegar</a>
        )}
      </div>
      {(l.telefonos.length > 0 || l.direccion) && <small>Confirmá por teléfono antes de ir.</small>}
      <Pie seccion={`lugar:${l.id}`} fuente={l.fuente} url={l.fuenteUrl} />
    </li>
  );
}
