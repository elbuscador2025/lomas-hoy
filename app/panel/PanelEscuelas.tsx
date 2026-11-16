"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { post } from "./api";
import { NIVELES, telefonoBonito, type EscuelaVista, type Inscripciones, type Nivel } from "@/lib/escuelas-comun";

type Datos = { inscripciones: Inscripciones; escuelas: EscuelaVista[]; actualizado: string | null; anio: string | null; fuente: string | null; total: number };
type Borrador = { id?: string; nombre: string; sector: "Estatal" | "Privada"; niveles: Nivel[]; direccion: string; barrio: string; telefono: string };
const vacio = (): Borrador => ({ nombre: "", sector: "Privada", niveles: [], direccion: "", barrio: "", telefono: "" });
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short", hour12: false }) : "nunca");
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const POR_VEZ = 25;

// Pestaña "Escuelas": el recuadro de inscripciones, el listado oficial (actualizar, editar, desactivar) y los establecimientos que agrego a mano.
export default function PanelEscuelas() {
  const [d, setD] = useState<Datos | null>(null);
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [q, setQ] = useState("");
  const [nivel, setNivel] = useState<Nivel | "">("");
  const [soloOcultas, setSoloOcultas] = useState(false);
  const [cuantas, setCuantas] = useState(POR_VEZ);
  const [edit, setEdit] = useState<Borrador | null>(null);
  const [insc, setInsc] = useState<{ fechas: string; resumen: string; detalle: string; modalidad: string; papeles: string; nota: string; enlaces: string } | null>(null);
  const cargar = useCallback(async () => {
    const r = await post("/api/panel/escuelas", { accion: "listar" });
    if (!r.ok) return;
    const j = (await r.json()) as Datos & { ok: boolean };
    setD(j);
    const i = j.inscripciones;
    setInsc((x) => x ?? { fechas: i.fechas, resumen: i.resumen, detalle: i.detalle, modalidad: i.modalidad, papeles: i.papeles.join("\n"), nota: i.nota, enlaces: i.enlaces.map((e) => `${e.titulo} | ${e.url}`).join("\n") });
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => setCuantas(POR_VEZ), [q, nivel, soloOcultas]);

  async function llamar(cuerpo: object, ok: string) {
    setOcupado(true); setMsg("");
    try {
      const r = await post("/api/panel/escuelas", cuerpo);
      const j = await r.json().catch(() => ({}));
      setMsg(j.ok ? ok : j.error || "No se pudo.");
      if (j.ok) await cargar();
      return !!j.ok;
    } finally { setOcupado(false); }
  }
  async function actualizar() {
    setOcupado(true); setMsg("Bajando el listado oficial… puede tardar un minuto.");
    try {
      const r = await post("/api/panel/escuelas", { accion: "actualizar" });
      const j = await r.json().catch(() => ({}));
      setMsg(j.ok ? `Listado actualizado: ${j.total} establecimientos (Relevamiento Anual ${j.anio}). ${j.nuevas} nuevos y ${j.sacadas} que ya no figuran.` : j.error || "No se pudo actualizar.");
      if (j.ok) await cargar();
    } catch { setMsg("No se pudo actualizar (tardó demasiado). Probá de nuevo."); }
    finally { setOcupado(false); }
  }
  async function guardarInsc() {
    if (!insc) return;
    await llamar({ accion: "inscripciones", datos: insc }, "Recuadro de inscripciones guardado: ya se ve en la app.");
  }
  async function guardarEdicion() {
    if (!edit) return;
    const ok = await llamar(edit.id ? { accion: "editar", id: edit.id, datos: edit } : { accion: "agregar", datos: edit }, edit.id ? "Cambios guardados." : "Establecimiento agregado.");
    if (ok) setEdit(null);
  }

  const lista = useMemo(() => (d?.escuelas ?? []).filter((e) => (soloOcultas ? !!e.desactivada : true) && (!nivel || e.niveles.includes(nivel)) && (!q.trim() || norm(`${e.nombre} ${e.direccion} ${e.barrio}`).includes(norm(q)))), [d, q, nivel, soloOcultas]);
  const ocultas = (d?.escuelas ?? []).filter((e) => e.desactivada).length;

  const formulario = edit && (
    <div className="mascota"><div className="mascota-datos" style={{ width: "100%" }}>
      <b>{edit.id ? "Editar establecimiento" : "Agregar establecimiento"}</b>
      <input value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} placeholder="Nombre" maxLength={120} style={{ width: "100%", minHeight: 44, fontSize: 16 }} />
      <label>Tipo <select value={edit.sector} onChange={(e) => setEdit({ ...edit, sector: e.target.value as "Estatal" | "Privada" })} style={{ minHeight: 40, fontSize: 16 }}><option>Estatal</option><option>Privada</option></select></label>
      <div className="acciones">
        {NIVELES.map((n) => (
          <label key={n} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input type="checkbox" checked={edit.niveles.includes(n)} onChange={(e) => setEdit({ ...edit, niveles: e.target.checked ? [...edit.niveles, n] : edit.niveles.filter((x) => x !== n) })} /> {n}
          </label>
        ))}
      </div>
      <input value={edit.direccion} onChange={(e) => setEdit({ ...edit, direccion: e.target.value })} placeholder="Dirección" maxLength={140} style={{ width: "100%", minHeight: 44, fontSize: 16 }} />
      <input value={edit.barrio} onChange={(e) => setEdit({ ...edit, barrio: e.target.value })} placeholder="Barrio o localidad" maxLength={60} list="barrios-escuelas" style={{ width: "100%", minHeight: 44, fontSize: 16 }} />
      <datalist id="barrios-escuelas">{[...new Set((d?.escuelas ?? []).map((e) => e.barrio))].map((b) => <option key={b} value={b} />)}</datalist>
      <input value={edit.telefono} onChange={(e) => setEdit({ ...edit, telefono: e.target.value })} placeholder="Teléfono con código de área (opcional)" inputMode="tel" maxLength={30} style={{ width: "100%", minHeight: 44, fontSize: 16 }} />
      <div className="acciones">
        <button className="btn" disabled={ocupado} onClick={guardarEdicion}>Guardar</button>
        <button className="btn claro" onClick={() => setEdit(null)}>Cancelar</button>
      </div>
    </div></div>
  );

  return (
    <div>
      {msg && <p className="normal" role="status">{msg}</p>}

      <h2>Listado oficial</h2>
      <p className="vacio">
        {d ? <>Hay <b>{d.total}</b> establecimientos cargados del Padrón Oficial (Relevamiento Anual {d.anio ?? "—"}), actualizado el {fecha(d.actualizado)}.</> : "Cargando…"}
        {" "}Mis cambios y lo que agrego a mano se conservan al actualizar.
      </p>
      <button className="btn" disabled={ocupado} onClick={actualizar}>Actualizar el listado oficial</button>

      <h2>Recuadro «Inscripciones 2027»</h2>
      {insc && (
        <div className="mascota"><div className="mascota-datos" style={{ width: "100%" }}>
          <label>Fechas (dejalo vacío si todavía no se publicaron)
            <textarea value={insc.fechas} onChange={(e) => setInsc({ ...insc, fechas: e.target.value })} rows={2} maxLength={400} style={{ width: "100%", fontSize: 16 }} />
          </label>
          <label>Aviso cuando no hay fechas
            <input value={insc.resumen} onChange={(e) => setInsc({ ...insc, resumen: e.target.value })} maxLength={200} style={{ width: "100%", minHeight: 44, fontSize: 16 }} />
          </label>
          <label>Detalle
            <textarea value={insc.detalle} onChange={(e) => setInsc({ ...insc, detalle: e.target.value })} rows={3} maxLength={600} style={{ width: "100%", fontSize: 16 }} />
          </label>
          <label>Cómo se hace (online o presencial)
            <textarea value={insc.modalidad} onChange={(e) => setInsc({ ...insc, modalidad: e.target.value })} rows={2} maxLength={300} style={{ width: "100%", fontSize: 16 }} />
          </label>
          <label>Papeles (uno por renglón)
            <textarea value={insc.papeles} onChange={(e) => setInsc({ ...insc, papeles: e.target.value })} rows={5} style={{ width: "100%", fontSize: 16 }} />
          </label>
          <label>Aclaración
            <textarea value={insc.nota} onChange={(e) => setInsc({ ...insc, nota: e.target.value })} rows={2} maxLength={400} style={{ width: "100%", fontSize: 16 }} />
          </label>
          <label>Enlaces oficiales (uno por renglón: Título | https://…)
            <textarea value={insc.enlaces} onChange={(e) => setInsc({ ...insc, enlaces: e.target.value })} rows={3} style={{ width: "100%", fontSize: 16 }} />
          </label>
          <div className="acciones">
            <button className="btn" disabled={ocupado} onClick={guardarInsc}>Guardar</button>
            <button className="btn claro" disabled={ocupado} onClick={async () => { if (confirm("¿Volver al texto original del recuadro?")) { setInsc(null); await llamar({ accion: "inscripciones-original" }, "Volvió el texto original."); } }}>Volver al texto original</button>
          </div>
        </div></div>
      )}

      <h2>Establecimientos ({lista.length}{ocultas ? ` · ${ocultas} desactivados` : ""})</h2>
      {!edit && <button className="btn" onClick={() => setEdit(vacio())}>+ Agregar uno a mano</button>}
      {edit && !edit.id && formulario}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, calle o barrio" type="search" style={{ width: "100%", minHeight: 44, fontSize: 16, margin: "8px 0" }} />
      <div className="acciones">
        <select value={nivel} onChange={(e) => setNivel(e.target.value as Nivel | "")} style={{ minHeight: 40, fontSize: 16 }}><option value="">Todos los niveles</option>{NIVELES.map((n) => <option key={n}>{n}</option>)}</select>
        <label style={{ display: "flex", gap: 4, alignItems: "center" }}><input type="checkbox" checked={soloOcultas} onChange={(e) => setSoloOcultas(e.target.checked)} /> Solo desactivados</label>
      </div>
      <ul className="lista">
        {lista.slice(0, cuantas).map((e) => (
          edit?.id === e.id ? <li key={e.id}>{formulario}</li> : (
            <li key={e.id} className="mascota">
              <div className="mascota-datos">
                <span className={`pildora ${e.desactivada ? "grave" : ""}`}>{e.desactivada ? "Desactivado" : "Activo"}</span>
                {e.manual && <span className="pildora">Agregado a mano</span>}
                {e.editada && <span className="pildora">Editado</span>}
                <b>{e.nombre}</b>
                <small>{e.sector} · {e.niveles.join(", ")}</small>
                <span>{e.direccion || "Sin dirección"}{e.barrio ? ` · ${e.barrio}` : ""} · {e.telefono ? telefonoBonito(e.telefono) : "Sin teléfono"}</span>
                <div className="acciones">
                  <button className="btn claro chico" onClick={() => setEdit({ id: e.id, nombre: e.nombre, sector: e.sector, niveles: e.niveles, direccion: e.direccion, barrio: e.barrio, telefono: e.telefono })}>Editar</button>
                  <button className="btn claro chico" disabled={ocupado} onClick={() => llamar({ accion: "desactivar", id: e.id, valor: !e.desactivada }, e.desactivada ? "Activado: vuelve a verse." : "Desactivado: ya no se ve en la app.")}>{e.desactivada ? "Activar" : "Desactivar"}</button>
                  {e.editada && <button className="btn claro chico" disabled={ocupado} onClick={() => llamar({ accion: "original", id: e.id }, "Volvió a los datos oficiales.")}>Volver al original</button>}
                  {e.manual && <button className="btn claro chico" disabled={ocupado} onClick={() => { if (confirm("¿Borrar este establecimiento?")) llamar({ accion: "borrar", id: e.id }, "Borrado."); }}>Borrar</button>}
                </div>
              </div>
            </li>
          )
        ))}
      </ul>
      {lista.length > cuantas && <button className="btn claro" onClick={() => setCuantas(cuantas + POR_VEZ)}>Ver más ({lista.length - cuantas} restantes)</button>}
    </div>
  );
}
