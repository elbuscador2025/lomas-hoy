"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { sonidoActivo, guardarSonido } from "../../FeedbackToque";
import { Bicho, IconoBloques, IconoBurbuja, LAMINAS, LaminaSVG } from "./dibujos";
import { SONIDOS, type Sonar } from "./sonidos";
import Pintar from "./Pintar";
import Bloques from "./Bloques";
import Granja from "./Granja";
import Burbujas from "./Burbujas";

// PEQUEÑOS CREATIVOS: juegos para chicos de 2 a 4 años, sin texto, sin datos, sin enlaces.
// "Modo chicos": la pantalla tapa toda la app y el botón Volver del celular no la cierra. Solo sale un adulto, manteniendo apretado el candado 3 segundos.
const SEGUNDOS_SALIDA = 3;

export type { Sonar };
type Pantalla = { tipo: "menu" } | { tipo: "pintar"; modo: "libre" | "colorear" } | { tipo: "bloques" } | { tipo: "granja" } | { tipo: "burbujas" };
const Pincel = () => (
  <svg viewBox="0 0 100 100" aria-hidden><path d="M20 80 Q28 60 44 62 Q46 78 20 80 Z" fill="#E53935" stroke="#10213F" strokeWidth="4" strokeLinejoin="round" /><path d="M44 62 L84 18 Q92 12 90 22 L52 70 Z" fill="#FFC400" stroke="#10213F" strokeWidth="4" strokeLinejoin="round" /></svg>
);
const ICONO_FLOR = { 0: "#8BC34A", 1: "#8BC34A", 2: "#FF8A00", 3: "#F06292", 4: "#F06292", 5: "#F06292", 6: "#F06292", 7: "#F06292", 8: "#F06292", 9: "#FFC400" };

export default function Peques({ onSalir }: { onSalir?: () => void }) {
  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: "menu" });
  const [sonido, setSonido] = useState(true);
  const [reteniendo, setReteniendo] = useState(false);
  const atrasBloques = useRef<(() => void) | null>(null); // dentro de Bloques, el 🏠 de la barra vuelve a elegir dibujo
  const bloqueado = useRef(true), apilados = useRef(0), espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setSonido(sonidoActivo()), []);
  const sonar = useCallback((s: Sonar) => { if (sonidoActivo()) SONIDOS[s](); }, []);

  // Botón Volver del celular: no hace nada. Se deja una entrada de más en el historial y, cada vez que se la usa, se vuelve a poner.
  useEffect(() => {
    const apilar = () => { history.pushState({ lomasHoy: "juego-peques" }, ""); apilados.current++; };
    apilar();
    const alVolver = () => { if (bloqueado.current) { apilados.current--; apilar(); } };
    const primerToque = () => { document.removeEventListener("pointerdown", primerToque, true); if (bloqueado.current) apilar(); }; // una entrada más, ya con un toque real (Chrome ignora las que se crean sin tocar)
    window.addEventListener("popstate", alVolver);
    document.addEventListener("pointerdown", primerToque, true);
    // Pantalla completa (si el navegador lo permite) y sin menú contextual ni selección
    const pantallaCompleta = () => { try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch {} };
    document.addEventListener("pointerup", pantallaCompleta, { once: true });
    const sinMenu = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", sinMenu);
    document.body.classList.add("pq-activo");
    return () => {
      window.removeEventListener("popstate", alVolver);
      document.removeEventListener("pointerdown", primerToque, true);
      document.removeEventListener("pointerup", pantallaCompleta);
      document.removeEventListener("contextmenu", sinMenu);
      document.body.classList.remove("pq-activo");
      try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch {}
    };
  }, []);

  // Salida de adultos: mantener apretado el candado 3 segundos
  const empezarSalida = () => {
    setReteniendo(true);
    espera.current = setTimeout(() => {
      bloqueado.current = false;
      if (onSalir) history.go(-(apilados.current + 1)); // saca las entradas del historial y vuelve a donde estaba
      else history.back();
    }, SEGUNDOS_SALIDA * 1000);
  };
  const cancelarSalida = () => { setReteniendo(false); if (espera.current) clearTimeout(espera.current); espera.current = null; };
  useEffect(() => () => { if (espera.current) clearTimeout(espera.current); }, []);

  const enMenu = pantalla.tipo === "menu";
  const opcion = (p: Pantalla, hijo: React.ReactNode, etiqueta: string) => (
    <button className="pq-gran" aria-label={etiqueta} onPointerDown={(e) => { e.preventDefault(); sonar("pop"); setPantalla(p); }}>{hijo}</button>
  );
  return (
    <div className="pq" onContextMenu={(e) => e.preventDefault()}>
      <div className="pq-barra">
        {!enMenu
          ? <button className="pq-casa" aria-label="Inicio" onPointerDown={(e) => { e.preventDefault(); sonar("toque"); if (atrasBloques.current) atrasBloques.current(); else setPantalla({ tipo: "menu" }); }}>🏠</button>
          : <span className="pq-casa vacio" />}
        <span className="pq-espacio" />
        <button className="pq-casa" aria-label={sonido ? "Silenciar" : "Activar sonido"} onPointerDown={(e) => { e.preventDefault(); const v = !sonido; setSonido(v); guardarSonido(v); if (v) SONIDOS.toque(); }}>{sonido ? "🔊" : "🔇"}</button>
        <button className={`pq-candado ${reteniendo ? "reteniendo" : ""}`} aria-label="Salir (solo adultos): mantené apretado 3 segundos"
          onPointerDown={(e) => { e.preventDefault(); empezarSalida(); }} onPointerUp={cancelarSalida} onPointerLeave={cancelarSalida} onPointerCancel={cancelarSalida}>
          <svg viewBox="0 0 44 44" aria-hidden><circle cx="22" cy="22" r="19" className="pista" /><circle cx="22" cy="22" r="19" className="avance" /></svg>
          <span aria-hidden>🔒</span>
        </button>
      </div>

      <div className="pq-cuerpo">
        {enMenu && (
          <>
            <div className="pq-menu">
              {opcion({ tipo: "pintar", modo: "libre" }, <Pincel />, "Pintar")}
              {opcion({ tipo: "pintar", modo: "colorear" }, <LaminaSVG lamina={LAMINAS[0]} rellenos={ICONO_FLOR} onToque={() => {}} />, "Colorear")}
              {opcion({ tipo: "bloques" }, <IconoBloques />, "Bloques")}
              {opcion({ tipo: "granja" }, <Bicho id="vaca" />, "La Granja")}
              {opcion({ tipo: "burbujas" }, <IconoBurbuja />, "Burbujas")}
            </div>
            <p className="pq-adultos">Adultos: para salir, mantené apretado el 🔒 durante 3 segundos.</p>
          </>
        )}
        {pantalla.tipo === "pintar" && <Pintar key={pantalla.modo} modo={pantalla.modo} sonar={sonar} />}
        {pantalla.tipo === "bloques" && <Bloques sonar={sonar} atras={atrasBloques} />}
        {pantalla.tipo === "granja" && <Granja sonar={sonar} />}
        {pantalla.tipo === "burbujas" && <Burbujas sonar={sonar} />}
      </div>
    </div>
  );
}
