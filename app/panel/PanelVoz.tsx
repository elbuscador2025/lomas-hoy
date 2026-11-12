"use client";
import { useCallback, useEffect, useState } from "react";
import { post } from "./api";

type Opcion = { id: string; texto: string };
type Res = { total: number; opciones: { id: string; votos: number; pct: number }[] };
type Pregunta = { id: string; texto: string; opciones: Opcion[]; activa: boolean; orden: number; resultados: Res; fechas: string[] };
type Coment = { id: string; texto: string; creado: string; preguntaId: string; pregunta: string; oculta?: boolean; denuncias?: { motivo: string }[] };
type Datos = { hoy: { fecha: string; preguntaId: string | null; manual: boolean }; manana: { fecha: string; preguntaId: string | null }; preguntas: Pregunta[]; comentarios: Coment[] };
type Borrador = { id?: string; texto: string; opciones: Opcion[]; activa: boolean };

const fecha = (iso: string) => new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short", hour12: false });
const dia = (f: string) => f.split("-").reverse().slice(0, 2).join("/"); // 2026-11-12 → 12/11
const vacia = (): Borrador => ({ texto: "", opciones: [{ id: "", texto: "" }, { id: "", texto: "" }], activa: true });

// Pestaña "La Voz de Lomas": preguntas (crear, editar, activar), pregunta del día, resultados de todas y comentarios con sus denuncias.
export default function PanelVoz() {
  const [d, setD] = useState<Datos | null>(null);
  const [msg, setMsg] = useState("");
  const [edit, setEdit] = useState<Borrador | null>(null);
  const cargar = useCallback(async () => { const r = await post("/api/panel/voz", { accion: "listar" }); if (r.ok) setD(await r.json()); }, []);
  useEffect(() => { cargar(); }, [cargar]);
  async function accion(cuerpo: object, ok: string) {
    const r = await post("/api/panel/voz", cuerpo);
    const j = await r.json().catch(() => ({}));
    setMsg(j.ok ? ok : j.error || "No se pudo.");
    cargar();
    return !!j.ok;
  }
  async function guardar() {
    if (!edit) return;
    if (await accion({ accion: "guardar", pregunta: { id: edit.id, texto: edit.texto, opciones: edit.opciones, activa: edit.activa } }, edit.id ? "Pregunta guardada." : "Pregunta creada.")) setEdit(null);
  }
  const hoyP = d?.preguntas.find((p) => p.id === d.hoy.preguntaId);
  const mananaP = d?.preguntas.find((p) => p.id === d.manana.preguntaId);

  return (
    <div>
      {msg && <p className="normal">{msg}</p>}

      <h2>Pregunta de hoy</h2>
      {hoyP ? (
        <div className="mascota"><div className="mascota-datos">
          <b>{hoyP.texto}</b>
          <small>{d!.hoy.manual ? "La elegí yo a mano." : "Sale por la rotación automática."} · {hoyP.resultados.total} votos</small>
          {d!.hoy.manual && <div className="acciones"><button className="btn claro chico" onClick={() => accion({ accion: "elegir", id: "", cuando: "hoy" }, "Hoy vuelve la rotación automática.")}>Volver a la rotación automática</button></div>}
        </div></div>
      ) : <p className="vacio">Hoy no hay pregunta: no hay ninguna activa.</p>}
      <p className="vacio">Mañana ({dia(d?.manana.fecha ?? "")}): {mananaP ? <>la elegí a mano — <b>{mananaP.texto}</b> <button className="btn claro chico" onClick={() => accion({ accion: "elegir", id: "", cuando: "manana" }, "Mañana vuelve la rotación automática.")}>Quitar</button></> : "rotación automática."}</p>

      <h2>Preguntas ({d?.preguntas.length ?? 0})</h2>
      {!edit && <button className="btn" onClick={() => setEdit(vacia())}>+ Nueva pregunta</button>}
      {edit && (
        <div className="mascota"><div className="mascota-datos" style={{ width: "100%" }}>
          <b>{edit.id ? "Editar pregunta" : "Nueva pregunta"}</b>
          <input value={edit.texto} onChange={(e) => setEdit({ ...edit, texto: e.target.value })} placeholder="La pregunta" maxLength={120} style={{ width: "100%", minHeight: 44, fontSize: 16 }} />
          {edit.opciones.map((o, i) => (
            <div key={i} style={{ display: "flex", gap: 6, width: "100%" }}>
              <input value={o.texto} onChange={(e) => setEdit({ ...edit, opciones: edit.opciones.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)) })} placeholder={`Opción ${i + 1}`} maxLength={60} style={{ flex: 1, minHeight: 44, fontSize: 16 }} />
              {edit.opciones.length > 2 && <button className="btn claro chico" onClick={() => setEdit({ ...edit, opciones: edit.opciones.filter((_, j) => j !== i) })}>Quitar</button>}
            </div>
          ))}
          {edit.opciones.length < 4 && <button className="btn claro chico" onClick={() => setEdit({ ...edit, opciones: [...edit.opciones, { id: "", texto: "" }] })}>+ Agregar opción</button>}
          <label><input type="checkbox" checked={edit.activa} onChange={(e) => setEdit({ ...edit, activa: e.target.checked })} /> Activa (entra en la rotación)</label>
          <div className="acciones">
            <button className="btn" onClick={guardar}>Guardar</button>
            <button className="btn claro" onClick={() => setEdit(null)}>Cancelar</button>
          </div>
        </div></div>
      )}
      <ul className="lista">
        {d?.preguntas.map((p) => (
          <li key={p.id} className="mascota">
            <div className="mascota-datos">
              <span className={`pildora ${p.activa ? "" : "grave"}`}>{p.activa ? "Activa" : "Apagada"}</span>
              {d.hoy.preguntaId === p.id && <span className="pildora">Hoy</span>}
              {d.manana.preguntaId === p.id && <span className="pildora">Mañana</span>}
              <b>{p.texto}</b>
              <small>{p.resultados.total === 0 ? "Sin votos" : `${p.resultados.total} ${p.resultados.total === 1 ? "voto" : "votos"}`}{p.fechas.length ? ` · fue pregunta del día: ${p.fechas.map(dia).join(", ")}` : ""}</small>
              <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
                {p.opciones.map((o) => { const r = p.resultados.opciones.find((x) => x.id === o.id); return <li key={o.id}>{o.texto} — <b>{r?.votos ?? 0}</b>{p.resultados.total ? ` (${r?.pct ?? 0}%)` : ""}</li>; })}
              </ul>
              <div className="acciones">
                <button className="btn claro chico" onClick={() => setEdit({ id: p.id, texto: p.texto, opciones: p.opciones, activa: p.activa })}>Editar</button>
                <button className="btn claro chico" onClick={() => accion({ accion: "activar", id: p.id, activa: !p.activa }, p.activa ? "Apagada: ya no sale." : "Activada.")}>{p.activa ? "Desactivar" : "Activar"}</button>
                {p.activa && d.hoy.preguntaId !== p.id && <button className="btn chico" onClick={() => accion({ accion: "elegir", id: p.id, cuando: "hoy" }, "Esta es la pregunta de hoy.")}>Usar hoy</button>}
                {p.activa && d.manana.preguntaId !== p.id && <button className="btn claro chico" onClick={() => accion({ accion: "elegir", id: p.id, cuando: "manana" }, "Esta es la pregunta de mañana.")}>Usar mañana</button>}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <h2>Comentarios ({d?.comentarios.length ?? 0})</h2>
      {d && d.comentarios.length === 0 && <p className="vacio">Todavía no hay comentarios.</p>}
      <ul className="lista">
        {d?.comentarios.map((c) => (
          <li key={c.preguntaId + c.id} className="mascota">
            <div className="mascota-datos">
              {c.denuncias?.length ? <span className="pildora grave">{c.oculta ? "Oculto" : "Denunciado"} · {c.denuncias.length} · {[...new Set(c.denuncias.map((x) => x.motivo))].join(", ")}</span> : c.oculta ? <span className="pildora grave">Oculto por mí</span> : null}
              <span>{c.texto}</span>
              <small>{fecha(c.creado)} · {c.pregunta}</small>
              <div className="acciones">
                {c.denuncias?.length ? <button className="btn chico" onClick={() => accion({ accion: "dejar", id: c.preguntaId, cid: c.id }, "Revisado: se ve de nuevo.")}>Dejar publicado</button> : null}
                <button className="btn claro chico" onClick={() => accion({ accion: "ocultar", id: c.preguntaId, cid: c.id, oculta: !c.oculta }, c.oculta ? "Ahora se ve." : "Oculto.")}>{c.oculta ? "Mostrar" : "Ocultar"}</button>
                <button className="btn claro chico" onClick={() => { if (confirm("¿Borrar este comentario?")) accion({ accion: "borrar", id: c.preguntaId, cid: c.id }, "Borrado."); }}>Borrar</button>
                <button className="btn claro chico" onClick={() => { if (confirm("¿Bloquear a quien escribió esto? Ese celular no va a poder votar ni comentar.")) accion({ accion: "bloquear", id: c.preguntaId, cid: c.id }, "Bloqueado."); }}>Bloquear</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
