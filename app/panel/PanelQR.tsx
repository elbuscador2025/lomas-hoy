"use client";
import { useEffect, useRef, useState } from "react";

// Pestaña "Código QR": el QR de la app, para descargar solo (PNG) o armado en un cartel A4 para pegar en comercios.
// Todo se dibuja en el navegador (sin servicios externos). El cartel es solo negro sobre blanco: se imprime bien en blanco y negro.
const URL_APP = "https://lomas-hoy.vercel.app";
const FUENTE = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';

type Matriz = { n: number; oscuro: (f: number, c: number) => boolean };
async function crearMatriz(): Promise<Matriz> {
  const { default: qrcode } = await import("qrcode-generator");
  const qr = qrcode(0, "Q"); // corrección de errores "Q": se lee aunque el papel esté un poco gastado o manchado
  qr.addData(URL_APP); qr.make();
  return { n: qr.getModuleCount(), oscuro: (f, c) => qr.isDark(f, c) };
}

// Dibuja el QR en un cuadrado de `lado` px, con el borde blanco de 4 módulos que pide el estándar. Cada módulo mide una cantidad entera de píxeles (queda nítido).
function dibujarQR(ctx: CanvasRenderingContext2D, m: Matriz, x: number, y: number, lado: number) {
  const total = m.n + 8, p = Math.max(1, Math.floor(lado / total)), real = p * total, x0 = x + Math.floor((lado - real) / 2), y0 = y + Math.floor((lado - real) / 2);
  ctx.fillStyle = "#fff"; ctx.fillRect(x, y, lado, lado);
  ctx.fillStyle = "#000";
  for (let f = 0; f < m.n; f++) for (let c = 0; c < m.n; c++) if (m.oscuro(f, c)) ctx.fillRect(x0 + (c + 4) * p, y0 + (f + 4) * p, p, p);
}

// El logo de Lomas Hoy (la "L" con el sol) en blanco y negro
function dibujarLogo(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const k = s / 512;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = "#000"; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(0, 0, 512, 512, 108); else ctx.rect(0, 0, 512, 512); ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(268, 164, 82, 0, Math.PI * 2); ctx.stroke(); // el sol, de contorno
  ctx.lineWidth = 78; ctx.beginPath(); ctx.moveTo(196, 150); ctx.lineTo(196, 372); ctx.lineTo(324, 372); ctx.stroke(); // la L
  ctx.restore();
}

// Parte el texto en renglones que entren en `ancho`
function renglones(ctx: CanvasRenderingContext2D, texto: string, ancho: number) {
  const out: string[] = []; let actual = "";
  for (const palabra of texto.split(" ")) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > ancho && actual) { out.push(actual); actual = palabra; } else actual = prueba;
  }
  if (actual) out.push(actual);
  return out;
}

// Hoja A4 a 300 puntos por pulgada (2480 x 3508): título grande, QR grande en el centro y el pie con el logo
function armarCartel(m: Matriz) {
  const W = 2480, H = 3508, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#000"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const texto = (t: string, tam: number, peso: number, y: number, ancho = 2200) => {
    ctx.font = `${peso} ${tam}px ${FUENTE}`;
    const ls = renglones(ctx, t, ancho), alto = Math.round(tam * 1.12);
    ls.forEach((l, i) => ctx.fillText(l, W / 2, y + tam + i * alto));
    return y + ls.length * alto + Math.round(tam * 0.1);
  };
  let y = 150;
  y = texto("¡Nueva app de Lomas!", 300, 900, y, 2000);
  y = texto("Escaneá y enterate de todo desde tu celular", 118, 700, y + 40, 1700);
  const lado = 1440, xq = (W - lado) / 2, yq = y + 80;
  dibujarQR(ctx, m, xq, yq, lado);
  ctx.lineWidth = 14; ctx.strokeStyle = "#000"; ctx.strokeRect(xq - 30, yq - 30, lado + 60, lado + 60); // marco negro alrededor del QR
  y = texto("Clima · Farmacias · Guardias · Cobros · Trabajo · y mucho más", 78, 700, yq + lado + 110, 2260);
  // pie: línea negra, logo y nombre
  const yp = y + 100;
  ctx.fillRect(220, yp, W - 440, 12);
  ctx.font = `800 92px ${FUENTE}`;
  const pie = "Lomas Hoy · Gratis, sin registrarte", ancho = ctx.measureText(pie).width, logo = 180, hueco = 50, x0 = (W - (logo + hueco + ancho)) / 2;
  dibujarLogo(ctx, x0, yp + 70, logo);
  ctx.textAlign = "left"; ctx.fillText(pie, x0 + logo + hueco, yp + 70 + logo / 2 + 32);
  if (yp + 70 + logo > H - 120) console.warn("el cartel no entra en la hoja");
  return c;
}

function descargar(canvas: HTMLCanvasElement, nombre: string) {
  canvas.toBlob((b) => {
    if (!b) return;
    const url = URL.createObjectURL(b), a = document.createElement("a");
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, "image/png");
}

export default function PanelQR() {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [m, setM] = useState<Matriz | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { crearMatriz().then(setM).catch(() => setError(true)); }, []);
  useEffect(() => {
    if (!m || !lienzo.current) return;
    const c = lienzo.current, total = m.n + 8, p = Math.ceil(1000 / total);
    c.width = c.height = p * total;
    dibujarQR(c.getContext("2d")!, m, 0, 0, c.width);
  }, [m]);

  function bajarQR() {
    if (!m) return;
    const c = document.createElement("canvas"), total = m.n + 8, p = Math.ceil(2400 / total); // unos 2400 px: sirve para imprimir en grande
    c.width = c.height = p * total;
    dibujarQR(c.getContext("2d")!, m, 0, 0, c.width);
    descargar(c, "qr-lomas-hoy.png");
  }
  return (
    <div className="panel-qr">
      <h2>Código QR de la app</h2>
      <p className="vacio">Lleva a {URL_APP.replace("https://", "")}. Pegalo donde la gente lo pueda escanear con la cámara del celular.</p>
      {error && <p className="error">No se pudo armar el código. Probá de nuevo.</p>}
      <canvas ref={lienzo} className="qr-grande" aria-label="Código QR de Lomas Hoy" />
      <div className="acciones">
        <button className="btn grande-btn" disabled={!m} onClick={bajarQR}>Descargar QR</button>
        <button className="btn grande-btn claro" disabled={!m} onClick={() => m && descargar(armarCartel(m), "cartel-lomas-hoy-A4.png")}>Descargar cartel</button>
      </div>
      <small className="vacio">El QR es una imagen PNG. El cartel es una hoja A4 lista para imprimir, solo en blanco y negro.</small>
    </div>
  );
}
