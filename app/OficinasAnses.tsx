"use client";
import { Icono } from "./Iconos";
import BotonLlamar from "./BotonLlamar";
import Pie from "./Pie";
import { distanciaKm, distanciaTexto } from "@/lib/datos";
import { type OficinaAnses, URL_TURNOS_ANSES, URL_OFICINAS_ANSES, TEL_ANSES } from "@/lib/ansesof";

type Coord = { lat: number; lng: number };

// Pantalla "ANSES": se atiende solo con turno, el 130 para consultas y las oficinas de Lomas de Zamora (por cercanía si hay ubicación).
export default function OficinasAnses({ lista, yo, onUbicacion, errorUbicacion }: { lista: OficinaAnses[]; yo: Coord | null; onUbicacion: () => void; errorUbicacion: boolean }) {
  const km = (o: OficinaAnses) => (yo && o.lat != null && o.lng != null ? distanciaKm(yo, { lat: o.lat, lng: o.lng }) : null);
  const orden = yo ? [...lista].sort((a, b) => (km(a) ?? Infinity) - (km(b) ?? Infinity)) : lista;
  return (
    <>
      <section className="anses-turno" aria-label="Turno">
        <b className="anses-solo">Se atiende solo con turno</b>
        <a className="btn grande-btn" href={URL_TURNOS_ANSES} target="_blank" rel="noreferrer">Sacar turno</a>
      </section>
      <section className="lugar-principal" aria-label="Teléfono de ANSES">
        <span className="dato"><Icono nombre="telefono" tam={18} /> <b>{TEL_ANSES}</b> · Línea de ANSES</span>
        <BotonLlamar nombre="ANSES" numero={TEL_ANSES} />
        <small>Consultas sin ir a la oficina</small>
      </section>
      <h2>Oficinas en Lomas de Zamora</h2>
      {yo
        ? <p className="vacio">Ordenadas por cercanía a tu ubicación.</p>
        : <button className="btn claro ancho" onClick={onUbicacion}><Icono nombre="pin" tam={20} /> Ordenar por cercanía</button>}
      {errorUbicacion && <p className="aviso-pie">No pudimos obtener tu ubicación. Revisá el permiso del navegador.</p>}
      <ul className="lista">
        {orden.map((o) => {
          const d = km(o);
          const destino = o.lat != null && o.lng != null ? `${o.lat},${o.lng}` : `${o.direccion}, ${o.localidad}, Buenos Aires`;
          return (
            <li key={o.id} className="tarjeta oficina-anses">
              <span className="of-nombre">{o.nombre}</span>
              <b className="of-dir">{o.direccion}</b>
              <span className="of-loc">{o.localidad}{d != null && <> · <b>{distanciaTexto(d)}</b></>}</span>
              {o.horario && <span className="dato"><Icono nombre="reloj" tam={18} /> {o.horario}</span>}
              <div className="acciones">
                <a className="btn claro" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`}>Cómo llegar</a>
              </div>
            </li>
          );
        })}
      </ul>
      {lista.length === 0 && <p className="vacio">No hay oficinas cargadas por ahora.</p>}
      <p className="vacio">Datos de ANSES. Confirmá antes de ir.</p>
      <Pie seccion="ansesof" fuente="ANSES, oficinas de atención al público" url={URL_OFICINAS_ANSES} />
    </>
  );
}
