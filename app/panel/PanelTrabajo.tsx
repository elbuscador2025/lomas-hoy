"use client";
import { useCallback, useEffect, useState } from "react";
import { config } from "@/lomas.config.mjs";
import { posibleEstafa } from "@/lib/estafas";
import { post } from "./api";
import { Denuncias, AccionesModeracion, type DatosModeracion } from "./Moderar";

type Reg = {
  id: string; modo: "ofrezco" | "busco"; texto: string; rubro: string; barrio: string; tipo?: string; horario: string; whatsapp: string;
  foto?: { url: string }; creado: string; vence?: string; posibleEstafa?: boolean;
} & DatosModeracion;
const fecha = (iso?: string) => (iso ? new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short", hour12: false }) : "—");

function Ficha({ r, onHecho, children }: { r: Reg; onHecho: (m: string) => void; children: React.ReactNode }) {
  return (
    <li className="mascota">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {r.foto && <img className="foto-mascota" src={r.foto.url} alt="Foto" loading="lazy" />}
      <div className="mascota-datos">
        {(r.posibleEstafa || posibleEstafa(r.texto, r.horario)) && <span className="pildora grave">Posible estafa</span>}
        <Denuncias r={r} />
        <b>{r.modo === "ofrezco" ? "Ofrece trabajo" : "Busca trabajo"}: {r.texto}</b>
        <span>{r.rubro} · {r.barrio}{r.tipo ? ` · ${r.tipo === "changa" ? "Changa" : "Fijo"}` : ""} · {r.horario}</span>
        <small>WhatsApp: {r.whatsapp}<br />Enviada {fecha(r.creado)}{r.vence ? ` · Vence ${fecha(r.vence)}` : ""}</small>
        <div className="acciones">{children}<AccionesModeracion seccion="trabajo" id={r.id} r={r} onHecho={onHecho} /></div>
      </div>
    </li>
  );
}

// Pestaña "Trabajo": publicaciones pendientes de aprobar y publicadas. Nada se publica sin que yo lo apruebe.
export default function PanelTrabajo() {
  const [pendientes, setPendientes] = useState<Reg[]>([]);
  const [aprobadas, setAprobadas] = useState<Reg[]>([]);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    const r = await post("/api/panel/trabajo", { accion: "listar" });
    if (!r.ok) return;
    const d = await r.json();
    setPendientes(d.pendientes); setAprobadas(d.aprobadas);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function accion(cuerpo: object, ok: string) {
    const r = await post("/api/panel/trabajo", cuerpo);
    setMsg(r.ok ? ok : "No se pudo.");
    cargar();
  }
  const hecho = (m: string) => { setMsg(m); cargar(); };

  return (
    <div>
      {msg && <p className="normal">{msg}</p>}
      <h2>Para aprobar ({pendientes.length})</h2>
      {pendientes.length === 0 && <p className="vacio">No hay nada pendiente.</p>}
      <ul className="lista">
        {pendientes.map((r) => (
          <Ficha key={r.id} r={r} onHecho={hecho}>
            <button className="btn" onClick={() => accion({ accion: "aprobar", id: r.id }, "Aprobada: ya se ve en la app.")}>Aprobar</button>
            <button className="btn claro" onClick={() => confirm("¿Rechazar? Se borra la publicación.") && accion({ accion: "rechazar", id: r.id }, "Rechazada.")}>Rechazar</button>
          </Ficha>
        ))}
      </ul>
      <h2>Publicadas ({aprobadas.length})</h2>
      <p className="vacio">Se bajan solas a los {config.trabajo.diasVigencia} días. Con 3 denuncias se ocultan hasta que las revises.</p>
      <ul className="lista">
        {aprobadas.map((r) => (
          <Ficha key={r.id} r={r} onHecho={hecho}>
            <button className="btn claro" onClick={() => confirm("¿Bajar esta publicación?") && accion({ accion: "rechazar", id: r.id }, "Bajada.")}>Bajar</button>
          </Ficha>
        ))}
      </ul>
    </div>
  );
}
