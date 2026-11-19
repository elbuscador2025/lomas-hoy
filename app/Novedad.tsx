"use client";
import { useEffect, useRef, useState } from "react";
import { TITULO_NOVEDAD, SEGUNDOS_NOVEDAD, destinoDe, type NovedadPublica } from "@/lib/novedad-comun";

const CLAVE_VISTO = "lomas-hoy:novedad-visto"; // ID del último aviso que este celular ya vio
const ESPERA_MS = 1500; // se muestra un ratito después de que la app terminó de cargar

// El cartel en sí (lo usa la app y la vista previa del panel). Solo el cartelito recibe toques: lo de alrededor sigue funcionando.
export function CartelNovedad({ texto, hayEnlace, saliendo, onTocar, onCerrar }: { texto: string; hayEnlace: boolean; saliendo?: boolean; onTocar?: () => void; onCerrar?: () => void }) {
  const y0 = useRef<number | null>(null);
  return (
    <div
      className={`novedad-cartel${saliendo ? " saliendo" : ""}`} role="status" aria-live="polite"
      onTouchStart={(e) => { y0.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => { if (y0.current != null && e.changedTouches[0].clientY - y0.current < -30) onCerrar?.(); y0.current = null; }}
    >
      <button className="novedad-cuerpo" onClick={onTocar} disabled={!onTocar}>
        <b className="novedad-titulo">{TITULO_NOVEDAD}</b>
        <span className="novedad-texto">{texto}</span>
        {hayEnlace && <span className="novedad-invita">Tocá acá para entrar y probarlo</span>}
      </button>
      <button className="novedad-x" aria-label="Cerrar el aviso" onClick={onCerrar}>✕</button>
    </div>
  );
}

// Aviso de novedades: aparece arriba, 6 segundos, una sola vez por celular (por cada aviso nuevo). Sin aviso activo no muestra nada.
export default function Novedad() {
  const [n, setN] = useState<NovedadPublica | null>(null);
  const [fase, setFase] = useState<"oculto" | "visible" | "saliendo">("oculto");
  const timer = useRef<number | undefined>(undefined);
  const salida = useRef<number | undefined>(undefined);

  useEffect(() => {
    let vivo = true;
    const cuando = new Promise<void>((ok) => { const f = () => window.setTimeout(ok, ESPERA_MS); if (document.readyState === "complete") f(); else window.addEventListener("load", f, { once: true }); });
    const datos: Promise<Partial<NovedadPublica>> = fetch("/api/novedad").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    Promise.all([datos, cuando]).then(([x]) => {
      if (!vivo || !x?.id || !x?.texto) return;
      let visto: string | null = null;
      try { visto = localStorage.getItem(CLAVE_VISTO); } catch {}
      if (visto === x.id) return; // este aviso ya se mostró en este celular
      try { localStorage.setItem(CLAVE_VISTO, x.id); } catch {}
      setN({ id: x.id, texto: x.texto, enlace: x.enlace ?? "" }); setFase("visible");
      timer.current = window.setTimeout(() => cerrar(), SEGUNDOS_NOVEDAD * 1000);
    });
    return () => { vivo = false; window.clearTimeout(timer.current); window.clearTimeout(salida.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cerrar() {
    window.clearTimeout(timer.current);
    setFase((f) => (f === "visible" ? "saliendo" : f));
    salida.current = window.setTimeout(() => setFase("oculto"), 380); // después de la animación de salida
  }
  function tocar() {
    const d = n?.enlace ? destinoDe(n.enlace, location.origin) : null;
    cerrar();
    if (!d) return;
    if (d.tipo === "url") window.open(d.url, "_blank", "noopener,noreferrer");
    else window.dispatchEvent(new CustomEvent("lomas:abrir", { detail: d.vista })); // Inicio abre la sección
  }

  if (!n || fase === "oculto") return null;
  return (
    <div className="novedad" aria-label="Novedades de Lomas Hoy">
      <CartelNovedad texto={n.texto} hayEnlace={!!destinoDe(n.enlace ?? "", location.origin)} saliendo={fase === "saliendo"} onTocar={destinoDe(n.enlace ?? "", location.origin) ? tocar : cerrar} onCerrar={cerrar} />
    </div>
  );
}
