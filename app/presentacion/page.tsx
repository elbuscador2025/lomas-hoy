import type { Metadata } from "next";
import VideoPresentacion from "./VideoPresentacion";

// Página aparte para mostrar el video de presentación. No está enlazada desde la app ni aparece en buscadores:
// solo la abre quien tenga el enlace.
export const metadata: Metadata = {
  title: "Lomas Hoy – presentación",
  robots: { index: false, follow: false, nocache: true },
};

export default function Pagina() {
  return <VideoPresentacion />;
}
