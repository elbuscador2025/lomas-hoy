"use client";
import BotonLlamar from "./BotonLlamar";

// Números de emergencia. 911, 107, 100 y 103 figuran también en los teléfonos útiles del sitio del Municipio de Lomas de Zamora; 144 es la línea nacional.
const NUMEROS = [
  { n: "911", t: "Policía" },
  { n: "107", t: "Ambulancia" },
  { n: "100", t: "Bomberos" },
  { n: "103", t: "Defensa Civil" },
  { n: "144", t: "Violencia de género" },
];
// Números propios de Lomas (publicados por el Municipio)
const LOCALES = [
  { n: "4292-3896", t: "Emergencia médica en Lomas, desde celular", tel: "011 4292-3896" },
  { n: "147", t: "Centro de seguridad de Lomas", tel: "147" },
];

export default function Sos() {
  return (
    <>
      <ul className="sos-lista">
        {NUMEROS.map((x) => (
          <li key={x.n} className="sos-fila">
            <b className="sos-num">{x.n} · {x.t}</b>
            <BotonLlamar nombre={x.t} numero={x.n} />
          </li>
        ))}
      </ul>
      <h2>Números de Lomas</h2>
      <ul className="sos-lista">
        {LOCALES.map((x) => (
          <li key={x.n} className="sos-fila">
            <b className="sos-num sos-local">{x.t}</b>
            <BotonLlamar nombre={x.t} numero={x.tel} />
          </li>
        ))}
      </ul>
      <p className="vacio">Fuente: Municipio de Lomas de Zamora (teléfonos útiles y Secretaría de Salud) y línea 144 del Estado nacional.</p>
    </>
  );
}
