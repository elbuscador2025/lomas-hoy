"use client";
import { useEffect, useRef, useState } from "react";
import { config } from "@/lomas.config.mjs";
import { CATEGORIAS_TRUEQUE, type PublicacionTrueque, type FeriaTrueque } from "@/lib/trueque-comun";
import { Icono } from "./Iconos";
import { achicar } from "./Mascotas";
import Denunciar from "./Denunciar";
import DenunciarEstafa from "./DenunciarEstafa";
import { AvisarmeNuevos } from "./Notificaciones";
import type { Push } from "./usePush";
import { AVISO_TRUEQUE, datoProhibido } from "@/lib/estafas";

const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "long" });
const dispositivo = () => { try { return localStorage.getItem("lomas-hoy:id") ?? ""; } catch { return ""; } };

export function useBarrios() {
  const [barrios, setBarrios] = useState<string[]>([]);
  useEffect(() => { fetch("/api/barrios").then((r) => r.json()).then((l) => Array.isArray(l) && setBarrios(l)).catch(() => {}); }, []);
  return barrios;
}

export function PublicacionCard({ p }: { p: PublicacionTrueque }) {
  const texto = `Hola, te escribo por tu publicación de trueque que vi en Lomas Hoy (${p.ofrezco.slice(0, 60)}).`;
  return (
    <li className="mascota">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="foto-mascota" src={p.foto} alt={p.ofrezco} loading="lazy" />
      <div className="mascota-datos">
        <span className="pildora neutro">{p.categoria}</span>
        <b>Ofrezco: {p.ofrezco}</b>
        <span>Busco a cambio: {p.busco}</span>
        <small>{p.barrio} · Publicado el {fechaCorta(p.aprobada)}</small>
        <a className="btn whatsapp-chico" target="_blank" rel="noreferrer" href={`https://wa.me/${p.whatsapp}?text=${encodeURIComponent(texto)}`}><Icono nombre="whatsapp" tam={22} /> Escribir por WhatsApp</a>
        <Denunciar seccion="trueque" id={p.id} />
      </div>
    </li>
  );
}

export function FeriaCard({ f }: { f: FeriaTrueque }) {
  const destino = [f.direccion, f.barrio, ...(f.barrio === "Lomas de Zamora" ? [] : ["Lomas de Zamora"]), "Buenos Aires, Argentina"].join(", ");
  return (
    <li className="mascota">
      <div className="mascota-datos">
        <b>{f.lugar}</b>
        <span>{f.direccion} · {f.barrio}</span>
        <span>{f.dias} · {f.horario}</span>
        <div className="acciones">
          <a className="btn claro" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`}>Cómo llegar</a>
          {f.whatsapp && <a className="btn whatsapp-chico" target="_blank" rel="noreferrer" href={`https://wa.me/${f.whatsapp}?text=${encodeURIComponent(`Hola, te escribo por la feria de trueque "${f.lugar}" que vi en Lomas Hoy.`)}`}><Icono nombre="whatsapp" tam={22} /> Escribir por WhatsApp</a>}
        </div>
      </div>
    </li>
  );
}

export function ListaTrueque({ publicaciones, ferias, push, onPublicar, onAvisarFeria }: {
  push: Push; publicaciones: PublicacionTrueque[]; ferias: FeriaTrueque[]; onPublicar: () => void; onAvisarFeria: () => void;
}) {
  const barrios = useBarrios();
  const [pestana, setPestana] = useState<"cambio" | "ferias">("cambio");
  const [cat, setCat] = useState("");
  const [barrio, setBarrio] = useState("");
  const lista = publicaciones.filter((p) => (!cat || p.categoria === cat) && (!barrio || p.barrio === barrio));
  return (
    <>
      <p className="aviso-estafa" role="note">{AVISO_TRUEQUE}</p>
      <DenunciarEstafa seccion="trueque" publicaciones={publicaciones.map((p) => p.ofrezco)} />
      <p className="aviso-publicar">Encontrate en un lugar público y de día.</p>
      <div className="filtros" role="tablist" aria-label="Trueque">
        {([["cambio", "Publicaciones"], ["ferias", "Ferias"]] as const).map(([id, t]) => (
          <button key={id} role="tab" className={`filtro ${pestana === id ? "activo" : ""}`} aria-selected={pestana === id} onClick={() => setPestana(id)}>{t}</button>
        ))}
      </div>
      <AvisarmeNuevos push={push} tipo="trueque" />
      {pestana === "cambio" ? (
        <>
          <button className="tarjeta-publicar" onClick={onPublicar}><b>¿Tenés algo para cambiar?</b><span>Tocá acá y publicalo gratis</span></button>
          <div className="filtros-doble">
            <select aria-label="Categoría" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Categorías</option>
              {CATEGORIAS_TRUEQUE.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select aria-label="Barrio" value={barrio} onChange={(e) => setBarrio(e.target.value)}>
              <option value="">Barrios</option>
              {barrios.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          {lista.length === 0 ? <p className="vacio">Todavía no hay trueques. ¡Publicá el primero!</p> : <ul className="lista">{lista.map((p) => <PublicacionCard key={p.id} p={p} />)}</ul>}
        </>
      ) : (
        <>
          <button className="tarjeta-publicar" onClick={onAvisarFeria}><b>¿Conocés una feria de trueque?</b><span>Avisanos</span></button>
          {ferias.length === 0 ? <p className="vacio">Todavía no hay ferias cargadas.</p> : <ul className="lista">{ferias.map((f) => <FeriaCard key={f.id} f={f} />)}</ul>}
        </>
      )}
    </>
  );
}

export function Cancelar({ onClick }: { onClick: () => void }) {
  return <button type="button" className="cancelar-form" onClick={onClick}><Icono nombre="cerrar" tam={20} ancho={2.8} /> Cancelar</button>;
}

export function FormularioTrueque({ onListo }: { onListo: () => void }) {
  const barrios = useBarrios();
  const max = config.trueque.maxTexto;
  const [v, setV] = useState({ ofrezco: "", busco: "", categoria: "", barrio: "", whatsapp: "" });
  const [foto, setFoto] = useState<Blob | null>(null);
  const [vista, setVista] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enlace, setEnlace] = useState("");
  const [copiado, setCopiado] = useState(false);
  const camara = useRef<HTMLInputElement>(null), galeria = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof v, x: string) => setV((a) => ({ ...a, [k]: x }));

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
    if (!foto) return setError("Falta la foto.");
    if (!v.categoria) return setError("Elegí la categoría.");
    if (!v.barrio) return setError("Elegí el barrio.");
    const prohibido = datoProhibido(v.ofrezco, v.busco);
    if (prohibido) return setError(prohibido);
    setEnviando(true);
    try {
      const f = new FormData();
      Object.entries(v).forEach(([k, x]) => f.append(k, x));
      f.append("foto", foto, "foto.jpg");
      f.append("dispositivo", dispositivo() || crypto.randomUUID());
      const r = await fetch("/api/trueque", { method: "POST", body: f });
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
        <p>Guardá este enlace: con él marcás “Ya lo cambié” y bajás la publicación.</p>
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
      <div>
        <b>Subí una foto</b>
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
      <label>Ofrezco ({v.ofrezco.length}/{max})
        <textarea rows={2} maxLength={max} value={v.ofrezco} onChange={(e) => set("ofrezco", e.target.value)} />
      </label>
      <label>Busco a cambio ({v.busco.length}/{max})
        <textarea rows={2} maxLength={max} value={v.busco} onChange={(e) => set("busco", e.target.value)} />
      </label>
      <label>Categoría
        <select value={v.categoria} onChange={(e) => set("categoria", e.target.value)}>
          <option value="">Elegí una</option>
          {CATEGORIAS_TRUEQUE.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label>Barrio
        <select value={v.barrio} onChange={(e) => set("barrio", e.target.value)}>
          <option value="">Elegí tu barrio</option>
          {barrios.map((b) => <option key={b}>{b}</option>)}
        </select>
      </label>
      <label>Tu WhatsApp (con código de área, sin 0 ni 15)
        <input type="tel" inputMode="tel" autoComplete="tel" placeholder="11 5555-5555" value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
      </label>
      <p className="aviso-publicar">
        <b className="rojo-texto">{AVISO_TRUEQUE}</b><br />
        Tu WhatsApp queda a la vista de todos.<br />
        Es trueque: no se permite vender ni poner precio.<br />
        No se permiten medicamentos, comida casera, animales ni armas.
      </p>
      <button className="btn grande-btn" disabled={enviando}>{enviando ? "Publicando…" : "Publicar"}</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

export function FormularioFeria({ onListo }: { onListo: () => void }) {
  const barrios = useBarrios();
  const [v, setV] = useState({ lugar: "", direccion: "", barrio: "", dias: "", horario: "", whatsapp: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const set = (k: keyof typeof v, x: string) => setV((a) => ({ ...a, [k]: x }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!v.barrio) return setError("Elegí el barrio.");
    setEnviando(true);
    try {
      const r = await fetch("/api/trueque/feria", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, dispositivo: dispositivo() || crypto.randomUUID() }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setError(d.error ?? "No se pudo enviar. Probá de nuevo.");
      setListo(true);
    } catch {
      setError("No se pudo enviar. Revisá tu internet.");
    } finally {
      setEnviando(false);
    }
  }

  if (listo)
    return (
      <>
        <p className="normal">Listo, la revisamos y se publica en unas horas.</p>
        <button className="btn ancho" onClick={onListo}>Volver</button>
      </>
    );

  return (
    <form onSubmit={enviar} className="form">
      <Cancelar onClick={onListo} />
      <label>Lugar o nombre de la feria<input maxLength={80} value={v.lugar} onChange={(e) => set("lugar", e.target.value)} /></label>
      <label>Dirección<input maxLength={100} value={v.direccion} onChange={(e) => set("direccion", e.target.value)} /></label>
      <label>Barrio
        <select value={v.barrio} onChange={(e) => set("barrio", e.target.value)}>
          <option value="">Elegí el barrio</option>
          {barrios.map((b) => <option key={b}>{b}</option>)}
        </select>
      </label>
      <label>Días<input maxLength={60} placeholder="Ej. sábados y domingos" value={v.dias} onChange={(e) => set("dias", e.target.value)} /></label>
      <label>Horario<input maxLength={40} placeholder="Ej. de 10 a 17 hs" value={v.horario} onChange={(e) => set("horario", e.target.value)} /></label>
      <label>WhatsApp de contacto (opcional)
        <input type="tel" inputMode="tel" placeholder="11 5555-5555" value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
      </label>
      <button className="btn grande-btn" disabled={enviando}>{enviando ? "Publicando…" : "Publicar"}</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
