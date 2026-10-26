"use client";
import { useRef, useState } from "react";
import { TIPOS_PASA, MAX_TEXTO_PASA, motivoProhibidoPasa, type AvisoPasa } from "@/lib/pasa-comun";
import { haceCuanto } from "@/lib/hace";
import { Icono } from "./Iconos";
import { achicar } from "./Mascotas";
import Denunciar from "./Denunciar";
import { Cancelar } from "./Trueque";

const dispositivo = () => { try { return localStorage.getItem("lomas-hoy:id") ?? ""; } catch { return ""; } };
const CLAVE_VISTOS = "lomas-hoy:pasa-vistos";
const yaVistos = (): string[] => { try { return JSON.parse(localStorage.getItem(CLAVE_VISTOS) ?? "[]"); } catch { return []; } };
const tipoDe = (id: string) => TIPOS_PASA.find((t) => t.id === id) ?? TIPOS_PASA[TIPOS_PASA.length - 1];

// Botón a lo ancho de la pantalla principal: muestra el último aviso (o invita a avisar)
export function BotonPasa({ ultimo, onClick }: { ultimo?: AvisoPasa; onClick: () => void }) {
  const t = ultimo && tipoDe(ultimo.tipo);
  return (
    <button className="boton-pasa" onClick={onClick}>
      <span className="pasa-texto">
        <b>📢 Pasa en Lomas</b>
        <span>{ultimo && t ? ` · ${t.emoji} ${t.nombre}${ultimo.donde ? ` en ${ultimo.donde}` : ""} · ${haceCuanto(ultimo.creado)}` : " · ¿Viste algo en el barrio? Avisá a los vecinos"}</span>
      </span>
      <span className="pasa-flecha" aria-hidden>›</span>
    </button>
  );
}

function Aviso({ a, vistoPorMi, onVisto }: { a: AvisoPasa; vistoPorMi: boolean; onVisto: (id: string, n: number) => void }) {
  const t = tipoDe(a.tipo);
  const mapa = a.lat != null && a.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.donde}, Lomas de Zamora, Buenos Aires`)}`;
  async function yoTambien() {
    const r = await fetch("/api/pasa/visto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, dispositivo: dispositivo() || crypto.randomUUID() }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (d?.ok) onVisto(a.id, d.vistos);
  }
  return (
    <li className="mascota aviso-pasa">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {a.foto && <img className="foto-mascota" src={a.foto} alt="" loading="lazy" />}
      <div className="mascota-datos">
        <span className="pildora neutro">{t.emoji} {t.nombre}</span>
        <small>📍 {a.barrio || a.donde} · {haceCuanto(a.creado)}</small>
        <b className="pasa-aviso-texto">{a.texto}</b>
        <span className="pasa-vistos">👀 {a.vistos === 1 ? "1 vecino lo vio" : `${a.vistos} vecinos lo vieron`}</span>
        <div className="acciones">
          <button className="btn claro" disabled={vistoPorMi} onClick={yoTambien}>{vistoPorMi ? "👀 Ya lo marcaste" : "👀 Yo también lo vi"}</button>
          <a className="btn claro" href={mapa} target="_blank" rel="noreferrer">Ver en el mapa</a>
        </div>
        <Denunciar seccion="pasa" id={a.id} />
      </div>
    </li>
  );
}

export function PantallaPasa({ avisos, onAvisar, onVisto }: { avisos: AvisoPasa[]; onAvisar: () => void; onVisto: (id: string, n: number) => void }) {
  const [mios, setMios] = useState<string[]>(yaVistos);
  function visto(id: string, n: number) {
    const lista = [...new Set([...mios, id])];
    setMios(lista);
    try { localStorage.setItem(CLAVE_VISTOS, JSON.stringify(lista.slice(-100))); } catch {}
    onVisto(id, n);
  }
  return (
    <>
      <button className="btn grande-btn" onClick={onAvisar}>📢 Avisar algo</button>
      <p className="aviso-publicar">Solo lo que pasa en la calle. Sin nombres, fotos de personas, acusaciones ni política. Se borra a las 24 horas.</p>
      {avisos.length === 0
        ? <p className="vacio">Todo tranquilo en Lomas por ahora. ¿Viste algo? Avisá a los vecinos.</p>
        : <ul className="lista">{avisos.map((a) => <Aviso key={a.id} a={a} vistoPorMi={mios.includes(a.id)} onVisto={visto} />)}</ul>}
    </>
  );
}

export function FormularioPasa({ onListo }: { onListo: (publicado: boolean) => void }) {
  const [tipo, setTipo] = useState("");
  const [texto, setTexto] = useState("");
  const [calle, setCalle] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [buscandoGps, setBuscandoGps] = useState(false);
  const [foto, setFoto] = useState<Blob | null>(null);
  const [vista, setVista] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const camara = useRef<HTMLInputElement>(null), galeria = useRef<HTMLInputElement>(null);

  function usarUbicacion() {
    setError(""); setBuscandoGps(true);
    navigator.geolocation?.getCurrentPosition(
      (p) => { setGps({ lat: p.coords.latitude, lng: p.coords.longitude }); setBuscandoGps(false); },
      () => { setBuscandoGps(false); setError("No pudimos obtener tu ubicación. Escribí la calle y la altura."); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
    if (!navigator.geolocation) { setBuscandoGps(false); setError("Tu celular no permite usar la ubicación. Escribí la calle y la altura."); }
  }
  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError("");
    try {
      const b = await achicar(archivo);
      setFoto(b);
      setVista((p) => { if (p) URL.revokeObjectURL(p); return URL.createObjectURL(b); });
    } catch { setError("No pudimos leer esa foto. Probá con otra."); }
  }
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!tipo) return setError("Elegí qué pasa.");
    if (texto.trim().length < 3) return setError("Contá qué pasa en pocas palabras.");
    const prohibido = motivoProhibidoPasa(texto);
    if (prohibido) return setError(prohibido);
    if (!gps && calle.trim().length < 3) return setError("Poné dónde: usá tu ubicación o escribí la calle y la altura.");
    setEnviando(true);
    try {
      const f = new FormData();
      f.append("tipo", tipo); f.append("texto", texto.trim()); f.append("calle", calle.trim());
      if (gps) { f.append("lat", String(gps.lat)); f.append("lng", String(gps.lng)); }
      if (foto) f.append("foto", foto, "foto.jpg");
      f.append("dispositivo", dispositivo() || crypto.randomUUID());
      const r = await fetch("/api/pasa", { method: "POST", body: f });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setError(d.error ?? "No se pudo publicar. Probá de nuevo.");
      onListo(true);
    } catch { setError("No se pudo publicar. Revisá tu internet."); }
    finally { setEnviando(false); }
  }

  return (
    <form onSubmit={enviar} className="form">
      <Cancelar onClick={() => onListo(false)} />
      <label>Qué pasa
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Elegí una</option>
          {TIPOS_PASA.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.nombre}</option>)}
        </select>
      </label>
      <label>Contalo en pocas palabras ({texto.length}/{MAX_TEXTO_PASA})
        <textarea rows={3} maxLength={MAX_TEXTO_PASA} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </label>
      <div>
        <b>Dónde</b>
        <button type="button" className="btn claro ancho" onClick={usarUbicacion} disabled={buscandoGps}>
          <Icono nombre="pin" tam={20} /> {buscandoGps ? "Buscando tu ubicación…" : gps ? "✓ Ubicación lista (tocá para actualizar)" : "Usar mi ubicación"}
        </button>
        <label>O escribí la calle y la altura
          <input value={calle} maxLength={80} placeholder="Ej: Newton y Bustos" onChange={(e) => setCalle(e.target.value)} />
        </label>
      </div>
      <div>
        <b>Agregar foto (opcional)</b>
        {vista && /* eslint-disable-next-line @next/next/no-img-element */ <img className="vista-previa" src={vista} alt="Tu foto" />}
        <div className="acciones">
          <button type="button" className="btn claro" onClick={() => camara.current?.click()}><Icono nombre="camara" tam={20} /> Sacar foto</button>
          <button type="button" className="btn claro" onClick={() => galeria.current?.click()}><Icono nombre="galeria" tam={20} /> Elegir de la galería</button>
        </div>
        <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={elegirFoto} />
        <input ref={galeria} type="file" accept="image/*" hidden onChange={elegirFoto} />
        <small className="chico">Sin fotos de personas ni de patentes.</small>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn ancho" disabled={enviando}>{enviando ? "Publicando…" : "Publicar"}</button>
    </form>
  );
}
