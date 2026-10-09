"use client";
import { useCallback, useEffect, useState } from "react";
import { config } from "@/lomas.config.mjs";

type Resumen = {
  total: number; porBarrio: [string, number][]; porTipo: Record<string, number>;
  dias: { dia: string; enviados: number; fallidos: number }[];
  registro: { t: string; tipo: string; titulo?: string; evento?: string; interesadas?: number; enviadas?: number; fallidas?: number; omitida?: string; error?: string; errores?: string[]; borradas?: number }[];
};
const hora = (iso: string) => new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

// Pestaña "Avisos push" de mi panel.
export default function PanelPush({ password }: { password: string }) {
  const [r, setR] = useState<Resumen | null>(null);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    const res = await fetch("/api/panel/push", { method: "POST", body: JSON.stringify({ password }) });
    if (res.ok) setR(await res.json());
  }, [password]);
  useEffect(() => { cargar(); }, [cargar]);

  // La prueba va al celular (o navegador) desde el que estás mirando el panel, si tiene los avisos activados.
  async function prueba() {
    setMsg("Enviando…");
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (!sub) return setMsg("Este celular no tiene los avisos activados. Activalos primero desde la app (campana de arriba).");
      const res = await fetch("/api/panel/push", { method: "POST", body: JSON.stringify({ password, accion: "prueba", endpoint: sub.endpoint }) });
      setMsg((await res.json().catch(() => ({}))).mensaje ?? "No se pudo enviar.");
      cargar();
    } catch {
      setMsg("No se pudo enviar la prueba desde este navegador.");
    }
  }

  if (!r) return <p className="vacio">Cargando…</p>;
  return (
    <div>
      <button className="btn ancho" onClick={prueba}>Enviarme una notificación de prueba</button>
      {msg && <p className="normal">{msg}</p>}

      <h2>Celulares con avisos activados</h2>
      <p><b>{r.total}</b> en total</p>
      {r.porBarrio.length > 0 && <ul className="lista">{r.porBarrio.map(([b, n]) => <li key={b}>{b}: <b>{n}</b></li>)}</ul>}
      <p className="vacio">
        Por tipo: {(Object.entries(config.push.tipos) as [string, { titulo: string }][]).map(([k, t]) => `${t.titulo} ${r.porTipo[k] ?? 0}`).join(" · ")}
      </p>

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
