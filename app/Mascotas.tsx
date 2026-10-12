"use client";
import { useEffect, useRef, useState } from "react";
import { config } from "@/lomas.config.mjs";
import { ESPECIES, type MascotaPublica } from "@/lib/mascotas-comun";
import { Icono } from "./Iconos";

const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "long" });
const tituloEspecie = (id: string) => ESPECIES.find((e) => e.id === id)?.titulo ?? id;

export function MascotaCard({ m }: { m: MascotaPublica }) {
  const perdido = m.estado === "perdido";
  const texto = `Hola, te escribo por la publicación de la mascota ${perdido ? "perdida" : "encontrada"} que vi en Lomas Hoy (${tituloEspecie(m.especie).toLowerCase()}, ${m.barrio}).`;
  return (
    <li className="mascota">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="foto-mascota" src={m.foto} alt={`${tituloEspecie(m.especie)} ${perdido ? "perdido" : "encontrado"} en ${m.barrio}`} loading="lazy" />
      <div className="mascota-datos">
        <span className={`pildora ${perdido ? "grave" : "ok"}`}>{perdido ? "Perdido" : "Encontrado"}</span>
        <b>{tituloEspecie(m.especie)} · {m.barrio}</b>
        <span>{m.descripcion}</span>
        <small>Publicado el {fechaCorta(m.aprobada)}</small>
        <a className="btn whatsapp-chico" target="_blank" rel="noreferrer" href={`https://wa.me/${m.whatsapp}?text=${encodeURIComponent(texto)}`}>Escribir por WhatsApp</a>
      </div>
    </li>
  );
}

export function ListaMascotas({ mascotas, onPublicar }: { mascotas: MascotaPublica[]; onPublicar: () => void }) {
  const [filtro, setFiltro] = useState<"todos" | "perdido" | "encontrado">("todos");
  const lista = mascotas.filter((m) => filtro === "todos" || m.estado === filtro);
  return (
    <>
      <button className="btn ancho grande-btn" onClick={onPublicar}>Publicar</button>
      <div className="filtros" role="group" aria-label="Filtrar">
        {([["todos", "Todos"], ["perdido", "Perdidos"], ["encontrado", "Encontrados"]] as const).map(([id, t]) => (
          <button key={id} className={`filtro ${filtro === id ? "activo" : ""}`} aria-pressed={filtro === id} onClick={() => setFiltro(id)}>{t}</button>
        ))}
      </div>
      {lista.length === 0 ? <p className="vacio">Todavía no hay publicaciones.</p> : <ul className="lista">{lista.map((m) => <MascotaCard key={m.id} m={m} />)}</ul>}
    </>
  );
}

// Achica la foto en el celular antes de subirla: lado mayor 1280 px y liviana (JPG)
async function achicar(archivo: File): Promise<Blob> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error("foto")); i.src = url; });
    const escala = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * escala); c.height = Math.round(img.naturalHeight * escala);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    let blob: Blob | null = null;
    for (const calidad of [0.75, 0.6, 0.5, 0.4]) {
      blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", calidad));
      if (blob && blob.size <= 500_000) break;
    }
    if (!blob) throw new Error("foto");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function FormularioMascota({ onListo }: { onListo: () => void }) {
  const [barrios, setBarrios] = useState<string[]>([]);
  const [v, setV] = useState({ estado: "perdido", especie: "perro", barrio: "", descripcion: "", whatsapp: "" });
  const [foto, setFoto] = useState<Blob | null>(null);
  const [vista, setVista] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enlace, setEnlace] = useState("");
  const [copiado, setCopiado] = useState(false);
  const camara = useRef<HTMLInputElement>(null), galeria = useRef<HTMLInputElement>(null);

  useEffect(() => { fetch("/api/barrios").then((r) => r.json()).then((l) => Array.isArray(l) && setBarrios(l)).catch(() => {}); }, []);
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
    if (!v.barrio) return setError("Elegí el barrio.");
    setEnviando(true);
    try {
      const f = new FormData();
      Object.entries(v).forEach(([k, x]) => f.append(k, x));
      f.append("foto", foto, "foto.jpg");
      let id = "";
      try { id = localStorage.getItem("lomas-hoy:id") ?? ""; } catch {}
      f.append("dispositivo", id || crypto.randomUUID());
      const r = await fetch("/api/mascotas", { method: "POST", body: f });
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
        <p>Guardá este enlace: con él marcás “Ya apareció” y bajás la publicación.</p>
        <div className="enlace">
          <input readOnly value={enlace} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace propio" />
          <button className="btn claro" onClick={async () => { try { await navigator.clipboard.writeText(enlace); setCopiado(true); } catch {} }}>{copiado ? "¡Copiado!" : "Copiar"}</button>
        </div>
        <button className="btn ancho" onClick={onListo}>Volver</button>
      </>
    );

  return (
    <form onSubmit={enviar} className="form">
      <p className="aviso-publicar">Tu WhatsApp queda a la vista de todos.<br />No se permiten ventas ni pedidos de dinero.</p>
      <div className="filtros" role="group" aria-label="¿Perdiste o encontraste?">
        {([["perdido", "Perdí"], ["encontrado", "Encontré"]] as const).map(([id, t]) => (
          <button type="button" key={id} className={`filtro ${v.estado === id ? "activo" : ""}`} aria-pressed={v.estado === id} onClick={() => set("estado", id)}>{t}</button>
        ))}
      </div>
      <div>
        <b>Foto</b>
        {vista && /* eslint-disable-next-line @next/next/no-img-element */ <img className="foto-mascota" src={vista} alt="Tu foto" />}
        <div className="acciones">
          <button type="button" className="btn claro" onClick={() => camara.current?.click()}><Icono nombre="camara" tam={20} /> Sacar foto</button>
          <button type="button" className="btn claro" onClick={() => galeria.current?.click()}><Icono nombre="galeria" tam={20} /> Elegir de la galería</button>
        </div>
        <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={elegir} />
        <input ref={galeria} type="file" accept="image/*" hidden onChange={elegir} />
      </div>
      <label>Es un
        <select value={v.especie} onChange={(e) => set("especie", e.target.value)}>
          {ESPECIES.map((x) => <option key={x.id} value={x.id}>{x.titulo}</option>)}
        </select>
      </label>
      <label>Barrio
        <select value={v.barrio} onChange={(e) => set("barrio", e.target.value)}>
          <option value="">Elegí tu barrio</option>
          {barrios.map((b) => <option key={b}>{b}</option>)}
        </select>
      </label>
      <label>Descripción ({v.descripcion.length}/{config.mascotas.maxDescripcion})
        <textarea rows={4} maxLength={config.mascotas.maxDescripcion} value={v.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
      </label>
      <label>Tu WhatsApp (con código de área, sin 0 ni 15)
        <input type="tel" inputMode="tel" autoComplete="tel" placeholder="11 5555-5555" value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
      </label>
      <button className="btn grande-btn" disabled={enviando}>{enviando ? "Enviando…" : "Enviar"}</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
