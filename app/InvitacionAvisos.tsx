"use client";
import { useEffect, useState } from "react";
import { PasosIPhone } from "./Notificaciones";
import type { Push } from "./usePush";

const CLAVE = "lomas-hoy:invitacion-avisos"; // cuándo se mostró (o se contestó) por última vez
const SEMANA = 7 * 86400_000;
const hace = () => { try { return Date.now() - Number(localStorage.getItem(CLAVE) ?? 0); } catch { return Infinity; } };
const anotar = () => { try { localStorage.setItem(CLAVE, String(Date.now())); } catch {} };

// Después de votar en La Voz de Lomas: invita a recibir avisos de eventos nuevos, si el celular todavía no los tiene.
// Si ya los tiene, o contestó que no (o tocó que sí), no se vuelve a mostrar en esa semana. En iPhone sin instalar se explica cómo instalar la app.
export default function InvitacionAvisos({ push }: { push: Push }) {
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (push.estado === "activo") { anotar(); setVisible(false); return; } // ya los tiene: no se le vuelve a ofrecer esta semana
    if (push.estado === "inactivo" || push.estado === "iosSinInstalar") setVisible(hace() > SEMANA);
    else setVisible(false);
  }, [push.estado]);
  if (!visible) return null;

  async function si() {
    setMsg("");
    anotar();
    const ok = await push.activar({ ...push.prefs, tipos: { ...push.prefs.tipos, agenda: true } });
    if (!ok) setMsg("No se pudieron activar. Podés hacerlo después desde la Agenda.");
    else setVisible(false);
  }
  return (
    <section className="voz-invita" aria-label="Avisos de eventos">
      {push.estado === "iosSinInstalar" ? (
        <>
          <b>¿Querés que te avisemos cuando haya eventos nuevos en Lomas? 🔔</b>
          <p>En iPhone, para recibir avisos primero hay que instalar la app:</p>
          <PasosIPhone />
        </>
      ) : (
        <>
          <b>¿Querés que te avisemos cuando haya eventos nuevos en Lomas? 🔔</b>
          <button className="btn grande-btn" disabled={push.ocupado} onClick={si}>Sí, avisame</button>
        </>
      )}
      {msg && <p className="voz-error" role="status">{msg}</p>}
      <button className="link" onClick={() => { anotar(); setVisible(false); }}>Ahora no</button>
    </section>
  );
}
