"use client";
import { useCallback, useEffect, useState } from "react";
import { post } from "./api";
import { CartelNovedad } from "../Novedad";
import { MAX_TEXTO_NOVEDAD, TITULO_NOVEDAD, destinoDe, type Novedad } from "@/lib/novedad-comun";

// Secciones a las que puede llevar el aviso (el código es el de los enlaces directos ?v=)
const SECCIONES: [string, string][] = [
  ["escuelas", "Escuelas y estudios"], ["estudiar", "Estudiá gratis"], ["impuestos", "Impuestos y tasas"], ["auto", "Auto y trámites"], ["rescate", "Perro al rescate"],
  ["jubilados", "Jubilados"], ["juegos", "Juegos"], ["agenda", "Agenda de Lomas"], ["noticias", "Noticias de Lomas"], ["emprendedores", "Emprendedores"],
  ["trueque", "Trueque"], ["trabajo", "Trabajo"], ["empleo", "Portal Empleo"], ["deportes", "Deportes para chicos"], ["mascotas", "Mascotas perdidas"],
  ["farmacias", "Farmacias"], ["guardias", "Guardias 24 hs"], ["anses", "Hoy cobran"], ["quiniela", "Quiniela y Quini 6"], ["castracion", "Castración gratuita"],
];
const fecha = (iso: string) => new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short", hour12: false });

// Pestaña "Novedades": el cartelito "🆕 Lomas Hoy sumó algo nuevo" que ven todos al abrir la app. Cada vez que se publica uno, se vuelve a mostrar a todos.
export default function PanelNovedad() {
  const [actual, setActual] = useState<Novedad | null>(null);
  const [texto, setTexto] = useState("");
  const [enlace, setEnlace] = useState("");
  const [activo, setActivo] = useState(true);
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const cargar = useCallback(async () => {
    const r = await post("/api/panel/novedad", { accion: "leer" });
    if (!r.ok) return;
    const n = ((await r.json()).novedad ?? null) as Novedad | null;
    setActual(n);
    if (n) { setTexto((t) => t || n.texto); setEnlace((e) => e || n.enlace); setActivo(n.activo); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function publicar() {
    setMsg(""); setOcupado(true);
    try {
      const r = await post("/api/panel/novedad", { accion: "publicar", texto, enlace, activo });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) return setMsg(j.error || "No se pudo publicar.");
      setMsg(activo ? "Publicado: lo van a ver todos al abrir la app (una sola vez cada uno)." : "Guardado como inactivo: no se muestra a nadie.");
      setActual(j.novedad);
    } finally { setOcupado(false); }
  }
  async function alternar(v: boolean) {
    setActivo(v);
    if (!actual) return; // todavía no hay ningún aviso publicado: el interruptor se usa al publicar
    const r = await post("/api/panel/novedad", { accion: "activar", valor: v });
    setMsg((await r.json().catch(() => ({}))).ok ? (v ? "Aviso activo otra vez (no se repite a quien ya lo vio)." : "Aviso apagado: ya no se muestra.") : "No se pudo cambiar.");
    cargar();
  }

  const enlaceMalo = !!enlace.trim() && !destinoDe(enlace);
  return (
    <div>
      <h2>Aviso de novedades</h2>
      <p className="vacio">Es un cartelito chico que aparece arriba, 6 segundos, cuando alguien abre la app. Cada aviso se muestra una sola vez en cada celular. Al publicar se crea un aviso nuevo y se vuelve a mostrar a todos.</p>
      {msg && <p className="normal" role="status">{msg}</p>}
      <div className="mascota"><div className="mascota-datos" style={{ width: "100%" }}>
        <b>{TITULO_NOVEDAD}</b>
        <small>El título es fijo: solo se escribe el texto.</small>
        <label>Texto del aviso ({texto.length}/{MAX_TEXTO_NOVEDAD})
          <textarea value={texto} onChange={(e) => setTexto(e.target.value.slice(0, MAX_TEXTO_NOVEDAD))} rows={3} maxLength={MAX_TEXTO_NOVEDAD} placeholder="Ahora la app tiene un juego de carreras para grandes y chicos. Tocá acá para entrar y probarlo." style={{ width: "100%", fontSize: 16 }} />
        </label>
        <label>Enlace o sección a abrir (opcional)
          <input value={enlace} onChange={(e) => setEnlace(e.target.value)} list="secciones-novedad" placeholder="Elegí una sección o pegá una dirección https://…" maxLength={300} style={{ width: "100%", minHeight: 44, fontSize: 16 }} />
          <datalist id="secciones-novedad">{SECCIONES.map(([v, n]) => <option key={v} value={v} label={n} />)}</datalist>
        </label>
        {enlaceMalo && <p className="error" role="alert">El enlace no sirve: usá el código de una sección (por ejemplo «escuelas») o una dirección que empiece con https://</p>}
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 18, fontWeight: 800 }}>
          <input type="checkbox" role="switch" style={{ width: 26, height: 26 }} checked={activo} onChange={(e) => alternar(e.target.checked)} />
          {activo ? "Activo" : "Inactivo"}
        </label>
        <button className="btn grande-btn" disabled={ocupado || texto.trim().length < 5 || enlaceMalo} onClick={publicar}>Publicar aviso</button>
      </div></div>

      <h2>Vista previa</h2>
      <p className="vacio">Así lo van a ver los usuarios:</p>
      <div style={{ background: "#EEF2FA", borderRadius: 16, padding: 12 }}>
        <div className="novedad-previa"><CartelNovedad texto={texto.trim() || "Acá se va a leer el texto de tu aviso."} hayEnlace={!!enlace.trim() && !enlaceMalo} /></div>
      </div>

      <h2>Aviso publicado ahora</h2>
      {actual ? (
        <p className="vacio"><b>{actual.activo ? "Activo" : "Inactivo"}</b> · publicado el {fecha(actual.creado)}<br />«{actual.texto}»{actual.enlace ? <><br />Lleva a: {actual.enlace}</> : null}</p>
      ) : <p className="vacio">Todavía no hay ningún aviso publicado.</p>}
    </div>
  );
}
