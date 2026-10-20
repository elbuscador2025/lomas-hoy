"use client";
import { useCallback, useEffect, useState } from "react";
import { config } from "@/lomas.config.mjs";
import { posibleVenta, type FeriaTrueque } from "@/lib/trueque-comun";
import { post } from "./api";

type Reg = { id: string; ofrezco: string; busco: string; categoria: string; barrio: string; whatsapp: string; foto: { url: string }; creado: string; aprobada?: string; vence?: string; posibleVenta: boolean };
type Feria = FeriaTrueque & { creado: string };
const fecha = (iso?: string) => (iso ? new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short", hour12: false }) : "—");

function Ficha({ r, children }: { r: Reg; children: React.ReactNode }) {
  return (
    <li className="mascota">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="foto-mascota" src={r.foto.url} alt="Foto" loading="lazy" />
      <div className="mascota-datos">
        {(r.posibleVenta || posibleVenta(`${r.ofrezco} ${r.busco}`)) && <span className="pildora grave">Posible venta</span>}
        <b>Ofrece: {r.ofrezco}</b>
        <span>Busca: {r.busco}</span>
        <small>{r.categoria} · {r.barrio} · WhatsApp: {r.whatsapp}<br />Enviada {fecha(r.creado)}{r.vence ? ` · Vence ${fecha(r.vence)}` : ""}</small>
        <div className="acciones">{children}</div>
      </div>
    </li>
  );
}

function FichaFeria({ f, children }: { f: Feria; children: React.ReactNode }) {
  return (
    <li className="mascota">
      <div className="mascota-datos">
        <b>{f.lugar}</b>
        <span>{f.direccion} · {f.barrio}</span>
        <span>{f.dias} · {f.horario}</span>
        <small>WhatsApp: {f.whatsapp || "no puso"} · Enviada {fecha(f.creado)}</small>
        <div className="acciones">{children}</div>
      </div>
    </li>
  );
}

// Pestaña "Trueque": publicaciones y ferias pendientes de aprobar, y las ya publicadas. Nada se publica sin que yo lo apruebe.
export default function PanelTrueque() {
  const [pendientes, setPendientes] = useState<Reg[]>([]);
  const [aprobadas, setAprobadas] = useState<Reg[]>([]);
  const [feriasPend, setFeriasPend] = useState<Feria[]>([]);
  const [feriasOk, setFeriasOk] = useState<Feria[]>([]);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    const r = await post("/api/panel/trueque", { accion: "listar" });
    if (!r.ok) return;
    const d = await r.json();
    setPendientes(d.pendientes); setAprobadas(d.aprobadas); setFeriasPend(d.feriasPendientes); setFeriasOk(d.feriasAprobadas);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function accion(cuerpo: object, ok: string) {
    const r = await post("/api/panel/trueque", cuerpo);
    setMsg(r.ok ? ok : "No se pudo.");
    cargar();
  }

  return (
    <div>
      <p className="vacio">Para recibir una notificación cada vez que alguien publica, usá “Avisarme en este celular…” de la pestaña Mascotas: sirve para las dos.</p>
      {msg && <p className="normal">{msg}</p>}
      <h2>Publicaciones para aprobar ({pendientes.length})</h2>
      {pendientes.length === 0 && <p className="vacio">No hay nada pendiente.</p>}
      <ul className="lista">
        {pendientes.map((r) => (
          <Ficha key={r.id} r={r}>
            <button className="btn" onClick={() => accion({ accion: "aprobar", id: r.id }, "Aprobada: ya se ve en la app.")}>Aprobar</button>
            <button className="btn claro" onClick={() => confirm("¿Rechazar? Se borra la publicación y su foto.") && accion({ accion: "rechazar", id: r.id }, "Rechazada y foto borrada.")}>Rechazar</button>
          </Ficha>
        ))}
      </ul>
      <h2>Ferias para aprobar ({feriasPend.length})</h2>
      {feriasPend.length === 0 && <p className="vacio">No hay nada pendiente.</p>}
      <ul className="lista">
        {feriasPend.map((f) => (
          <FichaFeria key={f.id} f={f}>
            <button className="btn" onClick={() => accion({ accion: "aprobarFeria", id: f.id }, "Aprobada: ya se ve en la app.")}>Aprobar</button>
            <button className="btn claro" onClick={() => confirm("¿Rechazar esta feria?") && accion({ accion: "borrarFeria", id: f.id }, "Rechazada.")}>Rechazar</button>
          </FichaFeria>
        ))}
      </ul>
      <h2>Publicaciones publicadas ({aprobadas.length})</h2>
      <p className="vacio">Se bajan solas a los {config.trueque.diasVigencia} días.</p>
      <ul className="lista">
        {aprobadas.map((r) => (
          <Ficha key={r.id} r={r}>
            <button className="btn claro" onClick={() => confirm("¿Bajar esta publicación? Se borra también su foto.") && accion({ accion: "rechazar", id: r.id }, "Bajada y foto borrada.")}>Bajar</button>
          </Ficha>
        ))}
      </ul>
      <h2>Ferias publicadas ({feriasOk.length})</h2>
      <p className="vacio">No vencen: las borrás vos.</p>
      <ul className="lista">
        {feriasOk.map((f) => (
          <FichaFeria key={f.id} f={f}>
            <button className="btn claro" onClick={() => confirm("¿Borrar esta feria?") && accion({ accion: "borrarFeria", id: f.id }, "Feria borrada.")}>Borrar</button>
          </FichaFeria>
        ))}
      </ul>
    </div>
  );
}
