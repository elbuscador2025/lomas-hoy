"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { config } from "@/lomas.config.mjs";
import type { Institucion } from "@/lib/deportes";
import { achicar } from "../Mascotas";
import { post } from "./api";

const vacio: Institucion = { id: "", nombre: "", disciplinas: [], direccion: "", barrio: "", edades: "", horarios: "", costo: "", telefono: "", whatsapp: "", inscripcion: "", fuente: "", fuenteUrl: "", foto: "", activa: true, actualizado: "" };

// Pestaña "Deportes": clubes y escuelas deportivas para chicos. Mientras el interruptor esté apagado, solo yo veo la sección en la app.
export default function PanelDeportes() {
  const [visible, setVisible] = useState(false);
  const [discs, setDiscs] = useState<string[]>([]);
  const [lista, setLista] = useState<Institucion[]>([]);
  const [ed, setEd] = useState<Institucion | null>(null);
  const [nueva, setNueva] = useState("");
  const [msg, setMsg] = useState("");
  const archivo = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    const r = await post("/api/panel/deportes", { accion: "listar" });
    if (r.ok) { const d = await r.json(); setVisible(d.visible); setDiscs(d.disciplinas); setLista(d.instituciones); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!ed) return;
    const r = await post("/api/panel/deportes", { accion: "guardar", institucion: ed });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setMsg("Guardado."); setEd({ ...ed, id: d.id }); cargar(); } else setMsg(d.error ?? "No se pudo guardar.");
  }
  async function agregarDisciplina(e: React.FormEvent) {
    e.preventDefault();
    const r = await post("/api/panel/deportes", { accion: "disciplina", nombre: nueva });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? `Deporte agregado: ${nueva}.` : d.error ?? "No se pudo agregar.");
    if (r.ok) { setNueva(""); cargar(); }
  }
  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !ed?.id) return setMsg("Guardá primero el club y después subí la foto.");
    try {
      const b = await achicar(f);
      const form = new FormData();
      form.append("id", ed.id); form.append("foto", b, "foto.jpg");
      const r = await fetch("/api/panel/deportes/foto", { method: "POST", body: form });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) location.href = "/entrar";
      if (r.ok) { setEd({ ...ed, foto: d.url }); setMsg("Foto subida."); cargar(); } else setMsg(d.error ?? "No se pudo subir la foto.");
    } catch { setMsg("No pudimos leer esa foto. Probá con otra."); }
  }
  const campo = (k: keyof Institucion) => ({ value: String(ed?.[k] ?? ""), onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => ed && setEd({ ...ed, [k]: e.target.value }) });

  return (
    <div>
      <div className="interruptor-fila">
        <span><b>Mostrar sección a los vecinos</b><small>Apagado: los vecinos no ven “Deportes para chicos”. Vos sí la ves en la app mientras tengas la sesión abierta.</small></span>
        <button role="switch" aria-checked={visible} aria-label="Mostrar sección a los vecinos" className={`interruptor ${visible ? "on" : ""}`}
          onClick={async () => { const n = !visible; setVisible(n); await post("/api/panel/deportes", { accion: "visible", valor: n }); }}><span /></button>
      </div>
      {msg && <p className="normal">{msg}</p>}

      {ed ? (
        <form onSubmit={guardar} className="form">
          <h2>{ed.id ? "Editar club" : "Nuevo club"}</h2>
          <label>Nombre<input {...campo("nombre")} maxLength={120} required /></label>
          <fieldset className="form">
            <legend>Deportes</legend>
            {discs.map((d) => (
              <label key={d} className="casilla"><input type="checkbox" checked={ed.disciplinas.includes(d)}
                onChange={(e) => setEd({ ...ed, disciplinas: e.target.checked ? [...ed.disciplinas, d] : ed.disciplinas.filter((x) => x !== d) })} /> {d}</label>
            ))}
          </fieldset>
          <label>Dirección<input {...campo("direccion")} maxLength={160} /></label>
          <label>Barrio o localidad<input {...campo("barrio")} list="dep-barrios" maxLength={60} /></label>
          <datalist id="dep-barrios">{config.localidades.map((l) => <option key={l} value={l} />)}</datalist>
          <label>Edades<input {...campo("edades")} maxLength={80} placeholder="Ej: de 5 a 12 años" /></label>
          <label>Días y horarios<textarea {...campo("horarios")} maxLength={300} rows={3} /></label>
          <label>Costo
            <select {...campo("costo")}>
              <option value="">Consultar (no está publicado)</option>
              <option value="gratis">Gratis</option>
              <option value="pago">Pago</option>
            </select>
          </label>
          <label>Teléfono<input {...campo("telefono")} maxLength={40} inputMode="tel" /></label>
          <label>WhatsApp<input {...campo("whatsapp")} maxLength={40} inputMode="tel" /></label>
          <label>Inscripción<textarea {...campo("inscripcion")} maxLength={300} rows={2} /></label>
          <label>Fuente (quién lo publica)<input {...campo("fuente")} maxLength={120} placeholder="Ej: Sitio oficial del club" /></label>
          <label>Enlace de la fuente<input {...campo("fuenteUrl")} maxLength={300} inputMode="url" placeholder="https://…" /></label>
          <label className="casilla"><input type="checkbox" checked={ed.activa} onChange={(e) => setEd({ ...ed, activa: e.target.checked })} /> Activa (se muestra en la sección)</label>
          <div>
            <b>Foto</b>
            {ed.foto && /* eslint-disable-next-line @next/next/no-img-element */ <img className="vista-previa" src={ed.foto} alt="Foto del club" />}
            <input ref={archivo} type="file" accept="image/*" hidden onChange={subirFoto} />
            <div className="acciones">
              <button type="button" className="btn claro" onClick={() => archivo.current?.click()} disabled={!ed.id}>{ed.foto ? "Cambiar foto" : "Subir foto"}</button>
              {ed.foto && <button type="button" className="btn claro" onClick={async () => { await post("/api/panel/deportes", { accion: "quitar-foto", id: ed.id }); setEd({ ...ed, foto: "" }); cargar(); }}>Quitar foto</button>}
            </div>
            {!ed.id && <small className="chico">Guardá el club primero para poder subir la foto.</small>}
          </div>
          <button className="btn">Guardar</button>
          <button type="button" className="btn claro" onClick={() => { setEd(null); setMsg(""); }}>Cerrar</button>
        </form>
      ) : (
        <>
          <button className="btn" onClick={() => { setEd({ ...vacio }); setMsg(""); }}>+ Agregar club</button>
          <form onSubmit={agregarDisciplina} className="form">
            <label>Agregar un deporte nuevo<input value={nueva} onChange={(e) => setNueva(e.target.value)} maxLength={40} placeholder="Ej: Gimnasia artística" /></label>
            <button className="btn claro">Agregar deporte</button>
          </form>
          <small className="chico">Deportes: {discs.join(" · ")}</small>
          <h2>Clubes cargados ({lista.length})</h2>
          {lista.length === 0 && <p className="vacio">Todavía no hay clubes cargados.</p>}
          {lista.map((i) => (
            <div key={i.id} className="fila-panel">
              <span><b>{i.nombre}</b>{!i.activa && " (desactivada)"}<br /><small>{i.disciplinas.join(" · ")} · {i.barrio || "barrio: consultar"} · {i.costo === "gratis" ? "Gratis" : i.costo === "pago" ? "Pago" : "costo: consultar"}</small></span>
              <span className="acciones">
                <button className="btn claro chico" onClick={() => { setEd(i); setMsg(""); }}>Editar</button>
                <button className="btn claro chico" onClick={async () => { await post("/api/panel/deportes", { accion: "activar", id: i.id, valor: !i.activa }); cargar(); }}>{i.activa ? "Desactivar" : "Activar"}</button>
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
