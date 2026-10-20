"use client";
import { useRef, useState } from "react";
import { config } from "@/lomas.config.mjs";
import { RUBROS, type PublicacionTrabajo, type Modo } from "@/lib/trabajo-comun";
import { AVISO_TRABAJO, datoProhibido } from "@/lib/estafas";
import { Icono } from "./Iconos";
import { achicar } from "./Mascotas";
import { useBarrios, Cancelar } from "./Trueque";
import Denunciar from "./Denunciar";

const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "long" });
const dispositivo = () => { try { return localStorage.getItem("lomas-hoy:id") ?? ""; } catch { return ""; } };

export function TrabajoCard({ p }: { p: PublicacionTrabajo }) {
  const texto = `Hola, te escribo por tu publicación de ${p.modo === "ofrezco" ? "trabajo" : "búsqueda de trabajo"} que vi en Lomas Hoy (${p.texto.slice(0, 60)}).`;
  return (
    <li className="mascota">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {p.foto && <img className="foto-mascota" src={p.foto} alt="Foto de quien busca trabajo" loading="lazy" />}
      <div className="mascota-datos">
        <span className="pildora neutro">{p.rubro}{p.tipo ? ` · ${p.tipo === "changa" ? "Changa" : "Fijo"}` : ""}</span>
        <b>{p.texto}</b>
        <span>{p.modo === "ofrezco" ? "Horario o días" : "Disponibilidad"}: {p.horario}</span>
        <small>{p.barrio} · Publicado el {fechaCorta(p.aprobada)}</small>
        <a className="btn whatsapp-chico" target="_blank" rel="noreferrer" href={`https://wa.me/${p.whatsapp}?text=${encodeURIComponent(texto)}`}><Icono nombre="whatsapp" tam={22} /> Escribir por WhatsApp</a>
        <Denunciar seccion="trabajo" id={p.id} />
      </div>
    </li>
  );
}

export function ListaTrabajo({ publicaciones, onPublicar }: { publicaciones: PublicacionTrabajo[]; onPublicar: (m: Modo) => void }) {
  const barrios = useBarrios();
  const [modo, setModo] = useState<Modo>("ofrezco");
  const [rubro, setRubro] = useState("");
  const [barrio, setBarrio] = useState("");
  const lista = publicaciones.filter((p) => p.modo === modo && (!rubro || p.rubro === rubro) && (!barrio || p.barrio === barrio));
  return (
    <>
      <p className="aviso-estafa" role="note">{AVISO_TRABAJO}</p>
      <div className="filtros" role="tablist" aria-label="Trabajo +50">
        {([["ofrezco", "Ofrezco trabajo"], ["busco", "Busco trabajo"]] as const).map(([id, t]) => (
          <button key={id} role="tab" className={`filtro ${modo === id ? "activo" : ""}`} aria-selected={modo === id} onClick={() => setModo(id)}>{t}</button>
        ))}
      </div>
      <button className="tarjeta-publicar" onClick={() => onPublicar(modo)}>
        {modo === "ofrezco"
          ? <><b>¿Tenés un trabajo para ofrecer?</b><span>Publicalo gratis</span></>
          : <><b>¿Buscás trabajo?</b><span>Contá qué sabés hacer</span></>}
      </button>
      <div className="filtros-doble">
        <select aria-label="Rubro" value={rubro} onChange={(e) => setRubro(e.target.value)}>
          <option value="">Rubros</option>
          {RUBROS.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select aria-label="Barrio" value={barrio} onChange={(e) => setBarrio(e.target.value)}>
          <option value="">Barrios</option>
          {barrios.map((b) => <option key={b}>{b}</option>)}
        </select>
      </div>
      {lista.length === 0 ? <p className="vacio">Todavía no hay publicaciones.</p> : <ul className="lista">{lista.map((p) => <TrabajoCard key={p.id} p={p} />)}</ul>}
    </>
  );
}

export function FormularioTrabajo({ modo, onListo }: { modo: Modo; onListo: () => void }) {
  const barrios = useBarrios();
  const max = config.trabajo.maxTexto;
  const [v, setV] = useState({ texto: "", rubro: "", barrio: "", tipo: "", horario: "", whatsapp: "" });
  const [foto, setFoto] = useState<Blob | null>(null);
  const [vista, setVista] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enlace, setEnlace] = useState("");
  const [copiado, setCopiado] = useState(false);
  const camara = useRef<HTMLInputElement>(null), galeria = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof v, x: string) => setV((a) => ({ ...a, [k]: x }));
  const ofrezco = modo === "ofrezco";

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError("");
    try {
      const b = await achicar(archivo);
      setFoto(b);
      setVista((p) => { if (p) URL.revokeObjectURL(p); return URL.createObjectURL(b); });
    } catch {
      setError("No pudimos leer esa foto. Probá con otra.");
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!v.rubro) return setError("Elegí el rubro.");
    if (!v.barrio) return setError("Elegí el barrio.");
    if (ofrezco && !v.tipo) return setError("Elegí si es una changa o un trabajo fijo.");
    const prohibido = datoProhibido(v.texto, v.horario);
    if (prohibido) return setError(prohibido);
    setEnviando(true);
    try {
      const f = new FormData();
      Object.entries(v).forEach(([k, x]) => f.append(k, x));
      f.append("modo", modo);
      if (!ofrezco && foto) f.append("foto", foto, "foto.jpg");
      f.append("dispositivo", dispositivo() || crypto.randomUUID());
      const r = await fetch("/api/trabajo", { method: "POST", body: f });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setError(d.error ?? "No se pudo enviar. Probá de nuevo.");
      setEnlace(d.enlace);
    } catch {
      setError("No se pudo enviar. Revisá tu internet.");
    } finally {
      setEnviando(false);
    }
  }

  if (enlace)
    return (
      <>
        <p className="normal">Listo, la revisamos y se publica en unas horas.</p>
        <p>Guardá este enlace: con él marcás “{ofrezco ? "Ya lo cubrí" : "Ya conseguí"}” y bajás la publicación.</p>
        <div className="enlace">
          <input readOnly value={enlace} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace propio" />
          <button className="btn claro" onClick={async () => { try { await navigator.clipboard.writeText(enlace); setCopiado(true); } catch {} }}>{copiado ? "¡Copiado!" : "Copiar"}</button>
        </div>
        <button className="btn ancho" onClick={onListo}>Volver</button>
      </>
    );

  return (
    <form onSubmit={enviar} className="form">
      <Cancelar onClick={onListo} />
      <label>{ofrezco ? "¿Qué trabajo es?" : "¿Qué sabés hacer? Contá tu experiencia"} ({v.texto.length}/{max})
        <textarea rows={3} maxLength={max} value={v.texto} onChange={(e) => set("texto", e.target.value)} />
      </label>
      <label>Rubro
        <select value={v.rubro} onChange={(e) => set("rubro", e.target.value)}>
          <option value="">Elegí uno</option>
          {RUBROS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </label>
      <label>Barrio
        <select value={v.barrio} onChange={(e) => set("barrio", e.target.value)}>
          <option value="">Elegí el barrio</option>
          {barrios.map((b) => <option key={b}>{b}</option>)}
        </select>
      </label>
      {ofrezco && (
        <label>¿Es una changa o un trabajo fijo?
          <select value={v.tipo} onChange={(e) => set("tipo", e.target.value)}>
            <option value="">Elegí una</option>
            <option value="changa">Changa</option>
            <option value="fijo">Trabajo fijo</option>
          </select>
        </label>
      )}
      <label>{ofrezco ? "Horario o días" : "Disponibilidad"}
        <input maxLength={80} placeholder={ofrezco ? "Ej. lunes a viernes de 9 a 13 hs" : "Ej. mañanas, todos los días"} value={v.horario} onChange={(e) => set("horario", e.target.value)} />
      </label>
      {!ofrezco && (
        <div>
          <b>Foto (opcional)</b>
          <button type="button" className="recuadro-foto" onClick={() => galeria.current?.click()} aria-label="Subir una foto">
            {vista ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={vista} alt="Tu foto" /> : <><Icono nombre="camara" tam={48} /><span>Tocá para elegir una foto</span></>}
          </button>
          <div className="acciones">
            <button type="button" className="btn claro" onClick={() => camara.current?.click()}><Icono nombre="camara" tam={20} /> Sacar foto</button>
            <button type="button" className="btn claro" onClick={() => galeria.current?.click()}><Icono nombre="galeria" tam={20} /> Elegir de la galería</button>
          </div>
          <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={elegir} />
          <input ref={galeria} type="file" accept="image/*" hidden onChange={elegir} />
        </div>
      )}
      <label>Tu WhatsApp (con código de área, sin 0 ni 15)
        <input type="tel" inputMode="tel" autoComplete="tel" placeholder="11 5555-5555" value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
      </label>
      <p className="aviso-publicar">
        <b className="rojo-texto">{AVISO_TRABAJO}</b><br />
        Tu WhatsApp queda a la vista de todos.
      </p>
      <button className="btn grande-btn" disabled={enviando}>{enviando ? "Publicando…" : "Publicar"}</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
