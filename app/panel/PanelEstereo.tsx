"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { uploadPresigned } from "@vercel/blob/client";
import { post } from "./api";
import { MAX_BYTES_ESTEREO, esMp3, nombreDeArchivo } from "@/lib/estereo-comun";

type Actual = { url: string; nombre: string; tam: number; subido: string; original: boolean };
const mb = (b: number) => (b > 0 ? `${(b / 1048576).toFixed(2).replace(".", ",")} MB` : "peso no disponible");
const fecha = (iso: string) => new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short", hour12: false });

// Pestaña "Estéreo": la canción de prueba del juego "Carrera de Autopista". Subo un MP3 y reemplaza a la actual; el cambio se ve la próxima vez que alguien abre el juego.
export default function PanelEstereo() {
  const [actual, setActual] = useState<Actual | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [avance, setAvance] = useState(0);
  const entrada = useRef<HTMLInputElement>(null);
  const cargar = useCallback(async () => { const r = await post("/api/panel/estereo", { accion: "leer" }); if (r.ok) setActual((await r.json()).actual); }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function elegir(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0]; ev.target.value = "";
    if (!f) return;
    setMsg(null);
    if (!/\.mp3$/i.test(f.name)) return setMsg({ ok: false, t: `«${f.name}» no es un archivo MP3. Elegí uno que termine en .mp3.` });
    if (f.size > MAX_BYTES_ESTEREO) return setMsg({ ok: false, t: `El archivo pesa ${(f.size / 1048576).toFixed(1).replace(".", ",")} MB: el máximo es 8 MB. Probá con una versión más corta o más liviana.` });
    if (f.size < 1024 || !esMp3(new Uint8Array(await f.slice(0, 10).arrayBuffer()))) return setMsg({ ok: false, t: `«${f.name}» no parece un MP3 de verdad (puede ser otro tipo de archivo con el nombre cambiado).` });
    setSubiendo(true); setAvance(0);
    try {
      const nombreSeguro = f.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._ -]/g, "_").slice(-80);
      const blob = await uploadPresigned(`estereo/${nombreSeguro}`, f, { access: "public", handleUploadUrl: "/api/panel/estereo/subir", contentType: "audio/mpeg", onUploadProgress: (p) => setAvance(Math.round(p.percentage)) });
      const r = await post("/api/panel/estereo", { accion: "guardar", url: blob.url, nombre: nombreDeArchivo(f.name) });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) return setMsg({ ok: false, t: j.error || "No se pudo guardar." });
      setMsg({ ok: true, t: "Listo: esta canción suena en el juego la próxima vez que alguien lo abra." });
      cargar();
    } catch (e) {
      setMsg({ ok: false, t: `No se pudo subir: ${(e as Error).message || "revisá tu internet y probá de nuevo."}` });
    } finally { setSubiendo(false); }
  }
  async function volver() {
    if (!confirm("¿Volver a la canción original del juego?")) return;
    const r = await post("/api/panel/estereo", { accion: "original" });
    setMsg((await r.json().catch(() => ({}))).ok ? { ok: true, t: "Listo: volvió la canción original." } : { ok: false, t: "No se pudo." });
    cargar();
  }

  return (
    <div>
      <h2>Estéreo de «Carrera de Autopista»</h2>
      <p className="vacio">Es la canción de prueba que suena al tocar «Jugar». Subí un MP3 para reemplazarla (hasta 8 MB).</p>
      {msg && <p className={msg.ok ? "normal" : "error"} role={msg.ok ? "status" : "alert"}>{msg.t}</p>}
      <div className="mascota"><div className="mascota-datos" style={{ width: "100%" }}>
        <b>Canción cargada ahora</b>
        {actual ? (
          <>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{actual.nombre}</span>
            <small>{mb(actual.tam)} · {actual.original ? "es la canción original del juego" : `subida el ${fecha(actual.subido)}`}</small>
            <audio key={actual.url} controls preload="none" src={actual.url} style={{ width: "100%" }} />
          </>
        ) : <small>Cargando…</small>}
      </div></div>
      <div className="mascota"><div className="mascota-datos" style={{ width: "100%" }}>
        <b>Reemplazarla</b>
        <button className="btn grande-btn" disabled={subiendo} onClick={() => entrada.current?.click()}>{subiendo ? `Subiendo… ${avance}%` : "Subir un MP3"}</button>
        <input ref={entrada} type="file" accept=".mp3,audio/mpeg" hidden onChange={elegir} />
        <small>Solo archivos .mp3 de hasta 8 MB. Si no es un MP3 o pesa más, se rechaza y te avisa.</small>
        {actual && !actual.original && <button className="btn claro" disabled={subiendo} onClick={volver}>Volver a la canción original</button>}
      </div></div>
      <p className="vacio">Los archivos se guardan en el almacenamiento gratis de Vercel: cada celular que abre el juego baja la canción una vez (8 MB como máximo). El plan gratis incluye 10 GB de descargas por mes, así que conviene usar temas livianos.</p>
    </div>
  );
}
