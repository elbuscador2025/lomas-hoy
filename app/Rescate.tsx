"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icono } from "./Iconos";
import Hilo from "./Hilo";
import Denunciar from "./Denunciar";
import BotonLlamar from "./BotonLlamar";
import Pie from "./Pie";
import { Cancelar } from "./Trueque";
import { haceCuanto } from "@/lib/hace";
import {
  MAX_FOTOS_RESCATE, MAX_DESCRIPCION_RESCATE, MAX_ZONA_RESCATE, MAX_COMENTARIO_RESCATE, MAX_BYTES_FOTO_RESCATE, LADO_FOTO_RESCATE, REGLAS_RESCATE,
  motivoRescateInvalido, type RescatePublico, type RescateDetalle,
} from "@/lib/rescate-comun";

const CLAVE_MIOS = "lomas-hoy:rescate-mios";
const dispositivo = () => { try { return localStorage.getItem("lomas-hoy:id") ?? ""; } catch { return ""; } };
const codigos = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(CLAVE_MIOS) ?? "{}") ?? {}; } catch { return {}; } };
const guardarCodigo = (id: string, token: string) => { try { localStorage.setItem(CLAVE_MIOS, JSON.stringify({ ...codigos(), [id]: token })); } catch {} };
const ext = (url: string) => ({ href: url, target: "_blank", rel: "noreferrer" });
const URL_RESC = {
  denuncia: "https://www.mpba.gov.ar/denuncia", mapa: "https://www.mpba.gov.ar/mapa", turnos: "https://www.mpba.gov.ar/turnos", guia: "https://www.mpba.gov.ar/guia_denunciante",
  hospital: "https://lomasdezamora.gov.ar/hospital-animales", instagram: "https://www.instagram.com/hospitaldeanimaleslomas",
};

// Foto del celular → JPG de hasta 1000 px y 250 KB (así no se gasta el espacio gratis)
async function achicarFoto(archivo: File): Promise<Blob> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error("foto")); i.src = url; });
    const escala = Math.min(1, LADO_FOTO_RESCATE / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * escala); c.height = Math.round(img.naturalHeight * escala);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    for (const calidad of [0.72, 0.6, 0.5, 0.4, 0.3, 0.22]) {
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", calidad));
      if (blob && blob.size <= MAX_BYTES_FOTO_RESCATE) return blob;
    }
    throw new Error("foto");
  } finally { URL.revokeObjectURL(url); }
}

// ---- A. Cómo denunciar el maltrato animal (solo información: las denuncias NO se publican en la app) ----
function ComoDenunciar({ abrir }: { abrir: (v: string) => void }) {
  return (
    <section className="lugar-principal resc-denuncia" aria-label="Cómo denunciar el maltrato animal">
      <h2>⚖️ Cómo denunciar el maltrato animal</h2>
      <p><b>Maltratar o ser cruel con un animal es un delito.</b> Lo prohíbe la Ley 14.346 de protección de los animales. Podés denunciarlo gratis. Seguí estos pasos:</p>
      <ol className="resc-pasos">
        <li><b>Si está pasando ahora</b> o el animal corre peligro, llamá al 911.<BotonLlamar nombre="la Policía" numero="911" /></li>
        <li><b>Juntá pruebas</b> sin ponerte en riesgo: fotos, videos, testigos y, si se puede, un informe de un veterinario.</li>
        <li><b>Hacé la denuncia</b> en la comisaría o en la fiscalía. Las oficinas de denuncias de la Provincia atienden de 8 a 14 hs y siempre hay una fiscalía de turno. Es gratis, llevás tu DNI y no hace falta abogado.
          <a className="btn grande-btn" {...ext(URL_RESC.denuncia)}>Cómo hacer la denuncia ↗</a>
          <a className="btn claro" {...ext(URL_RESC.mapa)}>Fiscalías y oficinas de denuncia (mapa) ↗</a>
          <a className="btn claro" {...ext(URL_RESC.turnos)}>Fiscalía de turno ↗</a>
          <button className="btn claro" onClick={() => abrir("otros")}>Ver comisarías de Lomas</button>
        </li>
        <li><b>Pedí orientación en el Municipio:</b> el Hospital de animales (12 de Octubre 1100, Lomas de Zamora) orienta y acompaña a los vecinos que ven maltrato animal, y puede hacer informes veterinarios que sirven como prueba.
          <a className="btn claro" {...ext(URL_RESC.hospital)}>Hospital de animales (Municipio) ↗</a>
          <a className="btn claro" {...ext(URL_RESC.instagram)}>Instagram del Hospital de animales ↗</a>
        </li>
      </ol>
      <p className="resc-solo-info">📌 Esta parte es solo información: las denuncias <b>no se publican</b> en la app.</p>
      <small className="chico">Fuentes: Municipio de Lomas de Zamora (Hospital de animales) y Ministerio Público de la Provincia de Buenos Aires. <a {...ext(URL_RESC.guia)}>Guía del denunciante</a>.</small>
    </section>
  );
}

// ---- B. La lista de animales que necesitan ayuda ----
function Lista({ abrir }: { abrir: (v: string) => void }) {
  const [lista, setLista] = useState<RescatePublico[] | null>(null);
  const [mios, setMios] = useState<Record<string, string>>({});
  useEffect(() => {
    setMios(codigos());
    fetch(`/api/rescate?t=${Date.now()}`).then((r) => (r.ok ? r.json() : [])).then((j) => setLista(Array.isArray(j) ? j : [])).catch(() => setLista([]));
  }, []);
  return (
    <>
      <h2 className="resc-titulo">🆘 Animales que necesitan ayuda</h2>
      <p className="vacio">¿Viste un perro o un gato herido, abandonado o en peligro en la calle? Publicalo para que otros vecinos y rescatistas puedan ayudar.</p>
      <p className="emp-aviso">⚠️ {REGLAS_RESCATE}</p>
      <button className="btn grande-btn" onClick={() => abrir("rescate-publicar")}>🐾 Publicar un animal que necesita ayuda</button>
      {lista === null && <p className="vacio">Cargando…</p>}
      {lista?.length === 0 && <p className="vacio">Por ahora no hay animales publicados.</p>}
      <ul className="lista">
        {lista?.map((e) => (
          <li key={e.id} className="mascota">
            <button className="emp-card" onClick={() => abrir(`rescate-ver:${e.id}`)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {e.fotos[0] && <img className="foto-mascota" src={e.fotos[0]} alt={`Animal en ${e.zona}`} loading="lazy" />}
              {e.rescatado && <span className="pildora ok">✅ Ya fue rescatado</span>}
              <b>📍 {e.zona}</b>
              <span className="emp-resumen">{e.descripcion}</span>
              <small>{mios[e.id] ? "⭐ Tuyo · " : ""}💬 {e.comentarios === 1 ? "1 mensaje" : `${e.comentarios} mensajes`} · {haceCuanto(e.creado)}</small>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

// ---- Una publicación con su conversación ----
function Ver({ id, volver }: { id: string; volver: () => void }) {
  const [e, setE] = useState<RescateDetalle | null | undefined>(undefined);
  const [token, setToken] = useState("");
  const [foto, setFoto] = useState(0);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const cargar = useCallback(() => {
    fetch(`/api/rescate/${id}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setE).catch(() => setE(null));
  }, [id]);
  useEffect(() => { setToken(codigos()[id] ?? ""); cargar(); }, [id, cargar]);

  const post = (cuerpo: object) => fetch(`/api/rescate/${id}/comentarios`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dispositivo: dispositivo() || crypto.randomUUID(), token, ...cuerpo }) });
  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    if (texto.trim().length < 2) return setError("Escribí tu mensaje.");
    const prohibido = motivoRescateInvalido(texto);
    if (prohibido) return setError(prohibido);
    setEnviando(true);
    try {
      const r = await post({ texto: texto.trim() });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setError(d.error ?? "No se pudo enviar. Probá de nuevo.");
      setTexto(""); cargar();
    } catch { setError("No se pudo enviar. Revisá tu internet."); }
    finally { setEnviando(false); }
  }
  // Contestarle a un mensaje (consulta o respuesta): queda en el hilo del mensaje original
  async function responder(t: string, destino: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const prohibido = motivoRescateInvalido(t);
    if (prohibido) return { ok: false, error: prohibido };
    try {
      const r = await post({ texto: t, padre: destino });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, error: d.error ?? "No se pudo enviar. Probá de nuevo." };
      cargar();
      return { ok: true };
    } catch { return { ok: false, error: "No se pudo enviar. Revisá tu internet." }; }
  }
  async function accion(a: "rescatado" | "borrar", valor = true) {
    setMsg("");
    const r = await fetch(`/api/rescate/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: a, token, valor }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!d?.ok) return setMsg("No se pudo. Probá de nuevo.");
    if (a === "borrar") return volver();
    setMsg(valor ? "¡Gracias por avisar! La publicación quedó marcada como rescatada." : "Listo: la publicación vuelve a figurar como que necesita ayuda."); cargar();
  }

  if (e === undefined) return <p className="vacio">Cargando…</p>;
  if (e === null) return <p className="vacio">Esta publicación ya no está.</p>;
  const dueno = !!token;
  return (
    <>
      <p className="emp-aviso">⚠️ {REGLAS_RESCATE}</p>
      {e.fotos.length > 0 && (
        <div className="emp-galeria">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="foto-mascota" src={e.fotos[Math.min(foto, e.fotos.length - 1)]} alt={`Animal en ${e.zona}`} />
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
      {e.rescatado && <span className="pildora ok">✅ Ya fue rescatado</span>}
      <h2 className="emp-titulo">📍 {e.zona}</h2>
      <p className="emp-texto">{e.descripcion}</p>
      <small className="vacio" style={{ display: "block" }}>Publicado {haceCuanto(e.creado)}. Se borra solo a los {15} días.</small>
      <Denunciar seccion="rescate" id={e.id} />

      {dueno && (
        <section className="emp-dueno" aria-label="Tu publicación">
          <b>⭐ Esta publicación es tuya</b>
          <div className="acciones">
            {e.rescatado
              ? <button className="btn claro" onClick={() => accion("rescatado", false)}>↩️ Sigue necesitando ayuda</button>
              : <button className="btn" onClick={() => accion("rescatado")}>✅ Ya fue rescatado</button>}
            <button className="btn claro" onClick={() => { if (confirm("¿Borrar tu publicación y sus fotos?")) accion("borrar"); }}>🗑️ Borrar</button>
          </div>
          {msg && <p className="normal" role="status">{msg}</p>}
        </section>
      )}

      <h2>Mensajes ({e.comentarios})</h2>
      {e.conversacion.length === 0 && <p className="vacio">Todavía nadie escribió. {dueno ? "" : "Si podés ayudar o sabés de un rescatista, dejá un mensaje."}</p>}
      {e.conversacion.length > 0 && (
        <Hilo mensajes={e.conversacion} maxLen={MAX_COMENTARIO_RESCATE} hace={haceCuanto} marcaDueno="✓ Dueño de la publicación" onResponder={responder}
          renderDenunciar={(m) => <Denunciar seccion="rescate" id={e.id} cid={m.id} />} />
      )}
      <form onSubmit={enviar} className="form">
        <label>{dueno ? "Escribir como dueño de la publicación" : "Dejá un mensaje"}
          <textarea rows={3} maxLength={MAX_COMENTARIO_RESCATE} value={texto} onChange={(x) => setTexto(x.target.value)} placeholder="Podés ayudar, avisar de un rescatista, contar novedades…" />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn ancho" disabled={enviando}>{enviando ? "Enviando…" : "Enviar"}</button>
      </form>
    </>
  );
}

// ---- Publicar ----
type FotoElegida = { blob: Blob; vista: string };
function Publicar({ abrir, volver }: { abrir: (v: string) => void; volver: () => void }) {
  const [zona, setZona] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState<FotoElegida[]>([]);
  const [entendi, setEntendi] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<string | null>(null);
  const camara = useRef<HTMLInputElement>(null), galeria = useRef<HTMLInputElement>(null);

  async function elegir(ev: React.ChangeEvent<HTMLInputElement>) {
    const archivos = [...(ev.target.files ?? [])];
    ev.target.value = "";
    setError("");
    for (const a of archivos) {
      if (fotos.length >= MAX_FOTOS_RESCATE) break;
      try {
        const blob = await achicarFoto(a);
        setFotos((f) => (f.length >= MAX_FOTOS_RESCATE ? f : [...f, { blob, vista: URL.createObjectURL(blob) }]));
      } catch { setError("No pudimos leer una de las fotos. Probá con otra."); }
    }
  }
  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    if (!entendi) return setError("Marcá que leíste las reglas para publicar.");
    if (zona.trim().length < 3) return setError("Contanos en qué zona o esquina está el animal.");
    if (descripcion.trim().length < 10) return setError("Contá en pocas palabras qué le pasa al animal.");
    const prohibido = motivoRescateInvalido(descripcion) ?? motivoRescateInvalido(zona);
    if (prohibido) return setError(prohibido);
    setEnviando(true);
    try {
      const f = new FormData();
      f.append("zona", zona.trim()); f.append("descripcion", descripcion.trim());
      fotos.forEach((x, i) => f.append("foto", x.blob, `foto${i}.jpg`));
      f.append("dispositivo", dispositivo() || crypto.randomUUID());
      const r = await fetch("/api/rescate", { method: "POST", body: f });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setError(d.error ?? "No se pudo publicar. Probá de nuevo.");
      guardarCodigo(d.id, d.token);
      setListo(d.id);
    } catch { setError("No se pudo publicar. Revisá tu internet."); }
    finally { setEnviando(false); }
  }

  if (listo)
    return (
      <>
        <p className="normal">¡Listo! Tu publicación ya se ve en Lomas Hoy durante 15 días. Cuando el animal sea rescatado, entrá y tocá «Ya fue rescatado».</p>
        <button className="btn ancho" onClick={() => { volver(); setTimeout(() => abrir(`rescate-ver:${listo}`), 250); }}>Ver mi publicación</button>
      </>
    );
  return (
    <form onSubmit={enviar} className="form">
      <Cancelar onClick={volver} />
      <section className="emp-aviso" aria-label="Reglas para publicar">
        <b>Antes de publicar, leé esto:</b>
        <ul className="resc-reglas">
          <li>No pongas <b>domicilios</b> ni direcciones con número: decí solo la zona o la esquina.</li>
          <li>No pongas <b>nombres ni apellidos</b>, ni teléfonos, ni patentes.</li>
          <li>No subas <b>fotos de personas</b>: solo del animal y del lugar.</li>
          <li>Si hay un delito (maltrato), la denuncia se hace en la comisaría o la fiscalía: acá solo se pide ayuda para el animal.</li>
        </ul>
      </section>
      <label>Zona o esquina aproximada ({zona.length}/{MAX_ZONA_RESCATE})
        <input value={zona} maxLength={MAX_ZONA_RESCATE} required placeholder="ej: Alsina y Sarmiento, Banfield" onChange={(x) => setZona(x.target.value)} />
      </label>
      <label>Qué le pasa al animal ({descripcion.length}/{MAX_DESCRIPCION_RESCATE})
        <textarea rows={4} maxLength={MAX_DESCRIPCION_RESCATE} required value={descripcion} onChange={(x) => setDescripcion(x.target.value)} placeholder="Perro, gato…; si está herido, abandonado o en peligro; cómo es; hace cuánto lo viste." />
      </label>
      <div>
        <b>Fotos del animal (hasta {MAX_FOTOS_RESCATE}, opcional)</b>
        <div className="emp-fotos">
          {fotos.map((x, i) => (
            <span key={x.vista} className="emp-foto-elegida">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.vista} alt={`Foto ${i + 1}`} />
              <button type="button" aria-label={`Sacar la foto ${i + 1}`} onClick={() => setFotos((f) => f.filter((_, j) => j !== i))}>✕</button>
            </span>
          ))}
        </div>
        {fotos.length < MAX_FOTOS_RESCATE && (
          <div className="acciones">
            <button type="button" className="btn claro" onClick={() => camara.current?.click()}><Icono nombre="camara" tam={20} /> Sacar foto</button>
            <button type="button" className="btn claro" onClick={() => galeria.current?.click()}><Icono nombre="galeria" tam={20} /> Elegir de la galería</button>
          </div>
        )}
        <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={elegir} />
        <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={elegir} />
        <small className="chico">Sin fotos de personas ni de patentes.</small>
      </div>
      <label className="casilla"><input type="checkbox" checked={entendi} onChange={(x) => setEntendi(x.target.checked)} /> Leí las reglas y mi publicación las cumple</label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn ancho" disabled={enviando}>{enviando ? "Publicando…" : "Publicar"}</button>
    </form>
  );
}

export default function Rescate({ vista, abrir, volver }: { vista: string; abrir: (v: string) => void; volver: () => void }) {
  if (vista === "rescate-publicar") return <Publicar abrir={abrir} volver={volver} />;
  if (vista.startsWith("rescate-ver:")) return <Ver id={vista.slice(12)} volver={volver} />;
  return (
    <>
      <p className="vacio">Información para denunciar el maltrato animal y ayuda entre vecinos para los animales que están en la calle.</p>
      <ComoDenunciar abrir={abrir} />
      <Lista abrir={abrir} />
      <Pie seccion="rescate" fuente="Municipio de Lomas de Zamora y Ministerio Público de la Provincia (información); publicaciones de vecinos" />
    </>
  );
}
