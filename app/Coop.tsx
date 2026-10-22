"use client";
import { useEffect, useState } from "react";
import { Icono } from "./Iconos";
import BotonLlamar from "./BotonLlamar";
import Pie from "./Pie";
import { type Coop, FUENTE_COOP, waCoop } from "@/lib/coop";

const CLAVE = "lomas-hoy:coop";

// Pantalla "COOP": elegís tu barrio y ves dónde queda, el horario y cómo comunicarte. Recuerda el último barrio elegido.
export default function CoopPantalla({ lista, inicial }: { lista: Coop[]; inicial?: string }) {
  const [id, setId] = useState("");
  useEffect(() => {
    let guardado = "";
    try { guardado = localStorage.getItem(CLAVE) ?? ""; } catch {}
    setId(inicial || guardado);
  }, [inicial]);
  const elegir = (v: string) => { setId(v); try { localStorage.setItem(CLAVE, v); } catch {} };
  const c = lista.find((x) => x.id === id);
  const mapa = c ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${c.direccion}, ${c.barrio}, Lomas de Zamora, Buenos Aires`)}` : "";
  return (
    <>
      <label className="elegir-barrio">Elegí tu barrio
        <select value={c ? id : ""} onChange={(e) => elegir(e.target.value)}>
          <option value="">Elegí tu barrio…</option>
          {lista.map((x) => <option key={x.id} value={x.id}>{x.barrio}</option>)}
        </select>
      </label>
      {c ? (
        <section className="lugar-principal" aria-label={`COOP ${c.barrio}`}>
          <h2>COOP {c.barrio}</h2>
          <span className="dato"><Icono nombre="pin" tam={18} /> {c.direccion}</span>
          {c.horario && <span className="dato"><Icono nombre="reloj" tam={18} /> {c.horario}</span>}
          {c.telefono && <><span className="dato"><Icono nombre="telefono" tam={18} /> {c.telefono}</span><BotonLlamar nombre={`COOP ${c.barrio}`} numero={c.telefono} /></>}
          <div className="acciones">
            {c.whatsapp && <a className="btn whatsapp-chico" target="_blank" rel="noreferrer" href={`https://wa.me/${waCoop(c.whatsapp)}`}><Icono nombre="whatsapp" tam={22} /> WhatsApp {c.whatsapp}</a>}
            <a className="btn claro" target="_blank" rel="noreferrer" href={mapa}>Cómo llegar</a>
          </div>
        </section>
      ) : <p className="vacio">Elegí tu barrio para ver su COOP.</p>}
      <p className="para-que"><b>¿Para qué llamar a la COOP?</b> Luminaria apagada o rota, poda y corte de pasto, árbol caído o por caerse, limpieza, baches o zanjas del barrio.</p>
      <p className="vacio">Datos del Municipio de Lomas de Zamora. Confirmá por teléfono antes de ir.</p>
      <Pie seccion="coop" fuente="Municipio de Lomas de Zamora" url={FUENTE_COOP} />
    </>
  );
}
