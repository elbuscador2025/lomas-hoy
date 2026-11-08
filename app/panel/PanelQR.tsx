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

// ---- Cartel A4 a color: parte de arriba azul con el título en blanco; el QR va siempre negro sobre un cuadro blanco (así se escanea bien) ----
const AZUL = "#1F5AD6", AZUL_CLARO = "#3A74E6", AZUL_OSCURO = "#174BB8", AMARILLO = "#FFC83D", TINTA = "#10213F";

function dibujarLogoColor(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const k = s / 512;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  const g = ctx.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, AZUL_CLARO); g.addColorStop(1, AZUL);
  ctx.fillStyle = g; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(0, 0, 512, 512, 108); else ctx.rect(0, 0, 512, 512); ctx.fill();
  ctx.fillStyle = AMARILLO; ctx.beginPath(); ctx.arc(268, 164, 82, 0, Math.PI * 2); ctx.fill(); // el sol
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 78; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(196, 150); ctx.lineTo(196, 372); ctx.lineTo(324, 372); ctx.stroke(); // la L
  ctx.restore();
}

// Íconos redondos de colores (dibujados a mano): clima, farmacias, guardias, cobros y trabajo
function dibujarIcono(ctx: CanvasRenderingContext2D, tipo: "clima" | "farmacia" | "guardia" | "cobro" | "trabajo", cx: number, cy: number, r: number) {
  const colores = { clima: "#FFB703", farmacia: "#1FA855", guardia: "#E53935", cobro: "#FF8F00", trabajo: "#8B5A2B" };
  ctx.save(); ctx.translate(cx, cy);
  ctx.fillStyle = colores[tipo]; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff"; ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (tipo === "clima") { // sol con rayos
    ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = r * 0.1;
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.46, Math.sin(a) * r * 0.46); ctx.lineTo(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66); ctx.stroke(); }
  } else if (tipo === "farmacia") { // cruz
    const t = r * 0.26, l = r * 0.82;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-t / 2, -l / 2, t, l, t / 3) : ctx.rect(-t / 2, -l / 2, t, l); ctx.fill();
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-l / 2, -t / 2, l, t, t / 3) : ctx.rect(-l / 2, -t / 2, l, t); ctx.fill();
  } else if (tipo === "guardia") { // sirena
    ctx.beginPath(); ctx.arc(0, r * 0.12, r * 0.36, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillRect(-r * 0.5, r * 0.16, r * 1.0, r * 0.16);
    ctx.lineWidth = r * 0.09;
    for (const a of [-0.9, 0, 0.9]) { ctx.beginPath(); ctx.moveTo(Math.sin(a) * r * 0.5, -r * 0.2 - Math.cos(a) * r * 0.08); ctx.lineTo(Math.sin(a) * r * 0.7, -r * 0.2 - Math.cos(a) * r * 0.3); ctx.stroke(); }
  } else if (tipo === "cobro") { // signo $
    ctx.font = `900 ${Math.round(r * 1.25)}px ${FUENTE}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("$", 0, r * 0.06);
  } else { // portafolio
    ctx.lineWidth = r * 0.11;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r * 0.2, -r * 0.52, r * 0.4, r * 0.24, r * 0.06) : ctx.rect(-r * 0.2, -r * 0.52, r * 0.4, r * 0.24); ctx.stroke();
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r * 0.48, -r * 0.32, r * 0.96, r * 0.7, r * 0.1) : ctx.rect(-r * 0.48, -r * 0.32, r * 0.96, r * 0.7); ctx.fill();
    ctx.strokeStyle = colores.trabajo; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.moveTo(-r * 0.48, r * 0.0); ctx.lineTo(r * 0.48, r * 0.0); ctx.stroke();
  }
  ctx.restore();
}

function armarCartelColor(m: Matriz) {
  const W = 2480, H = 3508, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  // la parte de arriba, azul de Lomas Hoy
  const lado = 1500, tarjeta = lado + 60, yTarjeta = 1110, alto = yTarjeta + tarjeta / 2;
  const g = ctx.createLinearGradient(0, 0, 0, alto); g.addColorStop(0, AZUL_CLARO); g.addColorStop(1, AZUL_OSCURO);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, alto);
  ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.beginPath(); ctx.arc(-60, 900, 520, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(W + 80, 1250, 560, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = AMARILLO; ctx.beginPath(); ctx.arc(2340, 190, 120, 0, Math.PI * 2); ctx.fill(); // el sol de Lomas Hoy
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#fff";
  const texto = (t: string, tam: number, peso: number, y: number, ancho: number, color: string) => {
    ctx.font = `${peso} ${tam}px ${FUENTE}`; ctx.fillStyle = color;
    const ls = renglones(ctx, t, ancho), al = Math.round(tam * 1.12);
    ls.forEach((l, i) => ctx.fillText(l, W / 2, y + tam + i * al));
    return y + ls.length * al + Math.round(tam * 0.1);
  };
  let y = 130;
  y = texto("¡Nueva app de Lomas!", 280, 900, y, 1750, "#fff");
  texto("Escaneá y enterate de todo desde tu celular", 112, 700, y + 36, 1700, "#fff");
  // el QR: siempre negro sobre un cuadro blanco
  const xt = (W - tarjeta) / 2;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 70; ctx.shadowOffsetY = 24;
  ctx.fillStyle = "#fff"; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(xt, yTarjeta, tarjeta, tarjeta, 70); else ctx.rect(xt, yTarjeta, tarjeta, tarjeta); ctx.fill();
  ctx.restore();
  dibujarQR(ctx, m, xt + 30, yTarjeta + 30, lado);
  // los íconos y la línea de lo que ofrece
  const yi = yTarjeta + tarjeta + 100, r = 82, sep = 250, tipos = ["clima", "farmacia", "guardia", "cobro", "trabajo"] as const;
  tipos.forEach((t, i) => dibujarIcono(ctx, t, W / 2 + (i - 2) * sep, yi + r, r));
  y = texto("Clima · Farmacias · Guardias · Cobros · Trabajo · y mucho más", 72, 800, yi + 2 * r + 36, 2330, TINTA);
  // pie: línea azul, logo a color y nombre
  const yp = y + 60;
  ctx.fillStyle = AZUL; ctx.fillRect(220, yp, W - 440, 12);
  ctx.font = `800 92px ${FUENTE}`;
  const pie = "Lomas Hoy · Gratis, sin registrarte", ancho = ctx.measureText(pie).width, logo = 170, hueco = 50, x0 = (W - (logo + hueco + ancho)) / 2;
  dibujarLogoColor(ctx, x0, yp + 56, logo);
  ctx.textAlign = "left"; ctx.fillStyle = TINTA; ctx.fillText(pie, x0 + logo + hueco, yp + 56 + logo / 2 + 32);
  if (yp + 56 + logo > H - 100) console.warn("el cartel a color no entra en la hoja");
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
        <button className="btn grande-btn claro" disabled={!m} onClick={() => m && descargar(armarCartelColor(m), "cartel-lomas-hoy-A4-color.png")}>Descargar cartel a color</button>
      </div>
      <small className="vacio">El QR es una imagen PNG. El cartel es una hoja A4 lista para imprimir: en blanco y negro, o a color (el QR va siempre negro sobre blanco).</small>
    </div>
  );
}
