import { ImageResponse } from "next/og";

// Imagen que se ve al compartir el enlace en Facebook, WhatsApp, etc. Se genera sola al compilar (no cuesta nada).
export const alt = "Lomas Hoy: clima, cortes de luz y agua, farmacias y cobros";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 80px", background: "linear-gradient(180deg, #3A74E6 0%, #1F5AD6 100%)", color: "#fff" }}>
        <div style={{ position: "absolute", top: 70, right: 90, width: 190, height: 190, borderRadius: 95, background: "#FFC83D", display: "flex" }} />
        <div style={{ display: "flex", fontSize: 150, fontWeight: 800, lineHeight: 1 }}>Lomas Hoy</div>
        <div style={{ display: "flex", fontSize: 54, marginTop: 30, maxWidth: 940, lineHeight: 1.25 }}>Clima, cortes de luz y agua, farmacias y cobros.</div>
        <div style={{ display: "flex", fontSize: 54, marginTop: 10, fontWeight: 700, color: "#FFE9A8" }}>Gratis para los vecinos de Lomas</div>
        <div style={{ display: "flex", position: "absolute", bottom: 0, left: 0, width: "100%", height: 38, background: "#7BC96F" }} />
      </div>
    ),
    { ...size },
  );
}
