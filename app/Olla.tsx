"use client";
import { useEffect, useState } from "react";
import { aBytes, PUBLICA, esIOS, estaInstalada } from "./usePush";

type Cena = { estado: "hay" | "suspendida"; queHay: string; dia: string; hora: string; donde: string };
type Olla = { id: string; nombre: string; direccion: string; abierta: boolean; cena: Cena | null };

// Ollas (merenderos) a las que este celular se anotó. Se guarda solo el código y el nombre de la olla, nada de la persona.
const CLAVE = "lomas-hoy:ollas";
const leerOllas = (): { id: string; nombre: string }[] => { try { const x = JSON.parse(localStorage.getItem(CLAVE) ?? "[]"); return Array.isArray(x) ? x : []; } catch { return []; } };
const guardarOlla = (o: { id: string; nombre: string }) => { try { const l = leerOllas().filter((x) => x.id !== o.id); localStorage.setItem(CLAVE, JSON.stringify([...l, o])); } catch {} };
const hoy = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
const diaLargo = (f: string) => { const t = new Date(f + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }).replace(",", ""); return t.charAt(0).toUpperCase() + t.slice(1); };

async function anotarEnOlla(id: string) {
  if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) || !PUBLICA) throw new Error("Este celular o navegador no permite recibir avisos.");
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") throw new Error("Para recibir los avisos, permití las notificaciones.");
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(PUBLICA) });
    if (!localStorage.getItem("lomas-hoy:push")) localStorage.setItem("lomas-hoy:solo-olla", "1"); // solo la olla: los avisos generales siguen sin activar
  }
  const r = await fetch(`/api/olla/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
  if (r.status === 403) throw new Error("cerrada");
  if (!r.ok) throw new Error("No se pudo anotar. Probá de nuevo.");
}

// Pantalla simple arriba de la principal cuando se llega por el enlace de una olla.
export function OllaEnlace({ id }: { id: string }) {
  const [olla, setOlla] = useState<Olla | null | "no">(null);
  const [ya, setYa] = useState(false);
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [iphoneSinInstalar, setIphoneSinInstalar] = useState(false);

  useEffect(() => {
    setYa(leerOllas().some((x) => x.id === id));
    setIphoneSinInstalar(esIOS() && !estaInstalada());
    fetch(`/api/olla/${id}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => setOlla(j?.olla ?? "no")).catch(() => setOlla("no"));
    // Si la persona agrega la app a la pantalla de inicio desde acá, la app instalada se abre directo en esta olla
    const link = document.querySelector('link[rel="manifest"]');
    if (link) link.setAttribute("href", `/api/manifiesto?olla=${id}`);
  }, [id]);

  if (!olla || olla === "no" || (ya && !hecho)) return olla === "no" ? <section className="olla-enlace"><b>Esta olla no está disponible.</b></section> : null;

  async function recibir() {
    if (olla === null || olla === "no") return;
    setError(""); setOcupado(true);
    try {
      await anotarEnOlla(id);
      guardarOlla({ id, nombre: olla.nombre });
      setHecho(true);
      history.replaceState(null, "", "/");
    } catch (e) {
      const t = (e as Error).message;
      setError(t === "cerrada" ? "La lista de esta olla está cerrada. Pedile a quien la organiza que la abra." : t);
    } finally { setOcupado(false); }
  }

  return (
    <section className="olla-enlace" aria-label="Avisos de la olla">
      <span className="olla-emoji" aria-hidden>🍲</span>
      <h2>{olla.nombre}</h2>
      <p>{olla.direccion}</p>
      {hecho ? <p className="olla-ok" role="status">✅ Listo, te vamos a avisar cuando haya cena</p>
        : !olla.abierta ? <p className="olla-cerrada">La lista de esta olla está cerrada. Pedile a quien la organiza que la abra.</p>
        : iphoneSinInstalar ? (
          <>
            <p><b>En iPhone, para recibir los avisos hay que instalar la app:</b></p>
            <ol className="pasos">
              <li>Tocá el botón <b>Compartir</b> (el cuadrado con una flecha hacia arriba).</li>
              <li>Elegí <b>Agregar a inicio</b> y tocá <b>Agregar</b>.</li>
              <li>Abrí <b>Lomas Hoy</b> desde el ícono nuevo: ahí vas a ver el botón para recibir los avisos de {olla.nombre}.</li>
            </ol>
          </>
        ) : (
          <>
            <button className="btn grande-btn olla-boton" disabled={ocupado} onClick={recibir}>🔔 Recibir avisos de {olla.nombre}</button>
            {error && <p className="error">{error}</p>}
          </>
        )}
    </section>
  );
}

// Cuadro chico en la pantalla principal de quienes se anotaron: la última cena de cada olla. Quien no se anotó no ve nada.
export function CuadrosOlla() {
  const [ollas, setOllas] = useState<Olla[]>([]);
  useEffect(() => {
    const ids = leerOllas();
    Promise.all(ids.map((o) => fetch(`/api/olla/${o.id}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => j?.olla as Olla | undefined).catch(() => undefined)))
      .then((l) => setOllas(l.filter((x): x is Olla => !!x)));
  }, []);
  return (
    <>
      {ollas.map((o) => {
        const c = o.cena, vigente = c && c.estado === "hay" && c.dia >= hoy();
        return (
          <section key={o.id} className="olla-cuadro" aria-label={`Olla ${o.nombre}`}>
            <b>🍲 {o.nombre}</b>
            {vigente ? <><span>{c.queHay}</span><span>{diaLargo(c.dia)} · {c.hora.replace(/^0/, "")} hs</span><span>{c.donde}</span></> : <span>Hoy no hay cena</span>}
          </section>
        );
      })}
    </>
  );
}
