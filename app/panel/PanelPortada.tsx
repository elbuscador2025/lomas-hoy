"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { post } from "./api";

type Portada = { id: string; titulo: string; texto: string; enlace: string; foto: string; creado: string };
const MAX = 3, MAX_TITULO = 90, MAX_TEXTO = 200, MAX_BYTES = 450_000;

// Foto del celular o la compu → JPG de hasta 1200 px y 450 KB
async function achicar(archivo: File): Promise<Blob> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error("foto")); i.src = url; });
    const escala = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * escala); c.height = Math.round(img.naturalHeight * escala);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    for (const calidad of [0.8, 0.7, 0.6, 0.5, 0.4, 0.3]) {
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", calidad));
      if (blob && blob.size <= MAX_BYTES) return blob;
    }
    throw new Error("foto");
  } finally { URL.revokeObjectURL(url); }
}

// Pestaña "Portada": la foto grande "Hoy en Lomas". Si cargo alguna acá, reemplaza a la automática; si las saco todas, vuelve la automática.
export default function PanelPortada() {
  const [lista, setLista] = useState<Portada[]>([]);
  const [msg, setMsg] = useState("");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [enlace, setEnlace] = useState("");
  const [foto, setFoto] = useState<{ blob: Blob; vista: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const cargar = useCallback(async () => { const r = await post("/api/panel/portada", { accion: "listar" }); if (r.ok) setLista((await r.json()).lista); }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const a = e.target.files?.[0]; e.target.value = "";
    if (!a) return;
    try { const blob = await achicar(a); setFoto({ blob, vista: URL.createObjectURL(blob) }); setMsg(""); } catch { setMsg("No se pudo leer esa foto. Probá con otra."); }
  }
  async function subir() {
    setMsg("");
    if (!foto) return setMsg("Elegí una foto.");
    setOcupado(true);
    try {
      const f = new FormData();
      f.append("titulo", titulo); f.append("texto", texto); f.append("enlace", enlace); f.append("foto", foto.blob, "portada.jpg");
      const r = await fetch("/api/panel/portada", { method: "POST", body: f });
      if (r.status === 401) { location.href = "/entrar"; return; }
      const j = await r.json().catch(() => ({}));
      if (!j.ok) return setMsg(j.error || "No se pudo subir.");
      setTitulo(""); setTexto(""); setEnlace(""); setFoto(null); setMsg("Listo: la portada ya se ve en la pantalla principal."); cargar();
    } catch { setMsg("No se pudo subir. Revisá tu internet."); }
    finally { setOcupado(false); }
  }
  async function sacar(id: string) {
    const r = await post("/api/panel/portada", { accion: "quitar", id });
    setMsg((await r.json().catch(() => ({}))).ok ? (lista.length <= 1 ? "Sacada: vuelve la portada automática." : "Portada sacada.") : "No se pudo sacar.");
    cargar();
  }

  return (
    <div>
      <h2>Portada ({lista.length} de {MAX})</h2>
      <p className="vacio">{lista.length ? "Se ven estas portadas en la pantalla principal (rotan solas). La foto automática de las noticias queda de lado mientras haya alguna." : "Ahora se ve la foto automática de la noticia o el evento más nuevo. Si cargás una portada acá, la reemplaza."}</p>
      {msg && <p className="normal" role="status">{msg}</p>}
      <ul className="lista">
        {lista.map((p) => (
          <li key={p.id} className="mascota">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="foto-mascota" src={p.foto} alt="" loading="lazy" style={{ maxHeight: 160, objectFit: "cover" }} />
            <div className="mascota-datos">
              <b>{p.titulo}</b>
              {p.texto && <span>{p.texto}</span>}
              {p.enlace && <small>Enlace: {p.enlace}</small>}
              <div className="acciones"><button className="btn claro" onClick={() => { if (confirm("¿Sacar esta portada?")) sacar(p.id); }}>Sacar</button></div>
            </div>
          </li>
        ))}
      </ul>
      {lista.length < MAX && (
        <div className="mascota"><div className="mascota-datos" style={{ width: "100%" }}>
          <b>Nueva portada</b>
          {foto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="foto-mascota" src={foto.vista} alt="Vista previa" style={{ maxHeight: 180, objectFit: "cover" }} />
          )}
          <button className="btn claro" onClick={() => entrada.current?.click()}>{foto ? "Cambiar la foto" : "Elegir la foto"}</button>
          <input ref={entrada} type="file" accept="image/*" hidden onChange={elegir} />
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (se lee encima de la foto)" maxLength={MAX_TITULO} style={{ width: "100%", minHeight: 44, fontSize: 16 }} />
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Texto corto (si no ponés enlace)" maxLength={MAX_TEXTO} rows={3} style={{ width: "100%", fontSize: 16 }} />
          <input value={enlace} onChange={(e) => setEnlace(e.target.value)} placeholder="O un enlace: https://…" maxLength={400} inputMode="url" style={{ width: "100%", minHeight: 44, fontSize: 16 }} />
          <small>Con enlace, al tocar la portada se abre ese sitio. Sin enlace, se abre una pantalla con tu texto.</small>
          <button className="btn" disabled={ocupado} onClick={subir}>{ocupado ? "Subiendo…" : "Publicar portada"}</button>
        </div></div>
      )}
    </div>
  );
}
