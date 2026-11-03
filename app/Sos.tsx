"use client";
import BotonLlamar from "./BotonLlamar";

// Números de emergencia. 911, 100 y 103 figuran también en los teléfonos útiles del sitio del Municipio de Lomas de Zamora; 144 es la línea nacional.
// Emergencia médica: según el Municipio (página de Telemedicina Lomas, verificada el 03/11/2026), desde un celular se llama al 4292-3896 y el 107 funciona solo desde teléfono fijo.
const NUMEROS = [
  { n: "911", t: "Policía" },
  { n: "100", t: "Bomberos" },
  { n: "103", t: "Defensa Civil" },
  { n: "144", t: "Violencia de género" },
];
// Números propios de Lomas (publicados por el Municipio)
const LOCALES = [
  { n: "147", t: "Centro de seguridad de Lomas", tel: "147" },
];

export default function Sos() {
  return (
    <>
      <ul className="sos-lista">
        <li className="sos-fila sos-medica">
          <b className="sos-num sos-grande">Emergencia médica (ambulancia) · <span style={{ whiteSpace: "nowrap" }}>4292-3896</span></b>
          <BotonLlamar nombre="Emergencia médica (ambulancia)" numero="4292-3896" />
        </li>
        <li className="sos-fila">
          <b className="sos-num">107 · Ambulancia</b>
          <small className="sos-aclara">Solo desde teléfono fijo</small>
          <BotonLlamar nombre="Ambulancia (desde teléfono fijo)" numero="107" />
        </li>
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
