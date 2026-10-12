"use client";
import { useCallback, useEffect, useState } from "react";
import { config } from "@/lomas.config.mjs";
import { post } from "./api";

type Reg = { id: string; estado: string; especie: string; barrio: string; descripcion: string; whatsapp: string; foto: { url: string }; creado: string; aprobada?: string; vence?: string };
const fecha = (iso?: string) => (iso ? new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short", hour12: false }) : "—");
const aBytes = (b64: string) => { const b = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };

function Ficha({ r, children }: { r: Reg; children: React.ReactNode }) {
  return (
    <li className="mascota">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="foto-mascota" src={r.foto.url} alt="Foto" loading="lazy" />
      <div className="mascota-datos">
        <b>{r.estado === "perdido" ? "Perdido" : "Encontrado"} · {r.especie} · {r.barrio}</b>
        <span>{r.descripcion}</span>
        <small>WhatsApp: {r.whatsapp} · Enviada {fecha(r.creado)}{r.vence ? ` · Vence ${fecha(r.vence)}` : ""}</small>
        <div className="acciones">{children}</div>
      </div>
    </li>
  );
}

// Pestaña "Mascotas": pendientes de aprobar y publicadas. Nada se publica sin que yo lo apruebe.
export default function PanelMascotas() {
  const [pendientes, setPendientes] = useState<Reg[]>([]);
  const [aprobadas, setAprobadas] = useState<Reg[]>([]);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    const r = await post("/api/panel/mascotas", { accion: "listar" });
    if (!r.ok) return;
    const d = await r.json();
    setPendientes(d.pendientes); setAprobadas(d.aprobadas);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function accion(cuerpo: object, ok: string) {
    const r = await post("/api/panel/mascotas", cuerpo);
    setMsg(r.ok ? ok : "No se pudo.");
    cargar();
  }

  // Activa en ESTE celular el aviso "Nueva mascota para aprobar"
  async function recibirAvisos() {
    try {
      if (!("serviceWorker" in navigator && "PushManager" in window)) return setMsg("Este navegador no permite avisos.");
      if ((await Notification.requestPermission()) !== "granted") return setMsg("No diste permiso para las notificaciones.");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes((process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim()) }));
      const r = await post("/api/panel/mascotas", { accion: "suscribir", subscription: sub.toJSON() });
      setMsg(r.ok ? "Listo: este celular recibe “Nueva mascota para aprobar”." : "No se pudo activar.");
    } catch {
      setMsg("No se pudo activar en este celular.");
    }
  }

  return (
    <div>
      <button className="btn claro ancho" onClick={recibirAvisos}>Avisarme en este celular cuando haya una nueva</button>
      {msg && <p className="normal">{msg}</p>}
      <h2>Para aprobar ({pendientes.length})</h2>
      {pendientes.length === 0 && <p className="vacio">No hay nada pendiente.</p>}
      <ul className="lista">
        {pendientes.map((r) => (
          <Ficha key={r.id} r={r}>
            <button className="btn" onClick={() => accion({ accion: "aprobar", id: r.id }, "Aprobada: ya se ve en la app.")}>Aprobar</button>
            <button className="btn claro" onClick={() => confirm("¿Rechazar? Se borra la publicación y su foto.") && accion({ accion: "rechazar", id: r.id }, "Rechazada y foto borrada.")}>Rechazar</button>
          </Ficha>
        ))}
      </ul>
      <h2>Publicadas ({aprobadas.length})</h2>
      <p className="vacio">Se bajan solas a los {config.mascotas.diasVigencia} días.</p>
      <ul className="lista">
        {aprobadas.map((r) => (
          <Ficha key={r.id} r={r}>
            <button className="btn claro" onClick={() => confirm("¿Bajar esta publicación? Se borra también su foto.") && accion({ accion: "rechazar", id: r.id }, "Bajada y foto borrada.")}>Bajar</button>
          </Ficha>
        ))}
      </ul>
    </div>
  );
}
