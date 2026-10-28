"use client";
import { useEffect, useRef, useState } from "react";
import { BotonSonido, useSonido } from "./comun";

// TA-TE-TI: tablero de 3 x 3, contra la computadora o contra otra persona en el mismo celular.
type Marca = "X" | "O" | null;
type Modo = "compu" | "dos";
const LINEAS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
export const ganadora = (t: Marca[]) => { for (const l of LINEAS) if (t[l[0]] && t[l[0]] === t[l[1]] && t[l[0]] === t[l[2]]) return { marca: t[l[0]] as "X" | "O", linea: l }; return null; };
const lleno = (t: Marca[]) => t.every(Boolean);

// La compu: casi siempre juega bien (gana si puede, bloquea, centro, esquinas), pero 1 de cada 4 veces mueve al azar: se le puede ganar.
export function jugadaCompu(t: Marca[]): number {
  const libres = t.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0);
  if (Math.random() < 0.25) return libres[Math.floor(Math.random() * libres.length)];
  const busca = (m: "X" | "O") => libres.find((i) => { const c = [...t]; c[i] = m; return ganadora(c)?.marca === m; });
  const g = busca("O"); if (g !== undefined) return g;
  const b = busca("X"); if (b !== undefined) return b;
  if (t[4] === null) return 4;
  const esq = [0, 2, 6, 8].filter((i) => t[i] === null);
  if (esq.length) return esq[Math.floor(Math.random() * esq.length)];
  return libres[Math.floor(Math.random() * libres.length)];
}
const CLAVE = "lomas-hoy:juego:tateti-marcador";
type Marcador = { compu: { vos: number; compu: number; empates: number }; dos: { x: number; o: number; empates: number } };
const VACIO: Marcador = { compu: { vos: 0, compu: 0, empates: 0 }, dos: { x: 0, o: 0, empates: 0 } };

export default function TaTeTi() {
  const { activo, sonar, alternar } = useSonido();
  const [modo, setModo] = useState<Modo | null>(null);
  const [t, setT] = useState<Marca[]>(Array(9).fill(null));
  const [turno, setTurno] = useState<"X" | "O">("X");
  const [empieza, setEmpieza] = useState<"X" | "O">("X");
  const [marcador, setMarcador] = useState<Marcador>(VACIO);
  const piensa = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { try { const g = JSON.parse(localStorage.getItem(CLAVE) ?? "null"); if (g?.compu && g?.dos) setMarcador(g); } catch {} }, []);
  useEffect(() => () => { if (piensa.current) clearTimeout(piensa.current); }, []);
  const guardar = (m: Marcador) => { setMarcador(m); try { localStorage.setItem(CLAVE, JSON.stringify(m)); } catch {} };

  const g = ganadora(t), empate = !g && lleno(t), terminada = !!g || empate;
  // cuando termina una partida se suma al marcador (una sola vez)
  const sumado = useRef(false);
  useEffect(() => {
    if (!modo) return;
    if (!terminada) { sumado.current = false; return; }
    if (sumado.current) return;
    sumado.current = true;
    const m: Marcador = JSON.parse(JSON.stringify(marcador));
    if (modo === "compu") { if (g) { if (g.marca === "X") m.compu.vos++; else m.compu.compu++; } else m.compu.empates++; }
    else { if (g) { if (g.marca === "X") m.dos.x++; else m.dos.o++; } else m.dos.empates++; }
    guardar(m);
    sonar(g ? (modo === "compu" && g.marca === "O" ? "fin" : "gana") : "empate");
  }, [terminada]); // eslint-disable-line react-hooks/exhaustive-deps

  // turno de la compu (juega con la O)
  useEffect(() => {
    if (modo !== "compu" || terminada || turno !== "O") return;
    piensa.current = setTimeout(() => {
      setT((a) => { const i = jugadaCompu(a); if (a[i]) return a; const c = [...a]; c[i] = "O"; return c; });
      sonar("marcar2");
      setTurno("X");
    }, 480);
    return () => { if (piensa.current) clearTimeout(piensa.current); };
  }, [modo, turno, terminada, sonar]);

  const tocar = (i: number) => {
    if (!modo || t[i] || terminada || (modo === "compu" && turno !== "X")) return;
    const c = [...t]; c[i] = turno; setT(c);
    sonar(turno === "X" ? "marcar" : "marcar2");
    setTurno(turno === "X" ? "O" : "X");
  };
  const nueva = () => { const prox = empieza === "X" ? "O" : "X"; setEmpieza(prox); setT(Array(9).fill(null)); setTurno(prox); };
  const empezar = (m: Modo) => { setModo(m); setT(Array(9).fill(null)); setEmpieza("X"); setTurno("X"); };
  const borrarMarcador = () => guardar(VACIO);

  if (!modo)
    return (
      <div className="jg jg-ttt">
        <p className="jg-ayuda">¿Cómo querés jugar?</p>
        <button className="jg-grande ancho" onClick={() => empezar("compu")}>🤖 Contra la computadora</button>
        <button className="jg-grande ancho" onClick={() => empezar("dos")}>👥 Entre dos personas</button>
        <BotonSonido activo={activo} onClick={alternar} />
      </div>
    );

  const m = marcador[modo];
  const nombre = (x: "X" | "O") => (modo === "compu" ? (x === "X" ? "Vos" : "La compu") : `Jugador ${x}`);
  const mensaje = g ? (modo === "compu" ? (g.marca === "X" ? "¡Ganaste! 🎉" : "Ganó la compu") : `¡Ganó ${nombre(g.marca)}! 🎉`) : empate ? "Empate" : modo === "compu" ? (turno === "X" ? "Te toca a vos (X)" : "Piensa la compu…") : `Turno de ${nombre(turno)} (${turno})`;

  return (
    <div className="jg jg-ttt">
      <div className="jg-marcador" aria-label="Marcador">
        {modo === "compu"
          ? <><span><small>Vos (X)</small><b>{marcador.compu.vos}</b></span><span><small>Empates</small><b>{marcador.compu.empates}</b></span><span><small>Compu (O)</small><b>{marcador.compu.compu}</b></span></>
          : <><span><small>Jugador X</small><b>{marcador.dos.x}</b></span><span><small>Empates</small><b>{m.empates}</b></span><span><small>Jugador O</small><b>{marcador.dos.o}</b></span></>}
      </div>
      <p className={`jg-mensaje ${terminada ? "fin" : ""}`} role="status">{mensaje}</p>
      <div className="jg-tablero3">
        {t.map((x, i) => (
          <button key={i} className={`jg-casilla ${x ?? ""} ${g?.linea.includes(i) ? "gana" : ""}`} onClick={() => tocar(i)} aria-label={`Casilla ${i + 1}: ${x ?? "vacía"}`} disabled={!!x || terminada}>{x}</button>
        ))}
      </div>
      <div className="jg-acciones">
        <button className="jg-mini destacado" onClick={nueva}>Nueva partida</button>
        <button className="jg-mini" onClick={() => setModo(null)}>Cambiar de modo</button>
        <button className="jg-mini" onClick={borrarMarcador}>Borrar marcador</button>
        <BotonSonido activo={activo} onClick={alternar} />
      </div>
    </div>
  );
}
