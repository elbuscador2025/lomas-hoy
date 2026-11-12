"use client";
import { useState } from "react";
import { RESPUESTAS_VISIBLES, type MensajeHilo } from "@/lib/hilo-comun";

type Resultado = { ok: true } | { ok: false; error: string };
type Props = {
  mensajes: MensajeHilo[]; // los comentarios originales (cada uno con sus respuestas, de la más vieja a la más nueva)
  maxLen: number;
  hace: (iso: string) => string;
  onResponder: (texto: string, destinoId: string, raizId: string) => Promise<Resultado>; // la pantalla que lo usa guarda y actualiza su lista
  aparte?: Set<string>; // mensajes denunciados por este celular (no se le vuelven a mostrar)
  marcaDueno?: string; // etiqueta para los mensajes del dueño de la publicación
  motivos?: string[]; onDenunciar?: (id: string, motivo: string) => void; // "Denunciar" con los motivos a la vista
  renderDenunciar?: (m: MensajeHilo) => React.ReactNode; // o el botón "Denunciar" propio de la sección
};

// CONVERSACIÓN DE LOS VECINOS (la misma en toda la app): "Responder" en todos los mensajes, respuestas en el mismo hilo en orden de llegada,
// "↳ Respondiendo a: «…»" (al tocarlo va hasta ese mensaje y lo resalta un segundo) y "Ver X respuestas más".
export default function Hilo({ mensajes, maxLen, hace, onResponder, aparte, marcaDueno, motivos, onDenunciar, renderDenunciar }: Props) {
  const [respondiendo, setRespondiendo] = useState<string | null>(null); // mensaje (comentario o respuesta) al que se está contestando
  const [resaltado, setResaltado] = useState<string | null>(null); // mensaje al que se fue desde "Respondiendo a", resaltado un segundo
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<{ id: string; t: string } | null>(null);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set()); // hilos con todas sus respuestas a la vista
  const [denunciando, setDenunciando] = useState<string | null>(null);
  const oculto = (id: string) => !!aparte?.has(id);

  // Va hasta el mensaje al que se le contestó (abriendo el hilo si estaba cerrado) y lo resalta un segundo
  function irA(id: string, raiz: string) {
    setAbiertos((s) => new Set(s).add(raiz));
    setTimeout(() => {
      document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setResaltado(id);
      setTimeout(() => setResaltado((x) => (x === id ? null : x)), 1200);
    }, 60);
  }

  async function enviar(e: React.FormEvent, destino: string, raiz: string) {
    e.preventDefault();
    if (enviando) return;
    const t = texto.trim();
    if (t.length < 2) { setError({ id: destino, t: "Escribí tu respuesta." }); return; }
    setEnviando(true); setError(null);
    try {
      const r = await onResponder(t, destino, raiz);
      if (r.ok) { setAbiertos((s) => new Set(s).add(raiz)); setRespondiendo(null); setTexto(""); } // se abre el hilo para que se vea la respuesta recién enviada
      else setError({ id: destino, t: r.error });
    } catch { setError({ id: destino, t: "No hay conexión. Probá de nuevo." }); }
    setEnviando(false);
  }

  // Un comentario o una respuesta: a quién le contesta, texto, hora, "Responder" (en todos los mensajes) y "Denunciar"
  const fila = (c: MensajeHilo, raiz: string) => (
    <>
      {c.aQuien && (c.aQuien.extracto
        ? <button className="voz-aquien" onClick={() => irA(c.aQuien!.id, raiz)}>↳ Respondiendo a: «{c.aQuien.extracto}»</button>
        : <small className="voz-aquien">↳ Respondiendo a un mensaje que ya no está</small>)}
      {c.duenio && marcaDueno && <span className="pildora ok hilo-dueno">{marcaDueno}</span>}
      <span>{c.texto}</span>
      <div className="voz-meta">
        <small>{hace(c.creado)}</small>
        {denunciando === c.id && motivos ? (
          <span className="voz-motivos">
            {motivos.map((m) => <button key={m} onClick={() => { setDenunciando(null); onDenunciar?.(c.id, m); }}>{m}</button>)}
            <button onClick={() => setDenunciando(null)}>Cancelar</button>
          </span>
        ) : (
          <span className="voz-acciones">
            <button className="voz-resp-btn" onClick={() => { setRespondiendo(respondiendo === c.id ? null : c.id); setTexto(""); setError(null); }}>Responder</button>
            {renderDenunciar ? renderDenunciar(c) : <button className="voz-den" onClick={() => setDenunciando(c.id)}>Denunciar</button>}
          </span>
        )}
      </div>
    </>
  );

  // Formulario para contestarle a un mensaje: la respuesta queda en el hilo del comentario original
  const formulario = (msgId: string, raiz: string) => respondiendo === msgId && (
    <form className="voz-form-resp" onSubmit={(e) => enviar(e, msgId, raiz)}>
      <textarea autoFocus value={texto} onChange={(e) => setTexto(e.target.value.slice(0, maxLen))} maxLength={maxLen} rows={2} placeholder="Escribí tu respuesta" aria-label="Tu respuesta" />
      <div className="voz-pie">
        <small>{texto.length}/{maxLen}</small>
        <span className="voz-botones">
          <button type="button" className="btn claro chico" onClick={() => { setRespondiendo(null); setError(null); }}>Cancelar</button>
          {texto.length > 0 && <button className="btn chico" disabled={enviando || texto.trim().length < 2}>{enviando ? "Enviando…" : "Enviar"}</button>}
        </span>
      </div>
      {error?.id === msgId && <p className="voz-error" role="alert">{error.t}</p>}
    </form>
  );

  return (
    <ul className="voz-lista">
      {mensajes.map((c) => {
        const resp = (c.respuestas ?? []).filter((r) => !oculto(r.id));
        const abierto = abiertos.has(c.id);
        const aMostrar = abierto ? resp : resp.slice(0, RESPUESTAS_VISIBLES);
        return (
          <li key={c.id}>
            <div id={`msg-${c.id}`} className={`voz-msg${resaltado === c.id ? " voz-resaltado" : ""}`}>{fila(c, c.id)}</div>
            {formulario(c.id, c.id)}
            {aMostrar.length > 0 && (
              <ul className="voz-resp">
                {aMostrar.map((r) => (
                  <li key={r.id}>
                    <div id={`msg-${r.id}`} className={`voz-msg${resaltado === r.id ? " voz-resaltado" : ""}`}>{fila(r, c.id)}</div>
                    {formulario(r.id, c.id)}
                  </li>
                ))}
              </ul>
            )}
            {resp.length > RESPUESTAS_VISIBLES && !abierto && (
              <button className="voz-mas-resp" onClick={() => setAbiertos((s) => new Set(s).add(c.id))}>
                Ver {resp.length - RESPUESTAS_VISIBLES} {resp.length - RESPUESTAS_VISIBLES === 1 ? "respuesta más" : "respuestas más"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
