// CARRERA DE AUTOPISTA (vista desde la cabina): el dibujo. La foto de la cabina va completa; arriba de ella se animan las rayas de la ruta, el tráfico y los postes.
// Todo se dibuja en las medidas de la foto (941 x 1672) y después se acomoda a la pantalla.
import { ZJ, LARGO, type Coche } from "./pista";
import { IMG_W, IMG_H, encajar } from "./cabina";

export type Escena = { pos: number; x: number; vel: number; volante: number; tiempo: number; dist: number; inv: number; flash: number; sacudida: number; coches: Coche[]; acel: boolean; freno: boolean };
export type Dibujo = { cambiarTam: (w: number, h: number) => void; calidad: (n: number) => void; dibujar: (e: Escena) => void };

// ---- La ruta de la foto: dónde está la línea blanca izquierda, la de rayas del medio y la derecha en cada fila de la imagen ----
const yIzq = (y: number) => 19 + (588 - y) * 3.3;
const yMed = (y: number) => 304 + (648 - y) * 0.83;
const TABLA_DER: [number, number][] = [[456, 526], [468, 528], [480, 530], [492, 539], [504, 550], [516, 563], [528, 576], [540, 590], [552, 603], [600, 660], [696, 773]];
function yDer(y: number) {
  const t = TABLA_DER, n = t.length;
  if (y <= t[0][0]) return t[0][1] + (y - t[0][0]) * ((t[1][1] - t[0][1]) / (t[1][0] - t[0][0]));
  if (y >= t[n - 1][0]) return t[n - 1][1] + (y - t[n - 1][0]) * ((t[n - 1][1] - t[n - 2][1]) / (t[n - 1][0] - t[n - 2][0]));
  for (let i = 1; i < n; i++) if (y <= t[i][0]) { const p = (y - t[i - 1][0]) / (t[i][0] - t[i - 1][0]); return t[i - 1][1] + (t[i][1] - t[i - 1][1]) * p; }
  return t[n - 1][1];
}
// posición en la imagen de un punto de la ruta: w = -1 línea izquierda, 0 rayas del medio, 1 línea derecha (el carril derecho es el 0.5 y el izquierdo el -0.5)
const lineaX = (w: number, y: number) => { const c = yMed(y); return w <= 0 ? c + w * (c - yIzq(y)) : c + w * (yDer(y) - c); };

const Y_HOR = 466, Y_REF = 800, D0 = 520, R_MAX = 15000; // horizonte, dónde "termina" la ruta abajo, suavidad de la perspectiva, hasta dónde se ve el tráfico
const yDeR = (r: number) => Y_HOR + (Y_REF - Y_HOR) * (D0 / (r + D0));
const X_CAM = 0.5; // la foto está sacada desde el carril derecho
const Y_TECHO = 150, Y_ABAJO = 772;
// borde del parabrisas (en la imagen): por arriba el techo, a la izquierda el parante, abajo el capó
const PARABRISAS: [number, number][] = [[0, 150], [941, 156], [941, 718], [880, 718], [800, 708], [720, 706], [600, 713], [480, 705], [360, 708], [320, 716], [240, 721], [160, 725], [120, 733], [80, 745], [48, 768], [0, 590]];
const COLORES = ["#c0392b", "#2c6fbb", "#dcdcdc", "#26262c", "#e0a800", "#2f8f5b", "#7f8c9a", "#8e44ad"];
const COLORES_CAJA = ["#eef1f4", "#c9d3dd", "#3b6fb6", "#c04a3a", "#d9a82e", "#e8e8e8", "#7d8a99", "#2f8f5b"];
const SEP_POSTES = 2400, LARGO_RAYA = 1100, SEP_RAYA = 4500;

const oscurecer = (hex: string, f: number) => { const n = parseInt(hex.slice(1), 16); const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; };
const relativo = (z: number, zJ: number) => { let r = ((z - zJ) % LARGO + LARGO) % LARGO; if (r > LARGO / 2) r -= LARGO; return r; };

export function crearDibujo(ctx: CanvasRenderingContext2D, img: CanvasImageSource): Dibujo {
  let cw = 300, ch = 500, escala = 1, paso = 3;
  // la foto repetida en espejo a los costados: así, al correrse el paisaje, no quedan huecos
  const ancho = document.createElement("canvas");
  ancho.width = IMG_W * 3; ancho.height = Y_ABAJO - Y_TECHO;
  {
    const c = ancho.getContext("2d")!;
    c.drawImage(img, 0, Y_TECHO, IMG_W, ancho.height, IMG_W, 0, IMG_W, ancho.height);
    c.save(); c.translate(IMG_W, 0); c.scale(-1, 1); c.drawImage(img, 0, Y_TECHO, IMG_W, ancho.height, 0, 0, IMG_W, ancho.height); c.restore();
    c.save(); c.translate(IMG_W * 3, 0); c.scale(-1, 1); c.drawImage(img, 0, Y_TECHO, IMG_W, ancho.height, 0, 0, IMG_W, ancho.height); c.restore();
  }
  const camino = new Path2D();
  PARABRISAS.forEach(([x, y], i) => (i ? camino.lineTo(x, y) : camino.moveTo(x, y)));
  camino.closePath();
  // la cabina sola (la foto con el parabrisas transparente): se dibuja encima de la ruta, así no hace falta recortar en cada cuadro (en celulares lentos el recorte es muy pesado)
  const marco = document.createElement("canvas");
  marco.width = IMG_W; marco.height = IMG_H;
  {
    const c = marco.getContext("2d")!;
    c.drawImage(img, 0, 0, IMG_W, IMG_H);
    c.globalCompositeOperation = "destination-out"; c.fill(camino);
  }
  let kmhMostrado = 0;

  function rr(x: number, y: number, w: number, h: number, r: number) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // auto visto de atrás. (cx, yb) = centro de abajo; W = ancho
  function auto(cx: number, yb: number, W: number, color: string, frena: boolean) {
    const H = W * 0.8;
    ctx.fillStyle = "rgba(0,0,0,.38)"; ctx.beginPath(); ctx.ellipse(cx, yb, W * 0.58, Math.max(1, W * 0.07), 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#101114"; ctx.fillRect(cx - W * 0.48, yb - H * 0.2, W * 0.16, H * 0.2); ctx.fillRect(cx + W * 0.32, yb - H * 0.2, W * 0.16, H * 0.2);
    ctx.fillStyle = oscurecer(color, 0.82); rr(cx - W / 2, yb - H * 0.62, W, H * 0.46, W * 0.07); ctx.fill();
    ctx.fillStyle = color; rr(cx - W / 2, yb - H * 0.62, W, H * 0.36, W * 0.07); ctx.fill();
    ctx.fillStyle = oscurecer(color, 0.9); ctx.beginPath(); ctx.moveTo(cx - W * 0.43, yb - H * 0.6); ctx.lineTo(cx - W * 0.32, yb - H); ctx.lineTo(cx + W * 0.32, yb - H); ctx.lineTo(cx + W * 0.43, yb - H * 0.6); ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(0, yb - H, 0, yb - H * 0.6); g.addColorStop(0, "#35516b"); g.addColorStop(1, "#16212c");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - W * 0.37, yb - H * 0.63); ctx.lineTo(cx - W * 0.28, yb - H * 0.95); ctx.lineTo(cx + W * 0.28, yb - H * 0.95); ctx.lineTo(cx + W * 0.37, yb - H * 0.63); ctx.closePath(); ctx.fill();
    ctx.fillStyle = frena ? "#ff3b30" : "#b3141c"; ctx.fillRect(cx - W * 0.47, yb - H * 0.5, W * 0.22, H * 0.1); ctx.fillRect(cx + W * 0.25, yb - H * 0.5, W * 0.22, H * 0.1);
    ctx.fillStyle = "#e9e9e2"; ctx.fillRect(cx - W * 0.13, yb - H * 0.36, W * 0.26, H * 0.1);
    ctx.fillStyle = "#17181c"; ctx.fillRect(cx - W * 0.5, yb - H * 0.22, W, H * 0.07);
  }
  // camión de carga visto de atrás
  function camion(cx: number, yb: number, W: number, color: string, frena: boolean) {
    const H = W * 1.5;
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(cx, yb, W * 0.6, Math.max(1, W * 0.06), 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#0f1013"; ctx.fillRect(cx - W * 0.5, yb - H * 0.16, W * 0.2, H * 0.16); ctx.fillRect(cx + W * 0.3, yb - H * 0.16, W * 0.2, H * 0.16);
    ctx.fillStyle = color; ctx.fillRect(cx - W / 2, yb - H, W, H * 0.8);
    ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(cx - W / 2, yb - H, W, H * 0.05);
    ctx.fillStyle = "rgba(0,0,0,.14)"; ctx.fillRect(cx, yb - H, W / 2, H * 0.8);
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(cx - Math.max(0.5, W * 0.01), yb - H * 0.97, Math.max(1, W * 0.02), H * 0.74);
    ctx.fillStyle = "#26272c"; ctx.fillRect(cx - W / 2, yb - H * 0.22, W, H * 0.07);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? "#e8e8e8" : "#d6262e"; ctx.fillRect(cx - W / 2 + (W / 8) * i, yb - H * 0.2, W / 8, H * 0.035); }
    ctx.fillStyle = frena ? "#ff3b30" : "#b3141c"; ctx.fillRect(cx - W * 0.48, yb - H * 0.3, W * 0.13, H * 0.06); ctx.fillRect(cx + W * 0.35, yb - H * 0.3, W * 0.13, H * 0.06);
    ctx.fillStyle = "#1b1c20"; ctx.fillRect(cx - W * 0.46, yb - H * 0.12, W * 0.07, H * 0.1); ctx.fillRect(cx + W * 0.39, yb - H * 0.12, W * 0.07, H * 0.1);
  }

  function dibujar(e: Escena) {
    const { k, ox, oy } = encajar(cw, ch);
    const amp = e.sacudida * 7 + (e.vel / 11000) ** 2 * 1.3; // temblor: fuerte al chocar, leve al ir rápido
    const tx = (Math.random() - 0.5) * amp, ty = (Math.random() - 0.5) * amp;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingQuality = "low"; // sin suavizado pesado: la foto se achica en cada cuadro
    ctx.fillStyle = "#05060F"; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const s = escala * k;
    ctx.setTransform(s, 0, 0, s, (ox + tx) * escala, (oy + ty) * escala);

    const vp = e.vel / 11000, zP = e.pos + ZJ;
    // movimientito de la ruta (nunca se ve recta del todo) + el corrimiento del paisaje al mover el volante
    const camara = e.x + Math.sin(e.tiempo * 0.9) * 0.02 * vp + Math.sin(e.tiempo * 2.3) * 0.008 * vp;
    const dl = camara - X_CAM;
    const corr = (y: number) => { // cuánto se corre cada fila de la imagen hacia los costados (abajo mucho, en el horizonte poco, en el cielo casi nada)
      const yy = Math.max(y, Y_HOR);
      const base = -dl * (yDer(yy) - yIzq(yy)) / 2;
      return y >= Y_HOR ? base : base * (0.25 + 0.75 * Math.max(0, (y - Y_TECHO) / (Y_HOR - Y_TECHO)));
    };
    for (let y = Y_TECHO; y < Y_ABAJO; y += paso) {
      const sh = Math.max(-IMG_W + 20, Math.min(IMG_W - 20, corr(y + paso / 2)));
      const h = Math.min(paso + 1, Y_ABAJO - y);
      ctx.drawImage(ancho, IMG_W - sh, y - Y_TECHO, IMG_W, h, 0, y, IMG_W, h);
    }
    // rayas de la ruta que avanzan hacia el conductor
    const m = ((zP % SEP_RAYA) + SEP_RAYA) % SEP_RAYA;
    ctx.fillStyle = "rgba(244,244,238,.93)";
    for (let i = 0; i < 6; i++) {
      const r0 = Math.max(90, i * SEP_RAYA - m), r1 = i * SEP_RAYA - m + LARGO_RAYA;
      if (r1 < 90 || r0 > R_MAX) continue;
      const ya = yDeR(Math.min(r1, R_MAX)), yb = yDeR(r0);
      const ca = lineaX(0, ya) + corr(ya), cb = lineaX(0, yb) + corr(yb);
      const wa = 0.04 * (yDer(ya) - yIzq(ya)) / 2, wb = 0.04 * (yDer(yb) - yIzq(yb)) / 2;
      ctx.beginPath(); ctx.moveTo(ca - wa / 2, ya); ctx.lineTo(ca + wa / 2, ya); ctx.lineTo(cb + wb / 2, yb); ctx.lineTo(cb - wb / 2, yb); ctx.closePath(); ctx.fill();
    }
    // postes de la banquina y tráfico, del más lejano al más cercano
    const cosas: { r: number; f: () => void }[] = [];
    const mp = ((zP % SEP_POSTES) + SEP_POSTES) % SEP_POSTES;
    for (let i = 0; i < 7; i++) {
      const r = i * SEP_POSTES - mp + 150;
      if (r < 90 || r > R_MAX) continue;
      cosas.push({ r, f: () => {
        const y = yDeR(r), u = (yDer(y) - yIzq(y)) / 2;
        for (const w of [-1.17, 1.17]) {
          const cx = lineaX(w, y) + corr(y), pw = Math.max(1, u * 0.045), ph = u * 0.3;
          ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(cx - pw * 0.7, y - 0.5, pw * 1.6, Math.max(1, pw * 0.4));
          ctx.fillStyle = "#f1f1ec"; ctx.fillRect(cx - pw / 2, y - ph, pw, ph);
          ctx.fillStyle = "#e8742a"; ctx.fillRect(cx - pw / 2, y - ph * 0.8, pw, ph * 0.18);
        }
      } });
    }
    for (const c of e.coches) {
      const r = relativo(c.z, zP);
      if (r < 60 || r > R_MAX) continue;
      const ci = c.color % 8, lento = c.vel < e.vel * 0.7 && e.freno;
      cosas.push({ r, f: () => {
        const y = yDeR(r), cx = lineaX(c.x, y) + corr(y);
        const W = Math.abs(lineaX(c.x + c.ancho / 2, y) - lineaX(c.x - c.ancho / 2, y));
        if (W < 1.5) return;
        if (c.tipo === "camion") camion(cx, y, W, COLORES_CAJA[ci], lento); else auto(cx, y, W, COLORES[ci], lento);
      } });
    }
    cosas.sort((a, b) => b.r - a.r);
    for (const c of cosas) c.f();
    if (e.flash > 0) { ctx.fillStyle = `rgba(255,40,30,${Math.min(0.5, e.flash * 0.5)})`; ctx.fillRect(0, Y_TECHO, IMG_W, Y_ABAJO - Y_TECHO); }
    if (e.inv > 0 && Math.floor(e.tiempo * 6) % 2 === 0) { ctx.strokeStyle = "rgba(255,200,40,.75)"; ctx.lineWidth = 8; ctx.strokeRect(4, Y_TECHO + 4, IMG_W - 8, Y_ABAJO - Y_TECHO - 8); }
    ctx.drawImage(marco, 0, 0, IMG_W, IMG_H);

    // velocímetro digital del tablero: muestra la velocidad real
    kmhMostrado = Math.round(vp * 105);
    ctx.fillStyle = "#EAF2FF"; ctx.textBaseline = "alphabetic";
    ctx.font = "600 27px system-ui, sans-serif"; ctx.fillText(String(kmhMostrado), 294, 1026);
    const wTxt = ctx.measureText(String(kmhMostrado)).width;
    ctx.font = "600 13px system-ui, sans-serif"; ctx.fillText("km/h", 294 + wTxt + 3, 1026);
  }

  return {
    cambiarTam(w, h) { cw = w; ch = h; escala = ctx.canvas.width / Math.max(1, w); },
    calidad(n) { paso = [2, 3, 5][n] ?? 3; },
    dibujar,
  };
}
