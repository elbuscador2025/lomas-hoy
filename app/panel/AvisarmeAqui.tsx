"use client";
import { useState } from "react";
import { post } from "./api";

const aBytes = (b64: string) => { const b = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };

// Arriba de todo en mi panel: activa en ESTE celular los avisos de publicaciones nuevas y denuncias.
export default function AvisarmeAqui() {
  const [msg, setMsg] = useState("");
  async function activar() {
    try {
      if (!("serviceWorker" in navigator && "PushManager" in window)) return setMsg("Este navegador no permite avisos.");
      if ((await Notification.requestPermission()) !== "granted") return setMsg("No diste permiso para las notificaciones.");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes((process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim()) }));
      const r = await post("/api/panel/mascotas", { accion: "suscribir", subscription: sub.toJSON() });
      setMsg(r.ok ? "Listo: este celular recibe los avisos de publicaciones y denuncias." : "No se pudo activar.");
    } catch {
      setMsg("No se pudo activar en este celular.");
    }
  }
  return (
    <div>
      <button className="btn claro ancho" onClick={activar}>Avisarme en este celular de publicaciones y denuncias</button>
      {msg && <p className="normal">{msg}</p>}
    </div>
  );
}
