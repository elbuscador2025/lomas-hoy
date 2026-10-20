"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ZONA } from "@/lib/datos";

// "Mis avisos": lo que llegó al celular en los últimos 7 días. Lo guarda el service worker (public/sw.js) en el propio celular.
export type AvisoGuardado = { id: string; t: number; tipo: string; titulo: string; cuerpo: string; url: string };
const CLAVE_VISTO = "lomas-hoy:avisos-visto";
const SIETE_DIAS = 7 * 86400_000;

async function leerLista(): Promise<AvisoGuardado[]> {
  try {
    const r = await (await caches.open("lomas-hoy-avisos")).match("/avisos.json");
    const lista = r ? ((await r.json()) as AvisoGuardado[]) : [];
    return lista.filter((a) => Date.now() - a.t <= SIETE_DIAS).sort((a, b) => b.t - a.t);
  } catch {
    return [];
  }
}
const leerVisto = () => { try { return Number(localStorage.getItem(CLAVE_VISTO)) || 0; } catch { return 0; } };

export function useAvisos() {
  const [lista, setLista] = useState<AvisoGuardado[]>([]);
  const [visto, setVisto] = useState(0);
  const refrescar = useCallback(() => { leerLista().then(setLista); setVisto(leerVisto()); }, []);
  useEffect(() => {
    refrescar();
    const alMensaje = (e: MessageEvent) => { if (e.data?.lomasHoy === "aviso") refrescar(); };
    const alVer = () => { if (document.visibilityState === "visible") refrescar(); };
    navigator.serviceWorker?.addEventListener("message", alMensaje);
    document.addEventListener("visibilitychange", alVer);
    return () => { navigator.serviceWorker?.removeEventListener("message", alMensaje); document.removeEventListener("visibilitychange", alVer); };
  }, [refrescar]);
  const marcarVistos = useCallback(() => {
    try { localStorage.setItem(CLAVE_VISTO, String(Date.now())); } catch {}
    setVisto(Date.now());
  }, []);
  return { lista, sinVer: lista.filter((a) => a.t > visto).length, marcarVistos };
}

const cuando = (t: number) => {
  const dia = (x: number) => new Date(x).toLocaleDateString("en-CA", { timeZone: ZONA });
  const hora = new Date(t).toLocaleTimeString("es-AR", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false });
  if (dia(t) === dia(Date.now())) return `Hoy ${hora} hs`;
  if (dia(t) === dia(Date.now() - 86400_000)) return `Ayer ${hora} hs`;
  return `${new Date(t).toLocaleDateString("es-AR", { timeZone: ZONA, weekday: "long", day: "numeric" })} ${hora} hs`;
};

export default function MisAvisos({ avisos, onConfigurar, onAbrir }: {
  avisos: ReturnType<typeof useAvisos>; onConfigurar: () => void; onAbrir: (url: string) => void;
}) {
  const { lista, marcarVistos } = avisos;
  const vistoAntes = useRef(leerVisto()); // para marcar "Nuevo" lo que llegó desde la última vez
  useEffect(() => { marcarVistos(); }, [marcarVistos]);
  // el resumen de hoy va arriba de todo; después, lo más nuevo primero
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: ZONA });
  const esResumenDeHoy = (a: AvisoGuardado) => a.tipo === "resumen" && new Date(a.t).toLocaleDateString("en-CA", { timeZone: ZONA }) === hoy;
  const resumen = lista.find(esResumenDeHoy);
  const ordenada = resumen ? [resumen, ...lista.filter((a) => a !== resumen)] : lista;
  return (
    <>
      <button className="btn claro ancho" onClick={onConfigurar}>Configurar avisos</button>
      {ordenada.length === 0 ? <p className="vacio">Todavía no tenés avisos. Acá se guardan los de los últimos 7 días.</p> : (
        <ul className="lista">
          {ordenada.map((a) => (
            <li key={a.id}>
              <button className="tarjeta aviso-guardado" onClick={() => onAbrir(a.url)}>
                {a.t > vistoAntes.current && <span className="pildora aviso">Nuevo</span>}
                <b>{a.titulo}</b>
                <span className="texto-aviso">{a.cuerpo}</span>
                <small>{cuando(a.t)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
