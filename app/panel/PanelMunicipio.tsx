"use client";
import { useCallback, useEffect, useState } from "react";
import { post } from "./api";

type Persona = { usuario: string; nombre: string; area?: string; correo?: string; alta?: string; ultimoIngreso?: string | null; activo: boolean; firma: string; avisos: number };
type Aviso = { id: string; titulo: string; zona: string; actividad: string | null; firma: string; autor: string; creado: string };
const fecha = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short", hour12: false }) : "—";

// Enlace de un solo uso con "Copiar" y "Mandar por WhatsApp"
function EnlaceCompartible({ url, texto, nota }: { url: string; texto: string; nota: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="enlace">
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace" />
      <small>{nota}</small>
      <div className="acciones">
        <button className="btn claro" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopiado(true); } catch {} }}>{copiado ? "¡Copiado!" : "Copiar"}</button>
        <a className="btn whatsapp-chico" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`}>Mandar por WhatsApp</a>
      </div>
    </div>
  );
}

// Pestaña "Municipio" de mi panel: gente, invitaciones, barrios, avisos y tope diario.
export default function PanelMunicipio() {
  const [gente, setGente] = useState<Persona[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [tope, setTope] = useState(3);
  const [hoy, setHoy] = useState(0);
  const [barrios, setBarrios] = useState<string[]>([]);
  const [barrioNuevo, setBarrioNuevo] = useState("");
  const [invitacion, setInvitacion] = useState("");
  const [enlaces, setEnlaces] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    const r = await post("/api/panel/municipio", { accion: "listar" });
    if (!r.ok) return;
    const d = await r.json();
    setGente(d.usuarios); setAvisos(d.avisos); setTope(d.tope); setHoy(d.publicadosHoy); setBarrios(d.barrios);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function accion(cuerpo: object, ok = "Listo.") {
    const r = await post("/api/panel/municipio", cuerpo);
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? ok : d.error ?? "No se pudo.");
    if (r.ok) cargar();
    return r.ok ? d : null;
  }

  return (
    <div>
      {msg && <p className="normal">{msg}</p>}

      <h2>Invitar a una persona del municipio</h2>
      <p className="vacio">El enlace sirve una sola vez y vence a los 7 días.</p>
      <button className="btn ancho" onClick={async () => { const d = await accion({ accion: "invitar" }, "Enlace creado."); if (d) setInvitacion(d.url); }}>Invitar</button>
      {invitacion && <EnlaceCompartible url={invitacion} nota="Sirve una sola vez. Vence en 7 días." texto="Te invito a publicar avisos para los vecinos en Lomas Hoy. Creá tu cuenta con este enlace (sirve una sola vez y vence en 7 días):" />}

      <h2>Gente del municipio</h2>
      {gente.length === 0 && <p className="vacio">Todavía no hay nadie. Usá “Invitar”.</p>}
      {gente.map((p) => (
        <div key={p.usuario} className="persona">
          <b>{p.nombre}{p.activo ? "" : " (de baja)"}</b>
          <span>{p.area ?? "—"} · {p.correo ?? p.usuario}</span>
          <small>Alta: {fecha(p.alta)} · Último ingreso: {fecha(p.ultimoIngreso)} · Avisos: {p.avisos}</small>
          <div className="acciones">
            <button className="btn claro chico" onClick={() => confirm(p.activo ? `¿Dar de baja a ${p.nombre}?` : `¿Volver a dar de alta a ${p.nombre}?`) && accion({ accion: "activar", usuario: p.usuario, activo: !p.activo }, p.activo ? "Dado de baja." : "Dado de alta.")}>{p.activo ? "Dar de baja" : "Dar de alta"}</button>
            {p.activo && <button className="btn claro chico" onClick={async () => { const d = await accion({ accion: "nuevaClave", usuario: p.usuario }, "Enlace creado."); if (d) setEnlaces((e) => ({ ...e, [p.usuario]: d.url })); }}>Nueva contraseña</button>}
          </div>
          {enlaces[p.usuario] && <EnlaceCompartible url={enlaces[p.usuario]} nota="Sirve una sola vez. Vence en 24 horas." texto={`Hola ${p.nombre}, con este enlace elegís tu contraseña nueva de Lomas Hoy (sirve una sola vez y vence en 24 horas):`} />}
        </div>
      ))}

      <h2>Barrios</h2>
      <p className="vacio">Son los que el municipio puede poner al principio del título de un aviso. “Todo Lomas” siempre está.</p>
      {barrios.map((b) => (
        <div key={b} className="fila-panel">
          <b>{b}</b>
          <span className="acciones">
            <button className="btn claro chico" onClick={() => { const nuevo = prompt(`Nuevo nombre para "${b}":`, b); if (nuevo && nuevo !== b) accion({ accion: "renombrarBarrio", viejo: b, nuevo }, "Barrio renombrado."); }}>Renombrar</button>
            <button className="btn claro chico" onClick={() => confirm(`¿Quitar "${b}" de la lista?`) && accion({ accion: "quitarBarrio", nombre: b }, "Barrio quitado.")}>Quitar</button>
          </span>
        </div>
      ))}
      <form className="avisar" onSubmit={async (e) => { e.preventDefault(); if (await accion({ accion: "agregarBarrio", nombre: barrioNuevo }, "Barrio agregado.")) setBarrioNuevo(""); }}>
        <input placeholder="Barrio nuevo" value={barrioNuevo} onChange={(e) => setBarrioNuevo(e.target.value)} />
        <button className="btn chico">Agregar</button>
      </form>

      <h2>Tope de avisos por día</h2>
      <p className="vacio">Para todo el municipio. Hoy se publicaron {hoy}.</p>
      <div className="avisar">
        <input type="number" min={0} max={100} value={tope} onChange={(e) => setTope(Number(e.target.value))} />
        <button className="btn chico" onClick={() => accion({ accion: "tope", tope }, "Tope guardado.")}>Guardar</button>
      </div>

      <h2>Todos los avisos ({avisos.length})</h2>
      {avisos.length === 0 && <p className="vacio">Todavía no hay avisos.</p>}
      {avisos.map((a) => (
        <div key={a.id} className="fila-panel">
          <span><b>{a.titulo}</b><br /><small>{a.zona} · {a.firma} · publicó {a.autor} el {fecha(a.creado)}{a.actividad ? ` · actividad ${a.actividad.replace("T", " ")}` : ""}</small></span>
          <button className="btn claro chico" onClick={() => confirm(`¿Borrar "${a.titulo}"?`) && accion({ accion: "borrarAviso", id: a.id }, "Aviso borrado.")}>Borrar</button>
        </div>
      ))}
    </div>
  );
}
