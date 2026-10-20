"use client";
import { mapaLink, type Lugar } from "@/lib/datos";
import BotonLlamar from "./BotonLlamar";
import { Icono } from "./Iconos";
import Pie from "./Pie";

export default function LugarCard({ lugar: l, km }: { lugar: Lugar; km?: number }) {
  return (
    <li className="lugar">
      <b>{l.nombre}</b>
      {l.etiqueta && <span className="pildora ok etiqueta">{l.etiqueta}</span>}
      {l.direccion && (
        <span>{l.direccion}{l.localidad ? `, ${l.localidad}` : ""}{km != null && Number.isFinite(km) ? ` · a ${km.toFixed(1)} km` : ""}</span>
      )}
      {l.horario
        ? <span className="dato"><Icono nombre="reloj" tam={18} /> {l.horario}</span>
        : l.categoria === "veterinarias" && l.telefonos.length > 0 && <span className="dato"><Icono nombre="reloj" tam={18} /> Consultá el horario por teléfono</span>}
      {l.telefonos.length > 0 && <span className="dato"><Icono nombre="telefono" tam={18} /> {l.telefonos.join(" · ")}</span>}
      <div className="acciones">
        {l.telefonos.map((t) => <BotonLlamar key={t} nombre={l.nombre} numero={t} />)}
        {l.direccion && (
          <a className="btn claro" href={mapaLink(l)} target="_blank" rel="noreferrer">Cómo llegar</a>
        )}
      </div>
      {(l.telefonos.length > 0 || l.direccion) && <small>Confirmá por teléfono antes de ir.</small>}
      <Pie seccion={`lugar:${l.id}`} fuente={l.fuente} url={l.fuenteUrl} />
    </li>
  );
}
