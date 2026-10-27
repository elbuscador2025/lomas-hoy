"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { TIPOS_PASA, MAX_TEXTO_PASA, motivoProhibidoPasa, type AvisoPasa } from "@/lib/pasa-comun";
import { haceCuanto } from "@/lib/hace";
import { Icono } from "./Iconos";
import { achicar } from "./Mascotas";
import Denunciar from "./Denunciar";
import { Cancelar } from "./Trueque";

// Avisos de vecinos: se ven en la campanita ("Mis avisos"). Sin notificación push, sin sonido y sin vibración.
const dispositivo = () => { try { return localStorage.getItem("lomas-hoy:id") ?? ""; } catch { return ""; } };
const leerJson = <T,>(clave: string, por: T): T => { try { return JSON.parse(localStorage.getItem(clave) ?? "") as T; } catch { return por; } };
const guardar = (clave: string, v: unknown) => { try { localStorage.setItem(clave, JSON.stringify(v)); } catch {} };
const CLAVE_SOL = "lomas-hoy:pasa-solucionado", CLAVE_VISTO = "lomas-hoy:vecinos-visto", CLAVE_MIOS = "lomas-hoy:vecinos-mios";
const tipoDe = (id: string) => TIPOS_PASA.find((t) => t.id === id) ?? TIPOS_PASA[TIPOS_PASA.length - 1];

// Los avisos de vecinos y cuántos le faltan ver a este celular (los solucionados y los que publicó este mismo celular no cuentan)
export function useVecinos(activo: boolean) {
  const [avisos, setAvisos] = useState<AvisoPasa[]>([]);
  const [visto, setVisto] = useState(0);
  const [mios, setMios] = useState<string[]>([]);
  const recargar = useCallback((fresco = false) => {
    if (!activo) return;
    fetch(fresco ? `/api/pasa?t=${Date.now()}` : "/api/pasa").then((r) => (r.ok ? r.json() : null)).then((j) => { if (Array.isArray(j)) setAvisos(j); }).catch(() => {});
    setVisto(Number(leerJson<number>(CLAVE_VISTO, 0)) || 0);
    setMios(leerJson<string[]>(CLAVE_MIOS, []));
  }, [activo]);
  useEffect(() => {
    recargar();
    const alVer = () => { if (document.visibilityState === "visible") recargar(); };
    document.addEventListener("visibilitychange", alVer);
    return () => document.removeEventListener("visibilitychange", alVer);
  }, [recargar]);
  const marcarVistos = useCallback(() => { guardar(CLAVE_VISTO, Date.now()); setVisto(Date.now()); }, []);
  const sinVer = avisos.filter((a) => !a.solucionado && new Date(a.creado).getTime() > visto && !mios.includes(a.id)).length;
  const solucionadoLocal = (id: string, listo: boolean) => setAvisos((l) => l.map((a) => (a.id === id && listo ? { ...a, solucionado: true } : a)).sort((a, b) => Number(a.solucionado) - Number(b.solucionado)));
  return { avisos, sinVer, recargar, marcarVistos, solucionadoLocal };
}
export type Vecinos = ReturnType<typeof useVecinos>;

// Botón a lo ancho de la pantalla principal: abre directamente el formulario para avisar
export function BotonPasa({ onClick }: { onClick: () => void }) {
  return <button className="boton-pasa" onClick={onClick}><b>📢 Avisá si pasa algo en tu zona</b></button>;
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
      {a.foto && <img className="foto-vecino" src={a.foto} alt="" loading="lazy" />}
      <div className="mascota-datos">
        <b>{t.emoji} Un vecino avisó: {t.nombre}</b>
        <span className="pasa-aviso-texto">{a.texto}</span>
        <small>📍 {a.donde} · {haceCuanto(a.creado)}</small>
        {a.solucionado
          ? <span className="pildora ok">✅ Ya se solucionó</span>
          : <div className="acciones"><button className="btn claro" disabled={marcado} onClick={solucionado}>{marcado ? "✅ Ya lo marcaste" : "✅ Ya se solucionó"}</button></div>}
        <Denunciar seccion="pasa" id={a.id} />
      </div>
    </li>
  );
}

// La lista que va arriba de la campanita: más nuevos primero, los solucionados abajo en gris
export function AvisosVecinos({ vecinos }: { vecinos: Vecinos }) {
  const [marcados, setMarcados] = useState<string[]>(() => leerJson<string[]>(CLAVE_SOL, []));
  if (!vecinos.avisos.length) return null;
  function marcado(id: string, listo: boolean) {
    const lista = [...new Set([...marcados, id])];
    setMarcados(lista);
    guardar(CLAVE_SOL, lista.slice(-100));
    vecinos.solucionadoLocal(id, listo);
    vecinos.recargar(true);
  }
  return (
    <section aria-label="Avisos de vecinos">
      <p className="aviso-vecinos-nota">Avisos escritos por vecinos. Lomas Hoy no los verifica.</p>
      <ul className="lista">{vecinos.avisos.map((a) => <Aviso key={a.id} a={a} marcado={marcados.includes(a.id)} onSolucionado={marcado} />)}</ul>
    </section>
  );
}

export function FormularioPasa({ onListo }: { onListo: (publicado: boolean) => void }) {
  const [tipo, setTipo] = useState("");
  const [texto, setTexto] = useState("");
  const [donde, setDonde] = useState("");
  const [foto, setFoto] = useState<Blob | null>(null);
  const [vista, setVista] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const camara = useRef<HTMLInputElement>(null), galeria = useRef<HTMLInputElement>(null);

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
    if (donde.trim().length < 3) return setError("Contanos dónde pasó: la calle y el barrio.");
    setEnviando(true);
    try {
      const f = new FormData();
      f.append("tipo", tipo); f.append("texto", texto.trim()); f.append("calle", donde.trim());
      if (foto) f.append("foto", foto, "foto.jpg");
      f.append("dispositivo", dispositivo() || crypto.randomUUID());
      const r = await fetch("/api/pasa", { method: "POST", body: f });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setError(d.error ?? "No se pudo publicar. Probá de nuevo.");
      if (d.id) guardar(CLAVE_MIOS, [...leerJson<string[]>(CLAVE_MIOS, []), d.id].slice(-50)); // el aviso propio no suma al puntito rojo
      setListo(true);
    } catch { setError("No se pudo publicar. Revisá tu internet."); }
    finally { setEnviando(false); }
  }

  if (listo)
    return (
      <>
        <p className="normal">Listo, tu aviso ya se ve en la campanita de los vecinos.</p>
        <button className="btn ancho" onClick={() => onListo(true)}>Volver</button>
      </>
    );
  return (
    <form onSubmit={enviar} className="form">
      <Cancelar onClick={() => onListo(false)} />
      <label>Qué pasa
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Elegí una</option>
          {TIPOS_PASA.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.nombre}</option>)}
        </select>
      </label>
      <label>Contalo en pocas palabras (máx. {MAX_TEXTO_PASA})
        <textarea rows={3} maxLength={MAX_TEXTO_PASA} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </label>
      <label>¿Dónde pasó?
        <input value={donde} maxLength={80} required placeholder="Calle y barrio (ej: Camino Negro e Itatí, Budge)" onChange={(e) => setDonde(e.target.value)} />
      </label>
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
