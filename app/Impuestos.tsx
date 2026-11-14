"use client";
import { URL_IMPUESTOS as U, REVISADO_IMPUESTOS } from "@/lib/impuestos";

const ext = (url: string) => ({ href: url, target: "_blank", rel: "noreferrer" });
const Boton = ({ url, children, claro }: { url: string; children: React.ReactNode; claro?: boolean }) => <a className={`btn ${claro ? "claro" : "grande-btn"}`} {...ext(url)}>{children} ↗</a>;

// Pantalla "Impuestos y tasas": una tarjeta por tasa o impuesto, con un botón directo a la consulta y el pago oficial. No muestra montos.
export default function Impuestos({ abrir }: { abrir: (v: string) => void }) {
  return (
    <>
      <p className="vacio">Llegá en un toque a la página oficial donde se consulta y se paga. Lomas Hoy no muestra montos. Datos revisados en {REVISADO_IMPUESTOS}.</p>

      <section className="lugar-principal auto-tarjeta" aria-label="Tasa por Servicios Generales">
        <h2>🏠 Tasa por Servicios Generales (TSG)</h2>
        <span>Es la tasa municipal de la casa. En el Portal de Autogestión del Municipio consultás la deuda, imprimís el recibo y pagás.</span>
        <Boton url={U.portal}>Consultar y pagar en el Portal de Autogestión</Boton>
        <small className="mayores-ayuda">Para entrar te registrás una sola vez con tu DNI o CUIL/CUIT y tu mail. Tené a mano el recibo de la TSG. Si no te llegó o está vencido, también se puede imprimir en el Centro de Atención Vecinal Central (Azara 237).</small>
        <small className="chico">Fuente: Municipio de Lomas de Zamora (<a {...ext(U.tasas)}>Tasas</a> · <a {...ext(U.guiaRecibo)}>guía: recibo de la TSG</a>).</small>
      </section>

      <section className="lugar-principal auto-tarjeta" aria-label="Tasa de comercio">
        <h2>🏪 Tasa de Seguridad e Higiene (comercios)</h2>
        <span>Para quien tiene un negocio. La Tasa por Seguridad e Higiene (TSH) y las declaraciones juradas de comercios se hacen en el mismo Portal de Autogestión.</span>
        <Boton url={U.portal}>Pagar la TSH en el Portal de Autogestión</Boton>
        <Boton url={U.comercio} claro>Trámites de comercio del Municipio</Boton>
        <small className="chico">Fuente: Municipio de Lomas de Zamora (Comercio).</small>
      </section>

      <section className="lugar-principal auto-tarjeta" aria-label="Planes de pago y libre deuda">
        <h2>📄 Planes de pago y libre deuda</h2>
        <span><b>Plan de pagos de la TSG:</b> si tenés deuda, podés hacer un plan de pagos desde el Portal de Autogestión (menú “Planes de pago”).</span>
        <span><b>Informe de deuda y libre deuda:</b> el informe de deuda se puede obtener sin pagar. Para el libre deuda hay que pagar antes lo que se deba. Se tramita en el Municipio, con turno.</span>
        <Boton url={U.portal}>Planes de pago (Portal de Autogestión)</Boton>
        <Boton url={U.guiaDeuda} claro>Guía: informe de deuda y libre deuda</Boton>
        <Boton url={U.guiaPlan} claro>Guía: plan de pagos de la TSG</Boton>
        <small className="chico">Fuente: Municipio de Lomas de Zamora (Guía de Trámites).</small>
      </section>

      <section className="lugar-principal auto-tarjeta" aria-label="Impuesto inmobiliario de ARBA">
        <h2>🏛️ Impuesto Inmobiliario (ARBA, provincial)</h2>
        <span>Es un impuesto de la <b>Provincia</b> y es distinto de la tasa municipal: se paga en ARBA, no en el Municipio. En “Consultá tu deuda” elegís <b>Partida</b> y ponés la partida inmobiliaria de tu inmueble.</span>
        <Boton url={U.arbaDeuda}>Consultar la deuda en ARBA</Boton>
        <Boton url={U.arbaWeb} claro>Pagar en ARBA</Boton>
        <small className="chico">Fuente: ARBA, Agencia de Recaudación de la Provincia de Buenos Aires.</small>
      </section>

      <section className="lugar-principal auto-tarjeta" aria-label="Otras tasas municipales">
        <h2>🧾 Otras gestiones de tasas del Municipio</h2>
        <ul className="mayores-puntos">
          <li><b>Factura electrónica:</b> adherite para recibir la boleta municipal por mail.</li>
          <li><b>Exención de la TSG:</b> pedí el certificado de exención de la Tasa por Servicios Generales.</li>
          <li><b>Deudas vencidas o por vencer:</b> consultalas y actualizalas en el Portal de Autogestión.</li>
        </ul>
        <Boton url={U.tasas}>Tasas del Municipio</Boton>
        <button className="btn claro" onClick={() => abrir("auto")}>Impuesto automotor y multas: ver “Auto y trámites”</button>
        <button className="btn claro" onClick={() => abrir("comunidad")}>Más trámites: ver “Trámites municipales”</button>
        <small className="chico">Fuente: Municipio de Lomas de Zamora (Tasas).</small>
      </section>

      <p className="aviso-pie">Lomas Hoy no cobra ni guarda tus datos: te lleva a la página oficial de cada organismo, donde se paga directamente.</p>
    </>
  );
}
