"use client";
import { useCallback, useEffect, useState } from "react";

type Cena = { estado: "hay" | "suspendida"; queHay: string; dia: string; hora: string; donde: string };
type Mer = { id: string; nombre: string; responsable: string; direccion: string; abierta: boolean; cena: Cena | null; personas: number };
const hoy = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
const diaLargo = (f: string) => { const t = new Date(f + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }).replace(",", ""); return t.charAt(0).toUpperCase() + t.slice(1); };

// Panel del merendero: solo lo necesario, con botones y letra grandes.
export default function PanelMerendero() {
  const [m, setM] = useState<Mer | null>(null);
  const [vista, setVista] = useState<"inicio" | "cena" | "gente">("inicio");
  const [f, setF] = useState({ queHay: "", dia: hoy(), hora: "", donde: "" });
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const llamar = useCallback(async (cuerpo?: object) => {
    const r = await fetch("/api/merendero", cuerpo ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) } : { cache: "no-store" });
    if (r.status === 401) { location.href = "/entrar"; return null; }
    return r;
  }, []);
  const cargar = useCallback(async () => { const r = await llamar(); if (r?.ok) { const d = await r.json(); setM(d.merendero); setF((x) => ({ ...x, donde: x.donde || d.merendero.direccion })); } }, [llamar]);
  useEffect(() => { cargar(); }, [cargar]);

  async function accion(cuerpo: object, ok: string) {
    setMsg(""); setOcupado(true);
    try {
      const r = await llamar(cuerpo); if (!r) return;
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(d.error ?? "No se pudo. Probá de nuevo.");
      if (d.merendero) setM(d.merendero);
      setMsg(ok);
    } finally { setOcupado(false); }
  }
  async function salir() { await fetch("/api/salir", { method: "POST" }).catch(() => {}); location.href = "/"; }
  const compartirOlla = () => {
    if (!m) return;
    const texto = `🍲 Sumate a la ${m.nombre} en Lomas Hoy y enterate cuándo hay cena: ${location.origin}/?olla=${m.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };

  if (!m) return <main className="wrap merendero"><p>Cargando…</p></main>;
  const c = m.cena;
  return (
    <main className="wrap merendero">
      <h1>🍲 {m.nombre}</h1>

      {vista === "inicio" && (
        <>
          {m.personas === 0 && (
            <section className="lugar-principal">
              <b>👋 Primero, compartí tu olla con tu gente</b>
              <button className="btn grande-btn whatsapp-chico" onClick={compartirOlla}>Compartir mi olla por WhatsApp</button>
            </section>
          )}
          {c && (
            <section className="lugar-principal" aria-label="Última cena">
              {c.estado === "hay" ? <><b>Cena publicada</b><span>{c.queHay}</span><span>{diaLargo(c.dia)} · {c.hora.replace(/^0/, "")} hs</span><span>{c.donde}</span></> : <b>Cena suspendida</b>}
            </section>
          )}
          <button className="btn grande-btn merendero-btn" onClick={() => { setMsg(""); setVista("cena"); }}>📢 Publicar cena</button>
          <button className="btn grande-btn merendero-btn" onClick={() => { setMsg(""); setVista("gente"); }}>👥 Mi gente</button>
        </>
      )}

      {vista === "cena" && (
        <>
          <form className="form" onSubmit={(e) => { e.preventDefault(); accion({ accion: "publicar", ...f }, "✅ Cena publicada. Ya se avisó a tu gente."); }}>
            <label>¿Qué hay para comer?<input value={f.queHay} onChange={(e) => setF({ ...f, queHay: e.target.value })} placeholder="Guiso de lentejas" /></label>
            <label>Día<input type="date" min={hoy()} value={f.dia} onChange={(e) => setF({ ...f, dia: e.target.value })} /></label>
            <label>Hora<input type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} /></label>
            <label>¿Dónde?<input value={f.donde} onChange={(e) => setF({ ...f, donde: e.target.value })} /></label>
            <button className="btn grande-btn merendero-btn" disabled={ocupado}>Publicar</button>
          </form>
          {c?.estado === "hay" && <button className="btn claro grande-btn merendero-btn" disabled={ocupado} onClick={() => accion({ accion: "suspender" }, "Cena suspendida. Se avisó a tu gente.")}>Suspender cena</button>}
          <button className="btn claro grande-btn" onClick={() => { setMsg(""); setVista("inicio"); }}>← Atrás</button>
        </>
      )}

      {vista === "gente" && (
        <>
          <p className="merendero-n"><b>{m.personas}</b> {m.personas === 1 ? "persona recibe" : "personas reciben"} tus avisos</p>
          <button className="btn grande-btn whatsapp-chico merendero-btn" onClick={compartirOlla}>Compartir mi olla por WhatsApp</button>
          <button className="btn claro grande-btn merendero-btn" disabled={ocupado} onClick={() => accion({ accion: "lista", abierta: !m.abierta }, m.abierta ? "Lista cerrada: nadie nuevo puede sumarse." : "Lista abierta: tu gente puede sumarse.")}>{m.abierta ? "Cerrar lista" : "Abrir lista"}</button>
          <p className="vacio">{m.abierta ? "La lista está abierta." : "La lista está cerrada: con el enlace nadie nuevo puede sumarse."}</p>
          <button className="btn claro grande-btn" onClick={() => { setMsg(""); setVista("inicio"); }}>← Atrás</button>
        </>
      )}

      {msg && <p className="normal merendero-msg" role="status">{msg}</p>}
      <p className="merendero-pie"><a className="btn claro" href="/">Volver a Lomas Hoy</a> <button className="btn claro" onClick={salir}>Cerrar sesión</button></p>
    </main>
  );
}
