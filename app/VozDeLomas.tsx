"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_COMENTARIO_VOZ, MOTIVOS_VOZ, RESPUESTAS_VISIBLES, type EstadoVoz, type ResultadoVoz, type ComentarioVoz } from "@/lib/voz-comun";

// "LA VOZ DE LOMAS": la pregunta del día arriba de todo. Se vota con un toque, sin registro. Después se ven los resultados y se puede dejar un comentario corto.
const hace = (iso: string) => {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 2) return "recién";
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`;
  const d = Math.floor(min / 1440);
  return d === 1 ? "ayer" : `hace ${d} días`;
};
const MAX_VISIBLES = 4;

function idDelCelular() {
  try {
    let id = localStorage.getItem("lomas-hoy:id"); // el mismo identificador anónimo que cuenta las visitas
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("lomas-hoy:id", id); }
    return id;
  } catch { return `t-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`; }
}
const esDueno = () => { try { return !!localStorage.getItem("lomas-hoy:dueno"); } catch { return false; } };
const guardada = (pid: string) => { try { return localStorage.getItem(`lomas-hoy:voz:${pid}`); } catch { return null; } };
const guardar = (pid: string, op: string) => { try { localStorage.setItem(`lomas-hoy:voz:${pid}`, op); } catch {} };

export default function VozDeLomas() {
  const disp = useRef("");
  const [estado, setEstado] = useState<EstadoVoz | null>(null);
  const [oculta, setOculta] = useState(false); // sin pregunta o sin conexión: la tarjeta no se muestra
  const [votando, setVotando] = useState(false);
  const [errorVoto, setErrorVoto] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msgCom, setMsgCom] = useState<{ ok: boolean; t: string } | null>(null);
  const [verMas, setVerMas] = useState(false);
  const [denunciando, setDenunciando] = useState<string | null>(null);
  const [respondiendo, setRespondiendo] = useState<string | null>(null); // comentario al que se está contestando
  const [textoResp, setTextoResp] = useState("");
  const [enviandoResp, setEnviandoResp] = useState(false);
  const [msgResp, setMsgResp] = useState<{ cid: string; t: string } | null>(null);
  const [hilosAbiertos, setHilosAbiertos] = useState<Set<string>>(new Set()); // comentarios con todas sus respuestas a la vista
  const [aparte, setAparte] = useState<Set<string>>(new Set()); // comentarios denunciados por este celular (no se le vuelven a mostrar)

  const aplicarVoto = (s: EstadoVoz, opcion: string, resultados: ResultadoVoz): EstadoVoz => ({ ...s, voto: opcion, resultados, participantes: resultados.total });

  const votar = useCallback(async (s: EstadoVoz, opcion: string) => {
    setVotando(true); setErrorVoto("");
    try {
      const r = await fetch("/api/voz", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: s.pregunta.id, opcion, dispositivo: disp.current, dueno: esDueno() }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { guardar(s.pregunta.id, j.opcion); setEstado((x) => (x ? aplicarVoto(x, j.opcion, j.resultados) : x)); }
      else setErrorVoto(j.error || "No se pudo votar. Probá de nuevo.");
    } catch { setErrorVoto("No hay conexión. Probá de nuevo."); }
    setVotando(false);
  }, []);

  useEffect(() => {
    disp.current = idDelCelular();
    let vivo = true;
    fetch(`/api/voz?d=${encodeURIComponent(disp.current)}`, { cache: "no-store" })
      .then((r) => r.json().then((j) => ({ r, j })))
      .then(({ r, j }) => {
        if (!vivo) return;
        if (!r.ok || !j.ok || j.sinPregunta) { setOculta(true); return; }
        const s = j as EstadoVoz;
        setEstado(s);
        // Mi celular de dueño: mi voto no se guarda en el servidor, así que se vuelve a pedir ver los resultados (sin sumar)
        const g = guardada(s.pregunta.id);
        if (!s.voto && g && esDueno() && s.pregunta.opciones.some((o) => o.id === g)) votar(s, g);
      })
      .catch(() => vivo && setOculta(true));
    return () => { vivo = false; };
  }, [votar]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!estado || enviando) return;
    const t = texto.trim();
    if (t.length < 2) { setMsgCom({ ok: false, t: "Escribí tu comentario." }); return; }
    setEnviando(true); setMsgCom(null);
    try {
      const r = await fetch("/api/voz/comentarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: t, dispositivo: disp.current }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        setEstado((x) => (x ? { ...x, comentarios: [j.comentario as ComentarioVoz, ...x.comentarios] } : x));
        setTexto(""); setMsgCom({ ok: true, t: "¡Gracias! Ya se ve tu comentario." });
      } else setMsgCom({ ok: false, t: j.error || "No se pudo enviar. Probá de nuevo." });
    } catch { setMsgCom({ ok: false, t: "No hay conexión. Probá de nuevo." }); }
    setEnviando(false);
  }

  async function enviarRespuesta(e: React.FormEvent, padre: string) {
    e.preventDefault();
    if (!estado || enviandoResp) return;
    const t = textoResp.trim();
    if (t.length < 2) { setMsgResp({ cid: padre, t: "Escribí tu respuesta." }); return; }
    setEnviandoResp(true); setMsgResp(null);
    try {
      const r = await fetch("/api/voz/comentarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: t, dispositivo: disp.current, padre }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        setEstado((x) => (x ? { ...x, comentarios: x.comentarios.map((c) => (c.id === padre ? { ...c, respuestas: [...(c.respuestas ?? []), j.comentario as ComentarioVoz] } : c)) } : x));
        setHilosAbiertos((s) => new Set(s).add(padre)); // se abre el hilo para que se vea la respuesta recién enviada
        setRespondiendo(null); setTextoResp("");
      } else setMsgResp({ cid: padre, t: j.error || "No se pudo enviar. Probá de nuevo." });
    } catch { setMsgResp({ cid: padre, t: "No hay conexión. Probá de nuevo." }); }
    setEnviandoResp(false);
  }

  async function denunciar(cid: string, motivo: string) {
    if (!estado) return;
    setDenunciando(null);
    setAparte((a) => new Set(a).add(cid));
    await fetch("/api/voz/denunciar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pregunta: estado.pregunta.id, cid, motivo, dispositivo: disp.current }) }).catch(() => {});
    setMsgCom({ ok: true, t: "Gracias por avisar. Lo vamos a revisar." });
  }

  if (oculta) return null;
  if (!estado) return <section className="voz" aria-busy="true" aria-label="La Voz de Lomas"><div className="voz-cab"><span className="voz-marca">LA VOZ DE LOMAS</span></div><p className="voz-n">Cargando la pregunta de hoy…</p></section>;

  const { pregunta, voto, resultados, participantes } = estado;
  const comentarios = estado.comentarios.filter((c) => !aparte.has(c.id));
  const lista = verMas ? comentarios : comentarios.slice(0, MAX_VISIBLES);

  // Un comentario o una respuesta: texto, hora, "Responder" (solo en los comentarios, no en las respuestas) y "Denunciar"
  const fila = (c: ComentarioVoz, esRespuesta: boolean) => (
    <>
      <span>{c.texto}</span>
      <div className="voz-meta">
        <small>{hace(c.creado)}</small>
        {denunciando === c.id ? (
          <span className="voz-motivos">
            {MOTIVOS_VOZ.map((m) => <button key={m} onClick={() => denunciar(c.id, m)}>{m}</button>)}
            <button onClick={() => setDenunciando(null)}>Cancelar</button>
          </span>
        ) : (
          <span className="voz-acciones">
            {!esRespuesta && <button className="voz-resp-btn" onClick={() => { setRespondiendo(respondiendo === c.id ? null : c.id); setTextoResp(""); setMsgResp(null); }}>Responder</button>}
            <button className="voz-den" onClick={() => setDenunciando(c.id)}>Denunciar</button>
          </span>
        )}
      </div>
    </>
  );

  return (
    <section className="voz" aria-label="La Voz de Lomas">
      <div className="voz-cab">
        <span className="voz-marca">LA VOZ DE LOMAS</span>
        <span className="voz-dia">Pregunta del día</span>
      </div>
      <h2 className="voz-pregunta">{pregunta.texto}</h2>

      {!voto || !resultados ? (
        <>
          {participantes === 0 && <p className="voz-primero">¡Sé el primero en votar!</p>}
          <div className="voz-opciones">
            {pregunta.opciones.map((o) => (
              <button key={o.id} className="voz-op" disabled={votando} onClick={() => votar(estado, o.id)}>{o.texto}</button>
            ))}
          </div>
          {errorVoto && <p className="voz-error" role="alert">{errorVoto}</p>}
          {participantes > 0 && <p className="voz-n">{participantes === 1 ? "Ya votó 1 vecino" : `Ya votaron ${participantes} vecinos`}. Votá y mirá cómo viene.</p>}
        </>
      ) : (
        <div aria-live="polite">
          {resultados.total === 0 ? (
            <p className="voz-primero">¡Sé el primero en votar!</p>
          ) : (
            <div className="voz-res">
              {pregunta.opciones.map((o) => {
                const r = resultados.opciones.find((x) => x.id === o.id);
                return (
                  <div key={o.id} className={`voz-fila${o.id === voto ? " mia" : ""}`}>
                    <i className="voz-barra" style={{ width: `${r?.pct ?? 0}%` }} />
                    <span>{o.id === voto ? "✓ " : ""}{o.texto}</span>
                    <b>{r?.pct ?? 0}%</b>
                  </div>
                );
              })}
            </div>
          )}
          {resultados.total === 0 ? <p className="voz-n">Todavía no hay votos de otros vecinos.</p> : <p className="voz-guardado">✓ ¡Tu voto ya quedó guardado! {resultados.total === 1 ? "Participó 1 vecino" : `Participaron ${resultados.total} vecinos`}.</p>}
        </div>
      )}

      <div className="voz-com">
        <h3>¿Querés contarnos algo más? (opcional)</h3>
        <form onSubmit={enviar}>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value.slice(0, MAX_COMENTARIO_VOZ))} maxLength={MAX_COMENTARIO_VOZ} rows={2} placeholder="Escribí un comentario corto" aria-label="Tu comentario" />
          <div className="voz-pie">
            <small>{texto.length}/{MAX_COMENTARIO_VOZ} · Sin enlaces ni teléfonos</small>
            {texto.length > 0 && <button className="btn chico" disabled={enviando || texto.trim().length < 2}>{enviando ? "Enviando…" : "Enviar"}</button>}
          </div>
        </form>
        {msgCom && <p className={msgCom.ok ? "voz-ok" : "voz-error"} role="status">{msgCom.t}</p>}

        {lista.length > 0 && (
          <ul className="voz-lista">
            {lista.map((c) => {
              const resp = (c.respuestas ?? []).filter((r) => !aparte.has(r.id));
              const abierto = hilosAbiertos.has(c.id);
              const aMostrar = abierto ? resp : resp.slice(0, RESPUESTAS_VISIBLES);
              return (
                <li key={c.id}>
                  {fila(c, false)}
                  {aMostrar.length > 0 && (
                    <ul className="voz-resp">
                      {aMostrar.map((r) => <li key={r.id}>{fila(r, true)}</li>)}
                    </ul>
                  )}
                  {resp.length > RESPUESTAS_VISIBLES && !abierto && (
                    <button className="voz-mas-resp" onClick={() => setHilosAbiertos((s) => new Set(s).add(c.id))}>
                      Ver {resp.length - RESPUESTAS_VISIBLES} {resp.length - RESPUESTAS_VISIBLES === 1 ? "respuesta más" : "respuestas más"}
                    </button>
                  )}
                  {respondiendo === c.id && (
                    <form className="voz-form-resp" onSubmit={(e) => enviarRespuesta(e, c.id)}>
                      <textarea autoFocus value={textoResp} onChange={(e) => setTextoResp(e.target.value.slice(0, MAX_COMENTARIO_VOZ))} maxLength={MAX_COMENTARIO_VOZ} rows={2} placeholder="Escribí tu respuesta" aria-label="Tu respuesta" />
                      <div className="voz-pie">
                        <small>{textoResp.length}/{MAX_COMENTARIO_VOZ}</small>
                        <span className="voz-botones">
                          <button type="button" className="btn claro chico" onClick={() => { setRespondiendo(null); setMsgResp(null); }}>Cancelar</button>
                          {textoResp.length > 0 && <button className="btn chico" disabled={enviandoResp || textoResp.trim().length < 2}>{enviandoResp ? "Enviando…" : "Enviar"}</button>}
                        </span>
                      </div>
                      {msgResp?.cid === c.id && <p className="voz-error" role="alert">{msgResp.t}</p>}
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {comentarios.length > MAX_VISIBLES && <button className="voz-mas" onClick={() => setVerMas((v) => !v)}>{verMas ? "Ver menos" : `Ver los ${comentarios.length} comentarios`}</button>}
      </div>
    </section>
  );
}
