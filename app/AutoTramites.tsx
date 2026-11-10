"use client";
import { URL_AUTO as U, POLO_VIAL, PLANTA_VTV, SECCIONALES, PASOS_LICENCIA_PRIMERA, PASOS_LICENCIA_RENOVAR, REVISADO_AUTO } from "@/lib/autotramites";
import { Icono } from "./Iconos";
import BotonLlamar from "./BotonLlamar";

const ext = (url: string) => ({ href: url, target: "_blank", rel: "noreferrer" });
const mapa = (dir: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${dir}, Buenos Aires, Argentina`)}`;
const Boton = ({ url, children, claro }: { url: string; children: React.ReactNode; claro?: boolean }) => <a className={`btn ${claro ? "claro" : "grande-btn"}`} {...ext(url)}>{children} ↗</a>;

// Pantalla "Auto y trámites": una tarjeta por tema, con texto corto y botones directos a las páginas oficiales. Lomas Hoy no hace trámites ni cobra nada.
export default function AutoTramites() {
  return (
    <>
      <p className="vacio">Los trámites del auto y la moto, sin perderte en páginas del gobierno. Todos los botones llevan a sitios oficiales. Datos revisados en {REVISADO_AUTO}.</p>

      <section className="lugar-principal auto-tarjeta" aria-label="Patente">
        <h2>💰 ¿Cuánto debo de patente?</h2>
        <span>Ingresá tu dominio (la patente) en ARBA, la agencia de la Provincia: ves la deuda y podés pagar. Si tu auto es “municipalizado”, la deuda se consulta en el Portal de Autogestión del Municipio.</span>
        <Boton url={U.arba}>Ver deuda y pagar en ARBA</Boton>
        <Boton url={U.muniPortal} claro>Portal de Autogestión del Municipio</Boton>
        <small className="chico">Fuentes: ARBA y Municipio de Lomas de Zamora (<a {...ext(U.muniPatenteGuia)}>guía de trámites</a>).</small>
      </section>

      <section className="lugar-principal auto-tarjeta" aria-label="Multas">
        <h2>🚨 Multas</h2>
        <span>Consultá si tenés infracciones: en la Provincia de Buenos Aires, en el Municipio de Lomas de Zamora y las nacionales.</span>
        <Boton url={U.multasBA}>Multas de la Provincia</Boton>
        <Boton url={U.multasMuni}>Multas del Municipio de Lomas</Boton>
        <Boton url={U.multasNacion} claro>Multas nacionales</Boton>
      </section>

      <section className="lugar-principal auto-tarjeta" aria-label="Licencia de conducir">
        <h2>🪪 Licencia de conducir (registro)</h2>
        <span>Se saca o se renueva en el {POLO_VIAL.nombre} del Municipio. El turno se pide solo por internet, en Comunidad Lomas.</span>
        <span className="dato"><Icono nombre="pin" tam={18} /> {POLO_VIAL.direccion}</span>
        <div className="acciones">
          {POLO_VIAL.telefonos.map((t) => <BotonLlamar key={t} nombre="el Polo Vial" numero={t} />)}
          <a className="btn claro" {...ext(mapa(POLO_VIAL.direccion))}>Cómo llegar ↗</a>
        </div>
        <Boton url={U.licenciaTurno}>Pedir turno (Comunidad Lomas)</Boton>
        <details className="subseccion tramite">
          <summary><b>Primera licencia: pasos</b><span className="flecha" aria-hidden>›</span></summary>
          <div className="tramite-cuerpo">
            <ol>{PASOS_LICENCIA_PRIMERA.map((p) => <li key={p}>{p}</li>)}</ol>
            <ul className="enlaces-oficiales">
              <li><a {...ext(U.licenciaPrimera)}>Requisitos, costos y detalle (guía del Municipio)</a></li>
              <li><a {...ext(U.cursoVial)}>Curso de Seguridad Vial (Agencia Nacional de Seguridad Vial)</a></li>
            </ul>
          </div>
        </details>
        <details className="subseccion tramite">
          <summary><b>Renovar la licencia: pasos</b><span className="flecha" aria-hidden>›</span></summary>
          <div className="tramite-cuerpo">
            <ol>{PASOS_LICENCIA_RENOVAR.map((p) => <li key={p}>{p}</li>)}</ol>
            <ul className="enlaces-oficiales">
              <li><a {...ext(U.licenciaRenovar)}>Requisitos, costos y detalle (guía del Municipio)</a></li>
              <li><a {...ext(U.licenciaPagina)}>Licencias de conducir en la web del Municipio</a></li>
            </ul>
          </div>
        </details>
        <small className="chico">Fuente: Municipio de Lomas de Zamora. Las licencias profesionales (clases C, D y E) tienen reglas especiales: se explican en la guía.</small>
      </section>

      <section className="lugar-principal auto-tarjeta" aria-label="VTV">
        <h2>🔧 VTV</h2>
        <span>El turno se saca en el portal oficial de la Provincia: te registrás, cargás tu vehículo y elegís planta, día y hora.</span>
        <Boton url={U.vtvTurno}>Sacar turno de VTV</Boton>
        <b>Planta dentro de Lomas de Zamora</b>
        <span className="dato"><Icono nombre="pin" tam={18} /> {PLANTA_VTV.nombre} · {PLANTA_VTV.direccion}</span>
        <span className="dato"><Icono nombre="reloj" tam={18} /> {PLANTA_VTV.horario}</span>
        <div className="acciones">
          <a className="btn claro" {...ext(mapa(PLANTA_VTV.direccion))}>Cómo llegar ↗</a>
          <Boton url={U.vtvPlantas} claro>Todas las plantas</Boton>
          <Boton url={U.vtvCostos} claro>Costos</Boton>
        </div>
        <small className="chico">Fuente: VTV Provincia de Buenos Aires (lista oficial de plantas).</small>
      </section>

      <section className="lugar-principal auto-tarjeta" aria-label="Registro del automotor">
        <h2>🏢 Registro del automotor</h2>
        <span>Se va al registro seccional para: transferencia, informe de estado de dominio, informe histórico, denuncia de venta y renovación de cédula.</span>
        <Boton url={U.registroTurnos}>Turnos y trámites online</Boton>
        <details className="subseccion tramite">
          <summary><b>Registros de Lomas de Zamora ({SECCIONALES.length})</b><span className="flecha" aria-hidden>›</span></summary>
          <div className="tramite-cuerpo">
            <ul className="lista">
              {SECCIONALES.map((s) => (
                <li key={s.nombre} className="lugar">
                  <b>{s.nombre}</b>
                  <span className="dato"><Icono nombre="pin" tam={18} /> {s.direccion}, Lomas de Zamora</span>
                  <span className="dato"><Icono nombre="reloj" tam={18} /> Lunes a viernes de {s.horario} hs</span>
                  <div className="acciones">
                    {s.telefonos.map((t) => <BotonLlamar key={t} nombre={`el Registro ${s.nombre}`} numero={t} />)}
                    <a className="btn claro" {...ext(mapa(`${s.direccion}, Lomas de Zamora`))}>Cómo llegar ↗</a>
                  </div>
                </li>
              ))}
            </ul>
            <small className="chico">Directorio oficial de la DNRPA. Confirmá por teléfono antes de ir. <a {...ext(U.registros)}>Ver el directorio completo</a>.</small>
          </div>
        </details>
        <small className="chico">Fuente: Dirección Nacional de los Registros de la Propiedad del Automotor (DNRPA).</small>
      </section>

      <section className="lugar-principal auto-tarjeta" aria-label="Transferir un auto">
        <h2>🔁 Transferir un auto o una moto</h2>
        <ol>
          <li>Iniciá la transferencia digital (formulario 08 digital) en el sitio oficial.</li>
          <li>Juntá la documentación: DNI del comprador y del vendedor, título y cédulas del vehículo, y CUIT o CUIL del comprador. Hay verificación física para autos inscriptos desde 2001 y motos desde 2004.</li>
          <li>Sacá turno en el registro seccional.</li>
        </ol>
        <Boton url={U.transferencia}>Iniciar la transferencia digital</Boton>
        <Boton url={U.requisitos} claro>Requisitos completos</Boton>
        <Boton url={U.aranceles} claro>Costos y aranceles</Boton>
        <small className="chico">Fuente: DNRPA, Ministerio de Justicia de la Nación. <a {...ext(U.dnrpa)}>Todos los trámites del automotor</a>.</small>
      </section>

      <section className="lugar-principal auto-tarjeta" aria-label="Otros trámites del auto en el Municipio">
        <h2>📄 Otros trámites del auto en el Municipio</h2>
        <span>Alta, baja y cambio de titularidad del impuesto automotor, planes de pago, libre deuda de infracciones y consulta de vehículos retenidos.</span>
        <Boton url={U.muniAuto}>Automotores y tránsito (Municipio)</Boton>
      </section>

      <p className="aviso-pie">Lomas Hoy no hace trámites ni cobra nada: te lleva a la página oficial de cada organismo, donde se hacen estos trámites directamente.</p>
    </>
  );
}
