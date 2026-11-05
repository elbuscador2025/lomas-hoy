"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icono } from "./Iconos";
import Denunciar from "./Denunciar";
import { Cancelar } from "./Trueque";
import { haceCuanto } from "@/lib/hace";
import {
  AVISO_VENTAS, AVISO_TELEFONO, MAX_FOTOS, MAX_TITULO, MAX_DESCRIPCION, MAX_COMENTARIO, MAX_BYTES_FOTO, LADO_FOTO, hayProhibida, MENSAJE_PROHIBIDO,
  type EmprendimientoPublico, type EmprendimientoDetalle,
} from "@/lib/emprendedores-comun";

// EMPRENDEDORES: los vecinos muestran lo que ofrecen. Cada publicación tiene su propia conversación (nada de chat general).
// El dueño se reconoce por un código secreto que se guarda en este celular (y en su enlace propio): solo con él se edita, se renueva, se borra y se responde como "Emprendedor".
const CLAVE_MIOS = "lomas-hoy:emp-mios";
const dispositivo = () => { try { return localStorage.getItem("lomas-hoy:id") ?? ""; } catch { return ""; } };
const codigos = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(CLAVE_MIOS) ?? "{}") ?? {}; } catch { return {}; } };
export const guardarCodigoEmprendimiento = (id: string, token: string) => { try { localStorage.setItem(CLAVE_MIOS, JSON.stringify({ ...codigos(), [id]: token })); } catch {} };
const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "long" });

// Si el celular tiene los avisos activados, se manda para poder avisarle al emprendedor cuando le preguntan
async function avisoDelCelular(): Promise<string> {
  try {
    if (!("serviceWorker" in navigator && "PushManager" in window) || Notification.permission !== "granted") return "";
    return (await (await navigator.serviceWorker.ready).pushManager.getSubscription())?.endpoint ?? "";
  } catch { return ""; }
}

// Foto del celular → JPG de hasta 1000 px y 250 KB (así no se gasta el espacio gratis)
async function achicarFoto(archivo: File): Promise<Blob> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error("foto")); i.src = url; });
    const escala = Math.min(1, LADO_FOTO / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * escala); c.height = Math.round(img.naturalHeight * escala);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    for (const calidad of [0.72, 0.6, 0.5, 0.4, 0.3, 0.22]) {
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", calidad));
      if (blob && blob.size <= MAX_BYTES_FOTO) return blob;
    }
    throw new Error("foto");
  } finally { URL.revokeObjectURL(url); }
}

function AvisoVentas() {
  return <p className="emp-aviso">⚠️ {AVISO_VENTAS}</p>;
}

// ---- La lista ----
function Lista({ abrir }: { abrir: (v: string) => void }) {
  const [lista, setLista] = useState<EmprendimientoPublico[] | null>(null);
  const [mios, setMios] = useState<Record<string, string>>({});
  useEffect(() => {
    setMios(codigos());
    fetch(`/api/emprendedores?t=${Date.now()}`).then((r) => (r.ok ? r.json() : [])).then((j) => setLista(Array.isArray(j) ? j : [])).catch(() => setLista([]));
  }, []);
  return (
    <>
      <p className="vacio emp-sub">Publicá acá lo que tenés para emprender o lo que emprendés.</p>
      <AvisoVentas />
      <button className="btn grande-btn" onClick={() => abrir("emprendedores-publicar")}>➕ Publicar mi emprendimiento</button>
      {lista === null && <p className="vacio">Cargando…</p>}
      {lista?.length === 0 && <p className="vacio">Todavía no hay emprendimientos. ¡Sé el primero en publicar!</p>}
      <ul className="lista">
        {lista?.map((e) => (
          <li key={e.id} className="mascota">
            <button className="emp-card" onClick={() => abrir(`emprendedores-ver:${e.id}`)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {e.fotos[0] && <img className="foto-mascota" src={e.fotos[0]} alt={e.titulo} loading="lazy" />}
              <b>{e.titulo}</b>
              <span className="emp-resumen">{e.descripcion}</span>
              <small>{mios[e.id] ? "⭐ Tuyo · " : ""}💬 {e.comentarios === 1 ? "1 consulta" : `${e.comentarios} consultas`} · {haceCuanto(e.creado)}</small>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

// ---- Una publicación con su conversación ----
function Ver({ id, abrir, volver }: { id: string; abrir: (v: string) => void; volver: () => void }) {
  const [e, setE] = useState<EmprendimientoDetalle | null | undefined>(undefined);
  const [token, setToken] = useState("");
  const [foto, setFoto] = useState(0);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const cargar = useCallback(() => {
    fetch(`/api/emprendedores/${id}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setE).catch(() => setE(null));
  }, [id]);
  useEffect(() => { setToken(codigos()[id] ?? ""); cargar(); }, [id, cargar]);

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    if (texto.trim().length < 2) return setError("Escribí tu mensaje.");
    setEnviando(true);
    try {
      const r = await fetch(`/api/emprendedores/${id}/comentarios`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: texto.trim(), dispositivo: dispositivo() || crypto.randomUUID(), token }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setError(d.error ?? "No se pudo enviar. Probá de nuevo.");
      setTexto(""); cargar();
    } catch { setError("No se pudo enviar. Revisá tu internet."); }
    finally { setEnviando(false); }
  }
  async function accion(a: "renovar" | "borrar") {
    setMsg("");
    const r = await fetch(`/api/emprendedores/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: a, token, aviso: await avisoDelCelular() }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!d?.ok) return setMsg("No se pudo. Probá de nuevo.");
    if (a === "borrar") return volver();
    setMsg(`Listo, tu publicación sigue hasta el ${fechaCorta(d.vence)}.`); cargar();
  }

  if (e === undefined) return <p className="vacio">Cargando…</p>;
  if (e === null) return <p className="vacio">Esta publicación ya no está.</p>;
  const dueno = !!token;
  return (
    <>
      <AvisoVentas />
      {e.fotos.length > 0 && (
        <div className="emp-galeria">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="foto-mascota" src={e.fotos[Math.min(foto, e.fotos.length - 1)]} alt={e.titulo} />
          {e.fotos.length > 1 && (
            <div className="emp-miniaturas">
              {e.fotos.map((f, i) => (
                <button key={f} className={i === foto ? "activa" : ""} aria-label={`Foto ${i + 1}`} onClick={() => setFoto(i)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <h2 className="emp-titulo">{e.titulo}</h2>
      <p className="emp-texto">{e.descripcion}</p>
      <div className="acciones">
        {e.whatsapp && <a className="btn whatsapp-chico" target="_blank" rel="noreferrer" href={`https://wa.me/${e.whatsapp}?text=${encodeURIComponent(`Hola, te escribo por tu emprendimiento "${e.titulo}" que vi en Lomas Hoy.`)}`}><Icono nombre="whatsapp" tam={22} /> WhatsApp</a>}
        {e.telefono && <a className="btn claro" href={`tel:${e.telefono.replace(/[^\d+]/g, "")}`}>📞 Llamar {e.telefono}</a>}
      </div>
      <small className="vacio" style={{ display: "block" }}>Publicado {haceCuanto(e.creado)}.</small>
      <Denunciar seccion="emprendedores" id={e.id} />

      {dueno && (
        <section className="emp-dueno" aria-label="Tu publicación">
          <b>⭐ Esta publicación es tuya</b>
          <small>Vence el {fechaCorta(e.vence)}.</small>
          <div className="acciones">
            <button className="btn" onClick={() => abrir(`emprendedores-editar:${id}`)}>✏️ Editar</button>
            <button className="btn claro" onClick={() => accion("renovar")}>🔄 Renovar</button>
            <button className="btn claro" onClick={() => { if (confirm("¿Borrar tu publicación y sus fotos?")) accion("borrar"); }}>🗑️ Borrar</button>
          </div>
          {msg && <p className="normal" role="status">{msg}</p>}
        </section>
      )}

      <h2>Consultas ({e.conversacion.length})</h2>
      {e.conversacion.length === 0 && <p className="vacio">Todavía nadie preguntó. {dueno ? "" : "¡Hacé la primera consulta!"}</p>}
      <ul className="lista emp-conv">
        {e.conversacion.map((c) => (
          <li key={c.id} className={c.duenio ? "emp-resp" : undefined}>
            {c.duenio && <span className="pildora ok">Emprendedor</span>}
            <span className="emp-texto">{c.texto}</span>
            <small>{haceCuanto(c.creado)}</small>
            <Denunciar seccion="emprendedores" id={e.id} cid={c.id} />
          </li>
        ))}
      </ul>
      <form onSubmit={enviar} className="form">
        <label>{dueno ? "Responder como Emprendedor" : "Hacé tu consulta"}
          <textarea rows={3} maxLength={MAX_COMENTARIO} value={texto} onChange={(x) => setTexto(x.target.value)} placeholder={dueno ? "Tu respuesta" : "¿Qué querés saber?"} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn ancho" disabled={enviando}>{enviando ? "Enviando…" : dueno ? "Responder" : "Preguntar"}</button>
      </form>
    </>
  );
}

// ---- Publicar ----
type FotoElegida = { blob: Blob; vista: string };
function Publicar({ abrir, volver }: { abrir: (v: string) => void; volver: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fotos, setFotos] = useState<FotoElegida[]>([]);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<{ id: string; enlace: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const camara = useRef<HTMLInputElement>(null), galeria = useRef<HTMLInputElement>(null);

  async function elegir(ev: React.ChangeEvent<HTMLInputElement>) {
    const archivos = [...(ev.target.files ?? [])];
    ev.target.value = "";
    setError("");
    for (const a of archivos) {
      if (fotos.length >= MAX_FOTOS) break;
      try {
        const blob = await achicarFoto(a);
        setFotos((f) => (f.length >= MAX_FOTOS ? f : [...f, { blob, vista: URL.createObjectURL(blob) }]));
      } catch { setError("No pudimos leer una de las fotos. Probá con otra."); }
    }
  }
  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    if (titulo.trim().length < 3) return setError("Escribí el nombre de tu emprendimiento.");
    if (descripcion.trim().length < 10) return setError("Contá un poco qué ofrecés.");
    if (hayProhibida(titulo, descripcion)) return setError(MENSAJE_PROHIBIDO);
    setEnviando(true);
    try {
      const f = new FormData();
      f.append("titulo", titulo.trim()); f.append("descripcion", descripcion.trim()); f.append("telefono", telefono.trim());
      fotos.forEach((x, i) => f.append("foto", x.blob, `foto${i}.jpg`));
      f.append("dispositivo", dispositivo() || crypto.randomUUID());
      const aviso = await avisoDelCelular();
      if (aviso) f.append("aviso", aviso);
      const r = await fetch("/api/emprendedores", { method: "POST", body: f });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setError(d.error ?? "No se pudo publicar. Probá de nuevo.");
      guardarCodigoEmprendimiento(d.id, d.token);
      setListo({ id: d.id, enlace: d.enlace });
    } catch { setError("No se pudo publicar. Revisá tu internet."); }
    finally { setEnviando(false); }
  }

  if (listo)
    return (
      <>
        <p className="normal">¡Listo! Tu emprendimiento ya se ve en Lomas Hoy durante 30 días.</p>
        <section className="emp-dueno">
          <b>Guardá tu enlace propio</b>
          <small>Si cambiás de celular o borrás los datos del navegador, con este enlace recuperás tu publicación para editarla y responder.</small>
          <input readOnly value={listo.enlace} onFocus={(x) => x.currentTarget.select()} aria-label="Enlace propio" />
          <button className="btn claro" onClick={async () => { try { await navigator.clipboard.writeText(listo.enlace); setCopiado(true); } catch {} }}>{copiado ? "¡Enlace copiado!" : "Copiar enlace"}</button>
        </section>
        <button className="btn ancho" onClick={() => { volver(); setTimeout(() => abrir(`emprendedores-ver:${listo.id}`), 250); }}>Ver mi publicación</button>
      </>
    );
  return (
    <form onSubmit={enviar} className="form">
      <Cancelar onClick={volver} />
      <AvisoVentas />
      <label>Nombre de tu emprendimiento
        <input value={titulo} maxLength={MAX_TITULO} required placeholder="ej: Tortas de Marta" onChange={(x) => setTitulo(x.target.value)} />
      </label>
      <label>Qué ofrecés ({descripcion.length}/{MAX_DESCRIPCION})
        <textarea rows={5} maxLength={MAX_DESCRIPCION} required value={descripcion} onChange={(x) => setDescripcion(x.target.value)} placeholder="Contá qué hacés o vendés, en qué zona, horarios…" />
      </label>
      <div>
        <b>Fotos (hasta {MAX_FOTOS}, opcional)</b>
        <div className="emp-fotos">
          {fotos.map((x, i) => (
            <span key={x.vista} className="emp-foto-elegida">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.vista} alt={`Foto ${i + 1}`} />
              <button type="button" aria-label={`Sacar la foto ${i + 1}`} onClick={() => setFotos((f) => f.filter((_, j) => j !== i))}>✕</button>
            </span>
          ))}
        </div>
        {fotos.length < MAX_FOTOS && (
          <div className="acciones">
            <button type="button" className="btn claro" onClick={() => camara.current?.click()}><Icono nombre="camara" tam={20} /> Sacar foto</button>
            <button type="button" className="btn claro" onClick={() => galeria.current?.click()}><Icono nombre="galeria" tam={20} /> Elegir de la galería</button>
          </div>
        )}
        <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={elegir} />
        <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={elegir} />
        <small className="chico">Sin fotos de personas ni de patentes.</small>
      </div>
      <label>Teléfono o WhatsApp (opcional)
        <input type="tel" inputMode="tel" value={telefono} maxLength={30} placeholder="ej: 11 5555-5555" onChange={(x) => setTelefono(x.target.value)} />
      </label>
      <p className="emp-aviso-tel">📢 {AVISO_TELEFONO}</p>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn ancho" disabled={enviando}>{enviando ? "Publicando…" : "Publicar"}</button>
    </form>
  );
}

// ---- Editar (solo el dueño) ----
function Editar({ id, volver }: { id: string; volver: () => void }) {
  const [e, setE] = useState<EmprendimientoDetalle | null | undefined>(undefined);
  const [v, setV] = useState({ titulo: "", descripcion: "", telefono: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    fetch(`/api/emprendedores/${id}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d: EmprendimientoDetalle | null) => {
      setE(d); if (d) setV({ titulo: d.titulo, descripcion: d.descripcion, telefono: d.telefono });
    }).catch(() => setE(null));
  }, [id]);
  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    if (hayProhibida(v.titulo, v.descripcion)) return setError(MENSAJE_PROHIBIDO);
    setEnviando(true);
    try {
      const r = await fetch(`/api/emprendedores/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "editar", token: codigos()[id] ?? "", ...v, aviso: await avisoDelCelular() }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setError(d.error ?? "No se pudo guardar.");
      volver();
    } catch { setError("No se pudo guardar. Revisá tu internet."); }
    finally { setEnviando(false); }
  }
  if (e === undefined) return <p className="vacio">Cargando…</p>;
  if (e === null) return <p className="vacio">Esta publicación ya no está.</p>;
  return (
    <form onSubmit={enviar} className="form">
      <Cancelar onClick={volver} />
      <label>Nombre de tu emprendimiento
        <input value={v.titulo} maxLength={MAX_TITULO} required onChange={(x) => setV({ ...v, titulo: x.target.value })} />
      </label>
      <label>Qué ofrecés ({v.descripcion.length}/{MAX_DESCRIPCION})
        <textarea rows={5} maxLength={MAX_DESCRIPCION} required value={v.descripcion} onChange={(x) => setV({ ...v, descripcion: x.target.value })} />
      </label>
      <label>Teléfono o WhatsApp (opcional)
        <input type="tel" inputMode="tel" value={v.telefono} maxLength={30} onChange={(x) => setV({ ...v, telefono: x.target.value })} />
      </label>
      <p className="emp-aviso-tel">📢 {AVISO_TELEFONO}</p>
      <small className="chico">Para cambiar las fotos, borrá la publicación y volvé a publicarla.</small>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn ancho" disabled={enviando}>{enviando ? "Guardando…" : "Guardar cambios"}</button>
    </form>
  );
}

export default function Emprendedores({ vista, abrir, volver }: { vista: string; abrir: (v: string) => void; volver: () => void }) {
  if (vista === "emprendedores-publicar") return <Publicar abrir={abrir} volver={volver} />;
  if (vista.startsWith("emprendedores-ver:")) return <Ver id={vista.slice(18)} abrir={abrir} volver={volver} />;
  if (vista.startsWith("emprendedores-editar:")) return <Editar id={vista.slice(21)} volver={volver} />;
  return <Lista abrir={abrir} />;
}
