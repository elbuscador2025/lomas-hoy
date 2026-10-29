"use client";
import { useCallback, useEffect, useState } from "react";
import { post } from "./api";

type Fila = { id: string; nombre: string; responsable: string; correo: string; activo: boolean; abierta: boolean; personas: number };

// Pestaña "Merenderos": invitar, ver quién está, activar/desactivar y dar una contraseña temporal.
export default function PanelMerenderos() {
  const [lista, setLista] = useState<Fila[]>([]);
  const [enlace, setEnlace] = useState("");
  const [msg, setMsg] = useState("");
  const [temporal, setTemporal] = useState<{ id: string; clave: string } | null>(null);
  const cargar = useCallback(async () => { const r = await post("/api/panel/merenderos", { accion: "listar" }); if (r.ok) setLista((await r.json()).merenderos); }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function invitar() {
    setMsg("");
    const r = await post("/api/panel/merenderos", { accion: "invitar" });
    const d = await r.json().catch(() => ({}));
    if (r.ok) setEnlace(d.enlace); else setMsg("No se pudo crear la invitación.");
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(enlace); setMsg("Enlace copiado."); } catch { setMsg("No se pudo copiar: mantené apretado el enlace y copialo."); }
  }
  const compartir = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Te invito a sumar tu merendero a Lomas Hoy. Registrate acá (el enlace sirve una sola vez y vence en 7 días): ${enlace}`)}`, "_blank");
  async function activo(m: Fila) {
    await post("/api/panel/merenderos", { accion: "activo", id: m.id, activo: !m.activo });
    cargar();
  }
  async function nuevaClave(m: Fila) {
    if (!confirm(`¿Generar una contraseña temporal para ${m.nombre}? La actual deja de servir.`)) return;
    const r = await post("/api/panel/merenderos", { accion: "clave", id: m.id });
    const d = await r.json().catch(() => ({}));
    if (r.ok) setTemporal({ id: m.id, clave: d.temporal });
  }
  return (
    <div>
      <button className="btn" onClick={invitar}>Invitar merendero</button>
      {enlace && (
        <div className="lugar-principal">
          <b>Enlace de invitación (sirve una sola vez, vence en 7 días)</b>
          <input readOnly value={enlace} onFocus={(e) => e.currentTarget.select()} />
          <span><button className="btn claro chico" onClick={copiar}>Copiar</button>{" "}<button className="btn chico whatsapp-chico" onClick={compartir}>Compartir por WhatsApp</button></span>
        </div>
      )}
      {msg && <p className="normal">{msg}</p>}
      <h2>Merenderos ({lista.length})</h2>
      {lista.length === 0 && <p className="vacio">Todavía no hay merenderos.</p>}
      {lista.map((m) => (
        <div key={m.id} className="fila-panel">
          <span>
            <b>{m.nombre}</b>{m.activo ? "" : " · DESACTIVADO"}<br />
            <small>Responsable: {m.responsable} · {m.personas} {m.personas === 1 ? "persona recibe" : "personas reciben"} sus avisos · lista {m.abierta ? "abierta" : "cerrada"}</small>
            {temporal?.id === m.id && <><br /><b>Contraseña temporal: {temporal.clave}</b><br /><small>Dictásela por teléfono. Se muestra solo ahora.</small></>}
          </span>
          <span>
            <button className="btn claro chico" onClick={() => activo(m)}>{m.activo ? "Desactivar" : "Activar"}</button>{" "}
            <button className="btn claro chico" onClick={() => nuevaClave(m)}>Nueva contraseña</button>
          </span>
        </div>
      ))}
    </div>
  );
}
