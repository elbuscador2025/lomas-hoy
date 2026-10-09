"use client";
import { useCallback, useEffect, useState } from "react";

type Usuario = { usuario: string; nombre: string; firma: string; activo: boolean };
type Aviso = { id: string; titulo: string; zona: string; actividad: string | null; firma: string; autor: string; creado: string };
const fecha = (iso: string) => new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" });

// Pestaña "Municipio" de mi panel: usuarios, avisos y tope diario.
export default function PanelMunicipio({ password }: { password: string }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [tope, setTope] = useState(3);
  const [hoy, setHoy] = useState(0);
  const [nuevo, setNuevo] = useState({ usuario: "", nombre: "", firma: "", clave: "" });
  const [msg, setMsg] = useState("");

  const llamar = useCallback(async (cuerpo: object) => {
    const r = await fetch("/api/panel/municipio", { method: "POST", body: JSON.stringify({ password, ...cuerpo }) });
    return { ok: r.ok, datos: await r.json().catch(() => ({})) };
  }, [password]);

  const cargar = useCallback(async () => {
    const { ok, datos } = await llamar({ accion: "listar" });
    if (ok) { setUsuarios(datos.usuarios); setAvisos(datos.avisos); setTope(datos.tope); setHoy(datos.publicadosHoy); }
  }, [llamar]);
  useEffect(() => { cargar(); }, [cargar]);

  async function accion(cuerpo: object, ok = "Listo.") {
    const r = await llamar(cuerpo);
    setMsg(r.ok ? ok : r.datos.error ?? "No se pudo.");
    if (r.ok) cargar();
    return r.ok;
  }

  return (
    <div>
      {msg && <p className="normal">{msg}</p>}

      <h2>Tope de avisos por día</h2>
      <p className="vacio">Para todo el municipio. Hoy se publicaron {hoy}.</p>
      <div className="avisar">
        <input type="number" min={0} max={100} value={tope} onChange={(e) => setTope(Number(e.target.value))} />
        <button className="btn chico" onClick={() => accion({ accion: "tope", tope }, "Tope guardado.")}>Guardar</button>
      </div>

      <h2>Usuarios del municipio</h2>
      {usuarios.length === 0 && <p className="vacio">Todavía no hay usuarios.</p>}
      {usuarios.map((u) => (
        <div key={u.usuario} className="fila-panel">
          <span><b>{u.usuario}</b> {u.activo ? "" : "(desactivado)"}<br /><small>{u.nombre} · firma: {u.firma}</small></span>
          <span className="acciones">
            <button className="btn claro chico" onClick={() => accion({ accion: "activar", usuario: u.usuario, activo: !u.activo })}>{u.activo ? "Desactivar" : "Activar"}</button>
            <button className="btn claro chico" onClick={() => {
              const clave = prompt(`Nueva contraseña para ${u.usuario} (mínimo 8 caracteres):`);
              if (clave) accion({ accion: "cambiarClave", usuario: u.usuario, clave }, "Contraseña cambiada.");
            }}>Cambiar clave</button>
          </span>
        </div>
      ))}

      <form className="form" onSubmit={async (e) => { e.preventDefault(); if (await accion({ accion: "crearUsuario", ...nuevo }, "Usuario creado.")) setNuevo({ usuario: "", nombre: "", firma: "", clave: "" }); }}>
        <h2>Crear usuario</h2>
        <input placeholder="Usuario (minúsculas, sin espacios)" value={nuevo.usuario} onChange={(e) => setNuevo({ ...nuevo, usuario: e.target.value })} />
        <input placeholder="Nombre de la persona" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
        <input placeholder="Firma (vacío = Municipio de Lomas de Zamora)" value={nuevo.firma} onChange={(e) => setNuevo({ ...nuevo, firma: e.target.value })} />
        <input type="password" placeholder="Contraseña (mínimo 8 caracteres)" value={nuevo.clave} onChange={(e) => setNuevo({ ...nuevo, clave: e.target.value })} />
        <button className="btn">Crear usuario</button>
      </form>

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
