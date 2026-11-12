"use client";
import { useCallback, useEffect, useState } from "react";
import { post } from "./api";

type Comentario = { id: string; texto: string; creado: string; duenio: boolean; padre?: string; aQuien?: string; oculta?: boolean; denuncias?: { motivo: string }[] };
type Emp = {
  id: string; titulo: string; descripcion: string; fotos: string[]; telefono: string; whatsapp: string; creado: string; vence: string; conAviso: boolean;
  oculta?: boolean; denuncias?: { motivo: string }[]; conversacion: Comentario[];
};
const fecha = (iso: string) => new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short", hour12: false });
const Marca = ({ r }: { r: { oculta?: boolean; denuncias?: { motivo: string }[] } }) =>
  r.denuncias?.length ? <span className="pildora grave">{r.oculta ? "Oculto" : "Denunciado"} · {r.denuncias.length} · {[...new Set(r.denuncias.map((d) => d.motivo))].join(", ")}</span> : null;

// Pestaña "Emprendedores": todas las publicaciones con sus conversaciones. Borrar, dejar publicado lo ocultado por denuncias y bloquear.
export default function PanelEmprendedores() {
  const [lista, setLista] = useState<Emp[]>([]);
  const [msg, setMsg] = useState("");
  const cargar = useCallback(async () => { const r = await post("/api/panel/emprendedores", { accion: "listar" }); if (r.ok) setLista((await r.json()).lista); }, []);
  useEffect(() => { cargar(); }, [cargar]);
  async function accion(cuerpo: object, ok: string) { const r = await post("/api/panel/emprendedores", cuerpo); setMsg((await r.json().catch(() => ({}))).ok ? ok : "No se pudo."); cargar(); }
  // Un comentario o una respuesta, con sus botones para dejar, borrar y bloquear
  const mensaje = (e: Emp, c: Comentario) => (
    <>
      <Marca r={c} />
      {c.aQuien && <small>↳ Respondiendo a: «{(e.conversacion.find((x) => x.id === c.aQuien)?.texto ?? "mensaje que ya no está").slice(0, 40)}»</small>}
      <span>{c.duenio ? "🟢 Dueño de la publicación: " : ""}{c.texto}</span>
      <small>{fecha(c.creado)}</small>
      <div className="acciones">
        {c.denuncias?.length ? <button className="btn chico" onClick={() => accion({ accion: "dejar", id: e.id, cid: c.id }, "Revisado: se ve de nuevo.")}>Dejar</button> : null}
        <button className="btn claro chico" onClick={() => { if (confirm(c.padre ? "¿Borrar esta respuesta?" : "¿Borrar este mensaje y sus respuestas?")) accion({ accion: "borrar", id: e.id, cid: c.id }, "Mensaje borrado."); }}>Borrar</button>
        {!c.duenio && <button className="btn claro chico" onClick={() => { if (confirm("¿Bloquear a quien escribió este mensaje?")) accion({ accion: "bloquear", id: e.id, cid: c.id }, "Bloqueado."); }}>Bloquear</button>}
      </div>
    </>
  );
  return (
    <div>
      {msg && <p className="normal">{msg}</p>}
      <h2>Emprendimientos ({lista.length})</h2>
      {lista.length === 0 && <p className="vacio">No hay emprendimientos.</p>}
      <ul className="lista">
        {lista.map((e) => (
          <li key={e.id} className="mascota">
            {e.fotos.length > 0 && (
              <div className="emp-fotos">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {e.fotos.map((f) => <img key={f} src={f} alt="" loading="lazy" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10 }} />)}
              </div>
            )}
            <div className="mascota-datos">
              <Marca r={e} />
              <b>{e.titulo}</b>
              <span>{e.descripcion}</span>
              <small>{e.telefono ? `Tel: ${e.telefono} · ` : ""}Publicado {fecha(e.creado)} · Vence {fecha(e.vence)} · {e.conAviso ? "recibe avisos" : "sin avisos"}</small>
              <div className="acciones">
                {e.denuncias?.length ? <button className="btn" onClick={() => accion({ accion: "dejar", id: e.id }, "Revisado: se ve de nuevo.")}>Dejar publicado</button> : null}
                <button className="btn claro" onClick={() => { if (confirm("¿Borrar este emprendimiento, sus fotos y su conversación?")) accion({ accion: "borrar", id: e.id }, "Borrado."); }}>Borrar</button>
                <button className="btn claro" onClick={() => { if (confirm("¿Bloquear? Se bajan todas sus publicaciones y ese celular no puede volver a publicar ni escribir.")) accion({ accion: "bloquear", id: e.id }, "Bloqueado."); }}>Bloquear</button>
              </div>
              {e.conversacion.length > 0 && <b>Conversación ({e.conversacion.length})</b>}
              <ul className="lista emp-conv" style={{ width: "100%" }}>
                {e.conversacion.filter((c) => !c.padre || !e.conversacion.some((x) => x.id === c.padre)).map((c) => (
                  <li key={c.id}>
                    {mensaje(e, c)}
                    {/* las respuestas, debajo de su comentario (de la más vieja a la más nueva) */}
                    {e.conversacion.some((r) => r.padre === c.id) && (
                      <ul className="lista" style={{ margin: "6px 0 0 14px", borderLeft: "3px solid #BFD3F2", paddingLeft: 10 }}>
                        {e.conversacion.filter((r) => r.padre === c.id).map((r) => <li key={r.id}>{mensaje(e, r)}</li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
