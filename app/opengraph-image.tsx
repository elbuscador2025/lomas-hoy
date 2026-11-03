import { ImageResponse } from "next/og";

// Imagen que se ve al compartir el enlace en Facebook, WhatsApp, etc. Se genera sola al compilar (no cuesta nada).
// Todo lo importante está en el cuadrado central de 630 x 630 (zona segura): los celulares recortan los costados. Los costados son solo decoración.
export const alt = "Lomas Hoy: gratis para los vecinos de Lomas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#1F5AD6", color: "#fff", position: "relative" }}>
        {/* decoración de los costados (se puede cortar) */}
        <div style={{ position: "absolute", top: -90, left: -90, width: 330, height: 330, borderRadius: 165, background: "#3A74E6", display: "flex" }} />
        <div style={{ position: "absolute", top: 60, right: 50, width: 150, height: 150, borderRadius: 75, background: "#FFC83D", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -120, right: -80, width: 360, height: 360, borderRadius: 180, background: "#174BB8", display: "flex" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 240, height: 34, background: "#7BC96F", display: "flex" }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 240, height: 34, background: "#7BC96F", display: "flex" }} />
        {/* zona segura */}
        <div style={{ display: "flex" }}>
          <svg width="230" height="230" viewBox="0 0 512 512">
            <rect x="12" y="12" width="488" height="488" rx="110" fill="#2B66DE" stroke="#FFFFFF" strokeWidth="24" />
            <circle cx="268" cy="164" r="82" fill="#FFC83D" />
            <path d="M196 150V372H324" fill="none" stroke="#FFFFFF" strokeWidth="78" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 108, fontWeight: 800, lineHeight: 1, marginTop: 34 }}>Lomas Hoy</div>
        <div style={{ display: "flex", fontSize: 35, marginTop: 24, width: 600, textAlign: "center", justifyContent: "center", lineHeight: 1.2, color: "#FFE9A8" }}>Gratis para los vecinos de Lomas</div>
      </div>
    ),
    { ...size },
  );
}
