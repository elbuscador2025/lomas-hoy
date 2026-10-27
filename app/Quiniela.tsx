"use client";
import { useEffect, useState } from "react";
import { SORTEOS } from "@/scripts/quiniela.mjs";
import { diasDe, ultimoDe, fechaLinda, type Quiniela, type Quini6, type Jurisdiccion } from "@/lib/quiniela-comun";

// Quiniela y Quini 6: solo resultados. Nada de dónde jugar, agencias ni enlaces para apostar.
const Boton = ({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button role="tab" aria-selected={activo} className={`btn quin-boton ${activo ? "activo" : ""}`} onClick={onClick}>{children}</button>
);

function Resultado({ quiniela, hoy }: { quiniela: Quiniela | null | undefined; hoy: string }) {
  const { hoy: dHoy, ayer: dAyer } = diasDe(quiniela, hoy);
  const [dia, setDia] = useState<"hoy" | "ayer">("hoy");
  const [jur, setJur] = useState<Jurisdiccion>("provincia");
  const [elegido, setElegido] = useState<string | null>(null);
  const actual = dia === "hoy" ? dHoy : dAyer;
  useEffect(() => setElegido(null), [dia, jur]);
  const ultimo = ultimoDe(actual, jur);
  const id = elegido ?? ultimo?.id ?? SORTEOS[0].id; // se abre solo en el último que salió
  const s = SORTEOS.find((x) => x.id === id)!;
  const r = actual?.sorteos[id]?.[jur] ?? null;
  const ayerSinSerAyer = dia === "ayer" && dAyer && new Date(`${hoy}T12:00:00-03:00`).getTime() - new Date(`${dAyer.fecha}T12:00:00-03:00`).getTime() > 86400_000 * 1.5;
  const fechaMostrada = dia === "hoy" ? hoy : dAyer?.fecha;

  return (
    <>
      <div className="quin-fila" role="tablist" aria-label="Día">
        <Boton activo={dia === "hoy"} onClick={() => setDia("hoy")}>Hoy</Boton>
        <Boton activo={dia === "ayer"} onClick={() => setDia("ayer")}>Ayer</Boton>
      </div>
      {dia === "ayer" && dAyer && <p className="quin-fecha">{ayerSinSerAyer ? `El último día con sorteos fue el ${fechaLinda(dAyer.fecha)}` : fechaLinda(dAyer.fecha)}</p>}
      <div className="quin-fila" role="tablist" aria-label="Quiniela">
        <Boton activo={jur === "provincia"} onClick={() => setJur("provincia")}>Provincia</Boton>
        <Boton activo={jur === "nacional"} onClick={() => setJur("nacional")}>Nacional</Boton>
      </div>
      <div className="quin-sorteos" role="tablist" aria-label="Sorteo">
        {SORTEOS.map((x) => <Boton key={x.id} activo={id === x.id} onClick={() => setElegido(x.id)}>{x.nombre}</Boton>)}
      </div>
      {dia === "ayer" && !dAyer ? <p className="vacio">Sin datos por ahora.</p>
        : r && fechaMostrada ? (
          <section className="quin-resultado" aria-label={`${s.nombre} ${jur}`}>
            <p className="quin-titulo">{s.nombre} · {fechaLinda(fechaMostrada)} · {actual?.sorteos[id]?.hora ?? s.hora} hs</p>
            <div className="quin-cabeza"><small>Cabeza</small><b>{r[0]}</b></div>
            <ol className="quin-grilla">
              {r.map((n, i) => <li key={i}><span>{i + 1}</span><b>{n}</b></li>)}
            </ol>
          </section>
        ) : (
          <section className="quin-resultado quin-aun"><p className="quin-titulo">{s.nombre}</p><p>Todavía no salió · se sortea a las {s.hora}</p></section>
        )}
    </>
  );
}

function Quini({ quini }: { quini: Quini6 | null | undefined }) {
  const [anterior, setAnterior] = useState(false);
  const lista = quini?.sorteos ?? [];
  const s = lista[anterior ? 1 : 0];
  if (!s) return <p className="vacio">Sin datos por ahora.</p>;
  return (
    <>
      <p className="quin-titulo">Quini 6 · {fechaLinda(s.fecha)} · Sorteo {s.sorteo}</p>
      {s.modalidades.map((m) => (
        <section key={m.nombre} className="quin-modalidad" aria-label={m.nombre}>
          <h2>{m.nombre}</h2>
          <ol className="quin-bolitas">{m.numeros.map((n, i) => <li key={i}>{n}</li>)}</ol>
        </section>
      ))}
      {lista[1] && <button className="btn claro ancho" onClick={() => setAnterior((v) => !v)}>{anterior ? "Ver el último sorteo" : "Sorteo anterior"}</button>}
    </>
  );
}

export default function QuinielaPantalla({ quiniela, quini, hoy }: { quiniela: Quiniela | null | undefined; quini: Quini6 | null | undefined; hoy: string }) {
  const [modo, setModo] = useState<"quiniela" | "quini">("quiniela");
  return (
    <>
      <div className="quin-fila" role="tablist" aria-label="Juego">
        <Boton activo={modo === "quiniela"} onClick={() => setModo("quiniela")}>Quiniela</Boton>
        <Boton activo={modo === "quini"} onClick={() => setModo("quini")}>Quini 6</Boton>
      </div>
      {modo === "quiniela" ? <Resultado quiniela={quiniela} hoy={hoy} /> : <Quini quini={quini} />}
      <p className="vacio">Controlá siempre tu boleta en la agencia.</p>
    </>
  );
}
