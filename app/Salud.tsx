"use client";
import { useState } from "react";
import { mapaLink, ordenarLugares, type Lugar } from "@/lib/datos";
import { estadoHorario } from "@/lib/horarios";
import BotonLlamar from "./BotonLlamar";
import { Icono } from "./Iconos";
import Pie from "./Pie";

type Coord = { lat: number; lng: number };
type Props = { lugares: Lugar[]; yo: Coord | null; km: (l: Lugar) => number | undefined; onUbicacion: () => void; errorUbicacion: boolean; ahora: string };

// Guardia 24 hs: los hospitales y UPA, y los centros de salud cuyo horario dice "Guardia 24 hs". Si no se sabe, va a Salitas.
export const tieneGuardia24 = (l: Lugar) => l.categoria === "guardias" || (l.categoria === "salitas" && /24\s*hs/i.test(l.horario));
export const esSalita = (l: Lugar) => l.categoria === "salitas" && !tieneGuardia24(l);

const distancia = (km?: number) => (km != null && Number.isFinite(km) ? ` · a ${km < 10 ? km.toFixed(1).replace(".", ",") : Math.round(km)} km` : "");

function Ubicacion({ yo, onUbicacion, errorUbicacion }: Pick<Props, "yo" | "onUbicacion" | "errorUbicacion">) {
  return (
    <>
      {yo
        ? <p className="vacio">Ordenado por cercanía a tu ubicación.</p>
        : <button className="btn claro ancho" onClick={onUbicacion}><Icono nombre="pin" tam={20} /> Ordenar por cercanía</button>}
      {errorUbicacion && <p className="aviso-pie">No pudimos obtener tu ubicación. Revisá el permiso del navegador.</p>}
    </>
  );
}

function Tarjeta({ l, km, horario, estado }: { l: Lugar; km?: number; horario?: boolean; estado?: ReturnType<typeof estadoHorario> }) {
  return (
    <li className="lugar salud-card">
      <b>{l.nombre}</b>
      <b className="salud-dir">{l.direccion || "Sin dirección cargada"}{l.localidad ? `, ${l.localidad}` : ""}</b>
      {km != null && <span className="salud-km">{distancia(km).replace(" · ", "")}</span>}
      {horario && l.horario && <span className="dato"><Icono nombre="reloj" tam={18} /> {l.horario}</span>}
      {estado && <span className={`pildora estado-horario ${estado.tipo}`}>{estado.texto}</span>}
      <div className="acciones">
        {l.telefonos.map((t) => <BotonLlamar key={t} nombre={l.nombre} numero={t} />)}
        {l.direccion && <a className="btn claro salud-llegar" href={mapaLink(l)} target="_blank" rel="noreferrer">Cómo llegar</a>}
      </div>
      <Pie seccion={`lugar:${l.id}`} fuente={l.fuente} url={l.fuenteUrl} />
    </li>
  );
}

export function GuardiasPantalla(p: Props) {
  const lista = ordenarLugares(p.lugares.filter(tieneGuardia24), p.yo);
  return (
    <>
      <section className="emergencia" aria-label="Emergencia">
        <b className="emergencia-t">Emergencia: llamá al 107 (SAME)</b>
        <BotonLlamar nombre="SAME" numero="107" />
        <span className="emergencia-911">Policía y emergencias: <b>911</b></span>
        <BotonLlamar nombre="Emergencias" numero="911" />
      </section>
      <Ubicacion {...p} />
      <ul className="lista">{lista.map((l) => <Tarjeta key={l.id} l={l} km={p.km(l)} />)}</ul>
      {lista.length === 0 && <p className="vacio">No hay guardias cargadas por ahora.</p>}
    </>
  );
}

export function SalitasPantalla(p: Props) {
  const [barrio, setBarrio] = useState("");
  const todas = p.lugares.filter(esSalita);
  const barrios = [...new Set(todas.map((l) => l.localidad).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const lista = ordenarLugares(todas.filter((l) => !barrio || l.localidad === barrio), p.yo);
  return (
    <>
      <p className="salud-aviso">Las salitas no atienden emergencias. Para una urgencia, andá a una guardia 24 hs o llamá al 107.</p>
      <Ubicacion {...p} />
      {todas.length > 10 && (
        <label className="elegir-barrio">
          <select value={barrio} onChange={(e) => setBarrio(e.target.value)} aria-label="Barrio">
            <option value="">📍 Todo Lomas</option>
            {barrios.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
      )}
      <ul className="lista">{lista.map((l) => <Tarjeta key={l.id} l={l} km={p.km(l)} horario estado={estadoHorario(l.horario, p.ahora)} />)}</ul>
      {lista.length === 0 && <p className="vacio">No hay salitas cargadas por ahora.</p>}
    </>
  );
}
