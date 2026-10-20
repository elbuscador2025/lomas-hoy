"use client";
import { useCallback, useEffect, useState } from "react";
import { post } from "./api";

type Resumen = {
  total: number;
  dias: { dia: string; enviados: number; fallidos: number }[];
  registro: { t: string; tipo: string; titulo?: string; evento?: string; interesadas?: number; enviadas?: number; fallidas?: number; omitida?: string; error?: string; errores?: string[]; borradas?: number }[];
};
const hora = (iso: string) => new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

// Pestaña "Avisos push" de mi panel.
export default function PanelPush() {
  const [r, setR] = useState<Resumen | null>(null);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    const res = await post("/api/panel/push");
    if (res.ok) setR(await res.json());
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  // La prueba va al celular (o navegador) desde el que estás mirando el panel, si tiene los avisos activados.
  async function prueba(accion = "prueba") {
    setMsg("Enviando…");
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (!sub) return setMsg("Este celular no tiene los avisos activados. Activalos primero desde la app (campana de arriba).");
      const res = await post("/api/panel/push", { accion, endpoint: sub.endpoint });
      setMsg((await res.json().catch(() => ({}))).mensaje ?? "No se pudo enviar.");
      cargar();
    } catch {
      setMsg("No se pudo enviar la prueba desde este navegador.");
    }
  }

  if (!r) return <p className="vacio">Cargando…</p>;
  return (
    <div>
      <button className="btn ancho" onClick={() => prueba()}>Enviarme una notificación de prueba</button>
      <button className="btn claro ancho" onClick={() => prueba("resumen")}>Enviarme el resumen ahora</button>
      {msg && <p className="normal">{msg}</p>}

      <h2>Celulares con avisos activados</h2>
      <p><b>{r.total}</b> en total</p>

      <h2>Notificaciones por día</h2>
      {r.dias.length === 0 ? <p className="vacio">Todavía no se mandó ninguna.</p> : (
        <table>
          <thead><tr><th>Día</th><th>Enviadas</th><th>Fallaron</th></tr></thead>
          <tbody>{r.dias.map((d) => <tr key={d.dia}><td>{d.dia}</td><td>{d.enviados}</td><td>{d.fallidos}</td></tr>)}</tbody>
        </table>
      )}

      <h2>Últimos envíos</h2>
      {r.registro.length === 0 && <p className="vacio">Sin movimientos.</p>}
      <ul className="lista">
        {r.registro.map((x, i) => (
          <li key={i}>
            <b>{x.tipo}</b> · {hora(x.t)}<br />{x.titulo ?? x.evento}
            <br /><small>
              {x.omitida ? `No se mandó: ${x.omitida}` : x.error ? `Error: ${x.error}`
                : `Para ${x.interesadas ?? "?"} · enviadas ${x.enviadas ?? 0} · fallaron ${x.fallidas ?? 0}${x.borradas ? ` · ${x.borradas} suscripciones vencidas borradas` : ""}`}
              {x.errores?.length ? ` · ${x.errores.join(" | ")}` : ""}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}
