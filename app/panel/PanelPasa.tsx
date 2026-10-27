"use client";
import { useCallback, useEffect, useState } from "react";
import { TIPOS_PASA } from "@/lib/pasa-comun";
import { post } from "./api";
import { Denuncias } from "./Moderar";

type Aviso = { id: string; tipo: string; texto: string; barrio: string; donde: string; foto: { url: string } | null; creado: string; vence: string; oculta?: boolean; denuncias?: { motivo: string }[] };
const fecha = (iso: string) => new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short", hour12: false });

// Pestaña "Avisos de vecinos": todos los avisos de las últimas 24 horas, con "Borrar" y "Bloquear".
export default function PanelPasa() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [msg, setMsg] = useState("");
  const cargar = useCallback(async () => { const r = await post("/api/panel/pasa", { accion: "listar" }); if (r.ok) setAvisos((await r.json()).avisos); }, []);
  useEffect(() => { cargar(); }, [cargar]);
  async function accion(cuerpo: object, ok: string) { const r = await post("/api/panel/pasa", cuerpo); setMsg((await r.json().catch(() => ({}))).ok ? ok : "No se pudo."); cargar(); }
  return (
    <div>
      {msg && <p className="normal">{msg}</p>}
      <h2>Avisos de las últimas 24 horas ({avisos.length})</h2>
      {avisos.length === 0 && <p className="vacio">No hay avisos.</p>}
      <ul className="lista">
        {avisos.map((a) => {
          const t = TIPOS_PASA.find((x) => x.id === a.tipo);
          return (
            <li key={a.id} className="mascota">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {a.foto && <img className="foto-mascota" src={a.foto.url} alt="Foto" loading="lazy" />}
              <div className="mascota-datos">
                <Denuncias r={a} />
                <b>{t?.emoji} {t?.nombre}: {a.texto}</b>
                <small>{a.donde}{a.barrio ? ` · ${a.barrio}` : ""} · Publicado {fecha(a.creado)} · Se borra {fecha(a.vence)}</small>
                <div className="acciones">
                  {a.denuncias?.length ? <button className="btn" onClick={() => accion({ accion: "dejar", id: a.id }, "Revisado: se ve de nuevo.")}>Dejar publicado</button> : null}
                  <button className="btn claro" onClick={() => { if (confirm("¿Borrar este aviso?")) accion({ accion: "borrar", id: a.id }, "Borrado."); }}>Borrar</button>
                  <button className="btn claro" onClick={() => { if (confirm("¿Bloquear? Se bajan todos sus avisos y ese celular no puede volver a publicar.")) accion({ accion: "bloquear", id: a.id }, "Bloqueado."); }}>Bloquear</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
