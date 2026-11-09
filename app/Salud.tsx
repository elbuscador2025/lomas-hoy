"use client";
import { useState } from "react";
import { mapaLink, ordenarLugares, type Lugar } from "@/lib/datos";
import { estadoHorario } from "@/lib/horarios";
import BotonLlamar from "./BotonLlamar";
import { Icono } from "./Iconos";
import Pie from "./Pie";

type Coord = { lat: number; lng: number };
type Props = { lugares: Lugar[]; yo: Coord | null; km: (l: Lugar) => number | undefined; onUbicacion: () => void; errorUbicacion: boolean; ahora: string; verTodas?: boolean; onVerTodas?: () => void };

// Guardias 24 hs: solo hospitales y la UPA. Los CAPS y salitas (aunque tengan guardia) van únicamente en Salitas.
export const tieneGuardia24 = (l: Lugar) => l.categoria === "guardias"; // solo hospitales y UPA: los CAPS y salitas van únicamente en Salitas
export const esSalita = (l: Lugar) => l.categoria === "salitas";

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

function Tarjeta({ l, km, horario, estado, grande }: { l: Lugar; km?: number; horario?: boolean; estado?: ReturnType<typeof estadoHorario>; grande?: boolean }) {
  return (
    <li className={`lugar salud-card${grande ? " grande" : ""}`}>
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
        <b className="emergencia-t">Emergencia: llamá al 107 · Ambulancia</b>
        <BotonLlamar nombre="Ambulancia" numero="107" />
        <span className="emergencia-911">Policía y emergencias: <b>911</b></span>
        <BotonLlamar nombre="Emergencias" numero="911" />
      </section>
      {p.yo ? <p className="vacio">Ordenado por cercanía a tu ubicación.</p> : <p className="aviso-pie">Activá tu ubicación para ver la más cercana</p>}
      <ul className="lista">{(p.verTodas ? lista : lista.slice(0, 3)).map((l) => <Tarjeta key={l.id} l={l} km={p.km(l)} grande />)}</ul>
      {!p.verTodas && lista.length > 3 && <button className="btn claro ancho" onClick={p.onVerTodas}>Ver todas ({lista.length})</button>}
      {lista.length === 0 && <p className="vacio">No hay guardias cargadas por ahora.</p>}
    </>
  );
}

// Farmacias de 24 horas (siempre abiertas, también de noche y feriados). Teléfonos de la web oficial de Farma24; el de Econofarma lo confirmó el dueño de la app llamando.
const FARMA24 = { fuente: "Farma24 – sucursales (sitio oficial)", fuenteUrl: "https://www.farma24.com.ar/p/sucursales" };
const FARMACIAS_24: Lugar[] = [
  { id: "f24-farma24-8101", categoria: "farmacias", nombre: "Farma24+", direccion: "Av. Hipólito Yrigoyen 8101", localidad: "Lomas de Zamora", telefonos: ["011 4242-4000"], horario: "Abierta las 24 hs", ...FARMA24 },
  { id: "f24-econofarma-9301", categoria: "farmacias", nombre: "Econofarma", direccion: "Av. Hipólito Yrigoyen 9301", localidad: "Lomas de Zamora", telefonos: ["011 2178-7719"], horario: "Abierta las 24 hs", fuente: "Confirmado por teléfono", fuenteUrl: "" },
  { id: "f24-hiper-temperley-324", categoria: "farmacias", nombre: "Hiper Temperley", direccion: "Dorrego 324", localidad: "Temperley", telefonos: ["011 4292-6230"], horario: "Abierta las 24 hs", ...FARMA24 },
];

// Farmacias: primero el botón de Google Maps (abiertas cerca), después las de 24 horas. La lista grande de PAMI no se muestra (queda en la base y en el panel).
export function FarmaciasPantalla({ mapa }: { mapa: string }) {
  return (
    <>
      <a className="btn grande-btn" target="_blank" rel="noreferrer" href={mapa}>🕒 Ver farmacias abiertas cerca tuyo</a>
      <h2 className="farm-titulo">🌙 De noche y feriados: abiertas las 24 horas</h2>
      <p className="farm-sub">Si no encontrás ninguna abierta cerca, estas nunca cierran</p>
      <ul className="lista">{FARMACIAS_24.map((l) => <Tarjeta key={l.id} l={l} grande />)}</ul>
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
