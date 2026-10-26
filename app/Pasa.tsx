"use client";
import { useEffect, useRef, useState } from "react";
import { TIPOS_PASA, MAX_TEXTO_PASA, motivoProhibidoPasa, type AvisoPasa } from "@/lib/pasa-comun";
import { haceCuanto } from "@/lib/hace";
import { Icono } from "./Iconos";
import { achicar } from "./Mascotas";
import Denunciar from "./Denunciar";
import { Cancelar } from "./Trueque";

export const NOMBRE_PASA = "Enterate lo que pasa en Lomas";
const dispositivo = () => { try { return localStorage.getItem("lomas-hoy:id") ?? ""; } catch { return ""; } };
const CLAVE_SOL = "lomas-hoy:pasa-solucionado";
const yaMarcados = (): string[] => { try { return JSON.parse(localStorage.getItem(CLAVE_SOL) ?? "[]"); } catch { return []; } };
const tipoDe = (id: string) => TIPOS_PASA.find((t) => t.id === id) ?? TIPOS_PASA[TIPOS_PASA.length - 1];

// Botón a lo ancho de la pantalla principal: el título y, abajo en letra chica, el aviso más reciente que sigue vigente.
export function BotonPasa({ avisos, onClick }: { avisos: AvisoPasa[]; onClick: () => void }) {
  const vigentes = avisos.filter((a) => !a.solucionado);
  const ultimo = vigentes[0], t = ultimo && tipoDe(ultimo.tipo);
  return (
    <button className="boton-pasa" onClick={onClick}>
      <span className="pasa-texto">
        <b>📢 {NOMBRE_PASA}</b>
        {ultimo && t && (
          <span className="pasa-ultimo">
            <span className="pasa-ultimo-texto">{t.emoji} {t.nombre} en {ultimo.donde} · {haceCuanto(ultimo.creado)}</span>
            {vigentes.length > 1 && <span className="pasa-ultimo-mas"> · {vigentes.length} avisos hoy</span>}
          </span>
        )}
      </span>
      <span className="pasa-flecha" aria-hidden>›</span>
    </button>
  );
}

function Aviso({ a, marcado, onSolucionado }: { a: AvisoPasa; marcado: boolean; onSolucionado: (id: string, listo: boolean) => void }) {
  const t = tipoDe(a.tipo);
  async function solucionado() {
    const r = await fetch("/api/pasa/solucionado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, dispositivo: dispositivo() || crypto.randomUUID() }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (d?.ok) onSolucionado(a.id, !!d.solucionado);
  }
  return (
    <li className={`mascota aviso-pasa${a.solucionado ? " resuelto" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {a.foto && <img className="foto-mascota" src={a.foto} alt="" loading="lazy" />}
      <div className="mascota-datos">
        <span className="pildora neutro">{t.emoji} {t.nombre}</span>
        <small>📍 {a.donde}{a.barrio ? ` · ${a.barrio}` : ""} · {haceCuanto(a.creado)}</small>
        <b className="pasa-aviso-texto">{a.texto}</b>
        {a.solucionado
          ? <span className="pildora ok">✅ Ya se solucionó</span>
          : <div className="acciones"><button className="btn claro" disabled={marcado} onClick={solucionado}>{marcado ? "✅ Ya lo marcaste" : "✅ Ya se solucionó"}</button></div>}
        <Denunciar seccion="pasa" id={a.id} />
      </div>
    </li>
  );
}

export function PantallaPasa({ avisos, onAvisar, onSolucionado }: { avisos: AvisoPasa[]; onAvisar: () => void; onSolucionado: (id: string, listo: boolean) => void }) {
  const [mios, setMios] = useState<string[]>(yaMarcados);
  function marcado(id: string, listo: boolean) {
    const lista = [...new Set([...mios, id])];
    setMios(lista);
    try { localStorage.setItem(CLAVE_SOL, JSON.stringify(lista.slice(-100))); } catch {}
    onSolucionado(id, listo);
  }
  return (
    <>
      <button className="btn grande-btn" onClick={onAvisar}>📢 Avisar algo</button>
      <p className="aviso-publicar">Solo lo que pasa en la calle. Sin nombres, fotos de personas, acusaciones ni política. Se borra a las 24 horas.</p>
      {avisos.length === 0
        ? <p className="vacio">Todo tranquilo en Lomas por ahora. ¿Viste algo? Avisá a los vecinos.</p>
        : <ul className="lista">{avisos.map((a) => <Aviso key={a.id} a={a} marcado={mios.includes(a.id)} onSolucionado={marcado} />)}</ul>}
    </>
  );
}

export function FormularioPasa({ onListo }: { onListo: (publicado: boolean) => void }) {
  const [tipo, setTipo] = useState("");
  const [texto, setTexto] = useState("");
  const [calle, setCalle] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [estasEn, setEstasEn] = useState("");
  const [foto, setFoto] = useState<Blob | null>(null);
  const [vista, setVista] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const camara = useRef<HTMLInputElement>(null), galeria = useRef<HTMLInputElement>(null);

  // Al abrir el formulario la app toma la ubicación sola. Si no se puede, no se muestra nada ni se avisa ningún error.
  useEffect(() => {
    let vivo = true;
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        const g = { lat: p.coords.latitude, lng: p.coords.longitude };
        if (!vivo) return;
        setGps(g);
        fetch(`/api/pasa/barrio?lat=${g.lat}&lng=${g.lng}`).then((r) => r.json()).then((d) => { if (vivo && d?.barrio) setEstasEn(d.barrio); }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, timeout: 12000 },
    );
    return () => { vivo = false; };
  }, []);

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
    if (calle.trim().length < 3) return setError("Contanos dónde: la calle y la altura, o la esquina.");
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
        {estasEn && <p className="pasa-estas-en">📍 Estás en {estasEn}</p>}
        <label>¿Dónde? Calle y altura, o esquina
          <input value={calle} maxLength={80} required placeholder="ej: Homero y Limay" onChange={(e) => setCalle(e.target.value)} />
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
