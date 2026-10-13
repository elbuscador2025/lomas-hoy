"use client";
import { useEffect, useRef, useState } from "react";

const VIDEO = "/presentacion/lomas-hoy-presentacion.mp4";
const NOMBRE = "Lomas Hoy - presentación.mp4";

export default function VideoPresentacion() {
  // El video se baja por adelantado para poder abrir el menú de compartir en el mismo toque (los celulares lo exigen)
  const archivo = useRef<File | null>(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let vivo = true;
    fetch(VIDEO).then((r) => r.blob()).then((b) => { if (vivo) archivo.current = new File([b], NOMBRE, { type: "video/mp4" }); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  async function compartir() {
    setAviso("");
    const f = archivo.current;
    try {
      if (f && navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], title: "Lomas Hoy", text: "Lomas Hoy: todo lo que pasa hoy en Lomas, en una pantalla" });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // la persona cerró el menú
    }
    // Si el celular no permite compartir el video, se comparte el enlace de esta página por WhatsApp
    window.open(`https://wa.me/?text=${encodeURIComponent(`Mirá Lomas Hoy, todo lo que pasa hoy en Lomas, en una pantalla:\n${location.href}`)}`, "_blank");
  }

  return (
    <main className="wrap">
      <h1>Lomas Hoy</h1>
      <p className="vacio">Todo lo que pasa hoy en Lomas, en una pantalla.</p>
      <video className="video-presentacion" src={VIDEO} poster="/presentacion/portada.jpg" controls playsInline preload="metadata" />
      <button className="btn ancho grande-btn" onClick={compartir}>Compartir</button>
      {aviso && <p className="vacio">{aviso}</p>}
      <a className="btn claro ancho grande-btn" href={VIDEO} download={NOMBRE}>Descargar video</a>
      <p className="chico">Herramienta ciudadana independiente. No es una aplicación oficial del Municipio.</p>
    </main>
  );
}
