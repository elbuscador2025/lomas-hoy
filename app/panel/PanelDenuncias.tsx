"use client";
import { useCallback, useEffect, useState } from "react";
import { post } from "./api";

type Denuncia = { id: string; seccion: "trueque" | "trabajo"; motivo: string; whatsapp: string; publicacion: string; texto: string; t: string; bloqueada?: boolean };
const fecha = (iso: string) => new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short", hour12: false });

// Pestaña "Denuncias": las que mandaron los vecinos con "Denunciar una estafa".
export default function PanelDenuncias() {
  const [lista, setLista] = useState<Denuncia[]>([]);
  const [msg, setMsg] = useState("");
  const cargar = useCallback(async () => {
    const r = await post("/api/panel/estafas", { accion: "listar" });
    if (r.ok) setLista((await r.json()).denuncias);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  return (
    <div>
      {msg && <p className="normal">{msg}</p>}
      <h2>Denuncias de estafa ({lista.length})</h2>
      {lista.length === 0 && <p className="vacio">Todavía no hay denuncias.</p>}
      <ul className="lista">
        {lista.map((d) => (
          <li key={d.id}>
            <span className="pildora grave">{d.motivo}</span>
            <br /><b>{d.seccion === "trueque" ? "Trueque" : "Trabajo para mayores de 50 años"}</b> · {fecha(d.t)}
            <br />WhatsApp: {d.whatsapp || "no puso"}
            {d.publicacion && <><br />Publicación: {d.publicacion}</>}
            {d.texto && <><br />{d.texto}</>}
            <div className="acciones">
              {d.whatsapp && (d.bloqueada
                ? <span className="pildora ok">Número bloqueado</span>
                : <button className="btn" onClick={async () => {
                    if (!confirm("¿Bloquear este número? Se bajan sus publicaciones y no puede volver a publicar.")) return;
                    const r = await post("/api/panel/estafas", { accion: "bloquear", id: d.id });
                    setMsg(r.ok ? "Bloqueado: se bajaron todas sus publicaciones." : "No se pudo bloquear.");
                    cargar();
                  }}>Bloquear número</button>)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
