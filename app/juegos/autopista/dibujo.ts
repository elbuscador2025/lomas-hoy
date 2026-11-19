// CARRERA DE AUTOPISTA: el dibujo. Todo se hace con el lienzo 2D del navegador y está dibujado por código (sin imágenes):
// cielo con degradé, sol y luna, montañas que se mueven más lento, ruta con curvas y franjas, árboles y carteles, tráfico, el camión, velocidad y viñeta.
import { SEG, N, ANCHO, ALTO_CAM, PROF, V_MAX, type Tramo, type Coche } from "./pista";

export type Escena = {
  pos: number; x: number; vel: number; volante: number; tiempo: number; dist: number; inv: number; flash: number; sacudida: number;
  coches: Coche[]; acel: boolean; freno: boolean;
};
export type Dibujo = { cambiarTam: (w: number, h: number) => void; dibujar: (e: Escena) => void; calidad: (n: number) => void; ambiente: (tiempo: number) => string };

type RGB = [number, number, number];
type Paleta = { cielo: [RGB, RGB]; sol: RGB; solY: number; monta: [RGB, RGB]; pasto: [RGB, RGB]; rumble: [RGB, RGB]; ruta: [RGB, RGB]; linea: RGB; niebla: RGB; noche: number; nombre: string };
// 3 ambientes: día, tarde y noche (cambian solos cada 40 segundos, con una transición suave)
const PALETAS: Paleta[] = [
  { nombre: "día", cielo: [[84, 168, 238], [196, 232, 252]], sol: [255, 244, 176], solY: 0.2, monta: [[96, 134, 178], [66, 112, 104]], pasto: [[66, 164, 78], [56, 148, 68]], rumble: [[214, 48, 48], [242, 242, 242]], ruta: [[96, 100, 108], [88, 92, 100]], linea: [244, 244, 244], niebla: [196, 232, 252], noche: 0 },
  { nombre: "tarde", cielo: [[74, 62, 150], [255, 172, 92]], sol: [255, 208, 124], solY: 0.62, monta: [[116, 72, 116], [84, 58, 94]], pasto: [[92, 134, 62], [80, 120, 54]], rumble: [[206, 52, 44], [250, 232, 214]], ruta: [[104, 92, 100], [94, 84, 94]], linea: [250, 236, 214], niebla: [255, 182, 112], noche: 0.12 },
  { nombre: "noche", cielo: [[6, 10, 36], [36, 44, 104]], sol: [236, 242, 255], solY: 0.24, monta: [[20, 28, 60], [14, 20, 46]], pasto: [[22, 62, 44], [18, 52, 36]], rumble: [[160, 34, 34], [176, 176, 188]], ruta: [[56, 58, 70], [48, 50, 62]], linea: [206, 206, 218], niebla: [24, 30, 78], noche: 1 },
];
const CICLO = 40, TRANS = 6;
const mez = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
function paletaEn(t: number): Paleta {
  const i = Math.floor(t / CICLO) % 3, j = (i + 1) % 3, f = Math.max(0, (t % CICLO) - (CICLO - TRANS)) / TRANS, a = PALETAS[i], b = PALETAS[j];
  if (f <= 0) return a;
  const m = (x: RGB, y: RGB) => mez(x, y, f);
  return { nombre: a.nombre, cielo: [m(a.cielo[0], b.cielo[0]), m(a.cielo[1], b.cielo[1])], sol: m(a.sol, b.sol), solY: a.solY + (b.solY - a.solY) * f, monta: [m(a.monta[0], b.monta[0]), m(a.monta[1], b.monta[1])], pasto: [m(a.pasto[0], b.pasto[0]), m(a.pasto[1], b.pasto[1])], rumble: [m(a.rumble[0], b.rumble[0]), m(a.rumble[1], b.rumble[1])], ruta: [m(a.ruta[0], b.ruta[0]), m(a.ruta[1], b.ruta[1])], linea: m(a.linea, b.linea), niebla: m(a.niebla, b.niebla), noche: a.noche + (b.noche - a.noche) * f };
}

function azar(semilla: number) { let a = semilla >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const lienzo = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// ---- Dibujos chicos (se hacen una sola vez y después solo se estiran) ----
const COLORES_AUTO = ["#D83A3A", "#2F6BD8", "#F0B323", "#2FA55A", "#ECEFF4", "#2B2F3A", "#8A4FD0", "#F07A23"];
const COLORES_CAMION = ["#ECEFF4", "#2F6BD8", "#F07A23", "#2FA55A"];
function dibujoAuto(color: string) {
  const c = lienzo(96, 76), x = c.getContext("2d")!;
  x.fillStyle = "rgba(0,0,0,.35)"; x.beginPath(); x.ellipse(48, 70, 44, 6, 0, 0, 7); x.fill();
  x.fillStyle = "#16181F"; rr(x, 6, 54, 16, 18, 4); x.fill(); rr(x, 74, 54, 16, 18, 4); x.fill(); // ruedas
  x.fillStyle = color; rr(x, 4, 28, 88, 36, 10); x.fill(); // carrocería
  x.fillStyle = "rgba(255,255,255,.22)"; rr(x, 8, 30, 80, 8, 6); x.fill();
  x.fillStyle = color; rr(x, 16, 8, 64, 28, 10); x.fill(); // cabina
  x.fillStyle = "#1B2438"; rr(x, 22, 12, 52, 18, 6); x.fill(); // luneta
  x.fillStyle = "rgba(160,200,255,.35)"; rr(x, 25, 14, 22, 6, 3); x.fill();
  x.fillStyle = "#FF2B2B"; rr(x, 8, 40, 20, 9, 3); x.fill(); rr(x, 68, 40, 20, 9, 3); x.fill(); // luces traseras
  x.fillStyle = "#FF9A9A"; rr(x, 10, 42, 8, 3, 1); x.fill(); rr(x, 78, 42, 8, 3, 1); x.fill();
  x.fillStyle = "#11141B"; rr(x, 10, 54, 76, 8, 3); x.fill(); // paragolpe
  x.fillStyle = "#F4F4F4"; rr(x, 38, 49, 20, 8, 2); x.fill();
  return c;
}
function dibujoCamion(color: string) {
  const c = lienzo(112, 136), x = c.getContext("2d")!;
  x.fillStyle = "rgba(0,0,0,.35)"; x.beginPath(); x.ellipse(56, 130, 52, 6, 0, 0, 7); x.fill();
  x.fillStyle = "#14161C"; rr(x, 2, 98, 26, 32, 5); x.fill(); rr(x, 84, 98, 26, 32, 5); x.fill(); // ruedas dobles
  x.fillStyle = "#2A2E3A"; for (let k = 0; k < 4; k++) { x.fillRect(5, 102 + k * 7, 20, 2); x.fillRect(87, 102 + k * 7, 20, 2); }
  x.fillStyle = "rgba(0,0,0,.28)"; rr(x, 8, 4, 96, 100, 6); x.fill();
  x.fillStyle = color; rr(x, 8, 2, 96, 98, 7); x.fill(); // caja
  x.fillStyle = "rgba(255,255,255,.2)"; rr(x, 10, 4, 92, 10, 5); x.fill();
  x.fillStyle = "rgba(0,0,0,.18)"; for (let k = 0; k < 7; k++) x.fillRect(16 + k * 13, 16, 2, 72); // nervaduras
  x.fillRect(55, 14, 2, 76); // puertas
  x.fillStyle = "#FF2B2B"; rr(x, 12, 84, 16, 9, 3); x.fill(); rr(x, 84, 84, 16, 9, 3); x.fill();
  x.fillStyle = "#11141B"; rr(x, 12, 94, 88, 8, 3); x.fill();
  x.fillStyle = "#F4F4F4"; rr(x, 42, 86, 28, 9, 2); x.fill();
  return c;
}
function dibujoArbol(tipo: number) {
  const c = lienzo(80, 120), x = c.getContext("2d")!;
  x.fillStyle = "rgba(0,0,0,.3)"; x.beginPath(); x.ellipse(40, 116, 26, 5, 0, 0, 7); x.fill();
  x.fillStyle = "#6B4A2B"; x.fillRect(35, 62, 10, 54);
  if (tipo === 0) {
    const g = [["#2E8B47", 40, 40, 32], ["#3FA85B", 28, 50, 22], ["#37994F", 54, 52, 22], ["#4CB868", 38, 30, 16]] as const;
    for (const [col, cx, cy, r] of g) { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
  } else {
    for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? "#2C7F47" : "#25703E"; x.beginPath(); x.moveTo(40, 4 + k * 18); x.lineTo(66 - k * 2, 52 + k * 14); x.lineTo(14 + k * 2, 52 + k * 14); x.closePath(); x.fill(); }
  }
  return c;
}
function dibujoArbusto() {
  const c = lienzo(80, 50), x = c.getContext("2d")!;
  for (const [col, cx, cy, r] of [["#2A7D44", 24, 30, 18], ["#3A9A57", 44, 26, 20], ["#2F8B4B", 60, 32, 15]] as const) { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
  return c;
}
function dibujoCartel(texto: string, fondo: string) {
  const c = lienzo(200, 130), x = c.getContext("2d")!;
  x.fillStyle = "#4B5263"; x.fillRect(40, 80, 8, 48); x.fillRect(152, 80, 8, 48);
  x.fillStyle = "#1B2238"; rr(x, 4, 6, 192, 78, 8); x.fill();
  x.fillStyle = fondo; rr(x, 9, 11, 182, 68, 5); x.fill();
  x.fillStyle = "#fff"; x.font = "900 34px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  const [a, b] = texto.split("|");
  x.fillText(a, 100, b ? 34 : 45); if (b) { x.font = "700 17px system-ui, sans-serif"; x.fillText(b, 100, 62); }
  return c;
}

export function crearDibujo(ctx: CanvasRenderingContext2D, pista: Tramo[]): Dibujo {
  let W = 320, H = 480, hor = 190, nivel = 0, ultimoT = performance.now(), off1 = 0, off2 = 0;
  const visibles = () => [100, 72, 52][nivel];
  // dibujos chicos
  const autos = COLORES_AUTO.map(dibujoAuto), camiones = COLORES_CAMION.map(dibujoCamion);
  const arboles = [dibujoArbol(0), dibujoArbol(1)], arbusto = dibujoArbusto();
  const carteles = [dibujoCartel("LOMAS HOY", "#1F5AD6"), dibujoCartel("LOMAS HOY|Todo Lomas en un solo lugar", "#17806A")];
  // adornos de la banquina: se reparten una vez, siempre en los mismos lugares
  type Adorno = { sprite: HTMLCanvasElement; x: number; w: number };
  const adornos: Adorno[][] = Array.from({ length: N }, () => []);
  {
    const r = azar(77);
    for (let i = 8; i < N; i++) {
      if (i % 4 === 0) { const lado = r() < 0.5 ? -1 : 1; adornos[i].push({ sprite: arboles[r() < 0.6 ? 0 : 1], x: lado * (1.5 + r() * 1.6), w: 0.8 + r() * 0.35 }); }
      if (i % 7 === 3) { const lado = r() < 0.5 ? -1 : 1; adornos[i].push({ sprite: arbusto, x: lado * (1.35 + r() * 0.5), w: 0.55 }); }
      if (i % 90 === 40) adornos[i].push({ sprite: carteles[(i / 90) % 2 < 1 ? 0 : 1], x: 1.75, w: 1.55 });
      if (i % 90 === 85) adornos[i].push({ sprite: carteles[1], x: -1.8, w: 1.55 });
    }
  }
  // montañas: dos capas de siluetas
  const cumbres = (n: number, sem: number, alto: number) => { const r = azar(sem); return Array.from({ length: n + 1 }, (_, k) => (k === n ? 0 : 0.35 + r() * 0.65) * alto); };
  const m1 = cumbres(14, 5, 1), m2 = cumbres(18, 9, 1);
  m1[14] = m1[0]; m2[18] = m2[0];
  const estrellas = (() => { const r = azar(31); return Array.from({ length: 46 }, () => ({ x: r(), y: r() * 0.8, t: 0.4 + r() * 0.8 })); })();
  let vineta: HTMLCanvasElement | null = null, cielo: CanvasGradient | null = null, cieloClave = "";

  // posiciones ya proyectadas de cada tramo (se reutilizan cada cuadro)
  const PX = new Float32Array(130), PY = new Float32Array(130), PW = new Float32Array(130), PZ = new Float32Array(130);
  const poli = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, color: string) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill();
  };
  function montanas(cumb: number[], desde: number, alto: number, desp: number, color: string, ancho: number) {
    const n = cumb.length - 1, paso = ancho / n;
    ctx.fillStyle = color; ctx.beginPath();
    const x0 = -((desp % ancho) + ancho) % ancho;
    ctx.moveTo(x0, desde);
    for (let rep = 0; rep < 3; rep++) for (let k = 0; k <= n; k++) ctx.lineTo(x0 + rep * ancho + k * paso, desde - cumb[k] * alto);
    ctx.lineTo(x0 + 3 * ancho, desde); ctx.closePath(); ctx.fill();
  }

  function camion(e: Escena, cx: number, base: number, ancho: number, t: number) {
    const s = ancho / 100, giro = e.volante, rebote = Math.sin(t * 26) * 0.8 * (e.vel / V_MAX) * s * 1.2;
    ctx.save();
    ctx.translate(cx, base + rebote);
    ctx.rotate(giro * 0.035 + (Math.random() - 0.5) * 0.004 * e.sacudida * 8);
    if (e.inv > 0 && Math.floor(e.inv * 9) % 2 === 0) ctx.globalAlpha = 0.45; // parpadea un rato después de chocar
    ctx.scale(s, s);
    // sombra
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(0, 1, 56, 7, 0, 0, 7); ctx.fill();
    // cabina asomando por arriba (tractor azul oscuro) con espejos, visera y luces
    ctx.fillStyle = "#13203F"; rr(ctx, -33, -118, 66, 24, 8); ctx.fill();
    ctx.fillStyle = "#223A74"; rr(ctx, -30, -121, 60, 14, 6); ctx.fill();
    ctx.fillStyle = "#0A0F1E"; rr(ctx, -34, -116, 68, 5, 2); ctx.fill();
    ctx.fillStyle = "#FFB020"; for (const dx of [-16, 0, 16]) ctx.fillRect(dx - 3, -124, 6, 3);
    ctx.fillStyle = "#0E1428"; rr(ctx, -47, -110, 12, 20, 3); ctx.fill(); rr(ctx, 35, -110, 12, 20, 3); ctx.fill(); // espejos
    // techo del acoplado
    ctx.fillStyle = "#C9D0DE"; ctx.beginPath(); ctx.moveTo(-46, -92); ctx.lineTo(46, -92); ctx.lineTo(53, -80); ctx.lineTo(-53, -80); ctx.closePath(); ctx.fill();
    // ruedas dobles
    ctx.fillStyle = "#101219"; rr(ctx, -62, -26, 24, 28, 5); ctx.fill(); rr(ctx, 38, -26, 24, 28, 5); ctx.fill();
    ctx.fillStyle = "#2C303D"; for (let k = 0; k < 4; k++) { ctx.fillRect(-59, -22 + k * 6, 18, 2); ctx.fillRect(41, -22 + k * 6, 18, 2); }
    // cara trasera del acoplado
    ctx.fillStyle = "rgba(0,0,0,.25)"; rr(ctx, -52, -80, 104, 70, 7); ctx.fill();
    const g = ctx.createLinearGradient(0, -82, 0, -14); g.addColorStop(0, "#F3F6FB"); g.addColorStop(1, "#D4DAE6");
    ctx.fillStyle = g; rr(ctx, -54, -82, 108, 72, 7); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.12)"; for (let k = -3; k <= 3; k++) ctx.fillRect(k * 14 - 1, -76, 2, 52);
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(-1, -76, 2, 62); // puertas
    ctx.fillStyle = "#1F5AD6"; ctx.fillRect(-54, -58, 108, 15);
    ctx.fillStyle = "#fff"; ctx.font = "900 12px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("LOMAS HOY", 0, -50);
    // luces de freno
    const f = e.freno && e.vel > 200;
    ctx.fillStyle = f ? "#FF3B3B" : "#A81414"; rr(ctx, -50, -30, 20, 11, 3); ctx.fill(); rr(ctx, 30, -30, 20, 11, 3); ctx.fill();
    if (f) { ctx.fillStyle = "rgba(255,60,60,.35)"; ctx.beginPath(); ctx.ellipse(-40, -24, 24, 14, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(40, -24, 24, 14, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#101219"; rr(ctx, -50, -14, 100, 9, 3); ctx.fill(); // paragolpe
    ctx.fillStyle = "#F4F4F4"; rr(ctx, -15, -27, 30, 11, 2); ctx.fill(); ctx.fillStyle = "#222"; ctx.font = "800 7px system-ui"; ctx.fillText("LH 2027", 0, -21);
    ctx.fillStyle = "#1B1E27"; rr(ctx, -64, -12, 12, 16, 3); ctx.fill(); rr(ctx, 52, -12, 12, 16, 3); ctx.fill(); // guardabarros
    ctx.restore();
  }

  return {
    cambiarTam(w, h) {
      W = w; H = h; hor = Math.round(h * 0.4); cielo = null;
      vineta = lienzo(w, h); const v = vineta.getContext("2d")!;
      const g = v.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.78);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.55)"); v.fillStyle = g; v.fillRect(0, 0, w, h);
    },
    calidad(n) { nivel = n; },
    ambiente(t) { return paletaEn(t).nombre; },
    dibujar(e) {
      const ahora = performance.now(), dt = Math.min(0.05, (ahora - ultimoT) / 1000); ultimoT = ahora;
      const pal = paletaEn(e.tiempo), vp = e.vel / V_MAX;
      const n0 = Math.floor(e.pos / SEG) % N, base = pista[n0], pct = (e.pos % SEG) / SEG;
      off1 += base.curva * vp * dt * W * 0.09; off2 += base.curva * vp * dt * W * 0.18; // las montañas se corren más despacio que la ruta
      const sh = e.sacudida > 0 ? e.sacudida * (W / 390) * 4 : 0;
      ctx.save();
      if (sh) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
      // cielo
      const clave = `${Math.round(pal.cielo[0][0])},${Math.round(pal.cielo[0][2])},${Math.round(pal.cielo[1][1])},${hor}`;
      if (!cielo || clave !== cieloClave) { cielo = ctx.createLinearGradient(0, 0, 0, hor); cielo.addColorStop(0, css(pal.cielo[0])); cielo.addColorStop(1, css(pal.cielo[1])); cieloClave = clave; }
      ctx.fillStyle = cielo; ctx.fillRect(-10, -10, W + 20, hor + 12);
      if (pal.noche > 0.4) { ctx.fillStyle = "#fff"; for (const s of estrellas) { ctx.globalAlpha = Math.min(1, (pal.noche - 0.4) * 1.7) * s.t; ctx.fillRect(s.x * W, s.y * hor, 1.6, 1.6); } ctx.globalAlpha = 1; }
      // sol o luna
      const sx = W * 0.72 - off1 * 0.15, sy = hor * (0.08 + pal.solY * 0.82), sr = W * (pal.noche > 0.6 ? 0.055 : 0.085);
      const gs = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 3); gs.addColorStop(0, css(pal.sol, 0.55)); gs.addColorStop(1, css(pal.sol, 0));
      ctx.fillStyle = gs; ctx.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
      ctx.fillStyle = css(pal.sol); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fill();
      // montañas
      montanas(m2, hor + 1, hor * 0.32, off2, css(pal.monta[1]), W * 1.7);
      montanas(m1, hor + 1, hor * 0.5, off1, css(pal.monta[0]), W * 1.9);
      // pasto de fondo
      ctx.fillStyle = css(pal.pasto[0]); ctx.fillRect(-10, hor, W + 20, H - hor + 10);
      // ruta, de lejos a cerca (se calcula de cerca a lejos)
      const cuantos = visibles(), camX = e.x * ANCHO;
      let x = 0, dx = -base.curva * pct, maxy = H;
      const cPasto = [css(pal.pasto[0]), css(pal.pasto[1])], cRum = [css(pal.rumble[0]), css(pal.rumble[1])], cRuta = [css(pal.ruta[0]), css(pal.ruta[1])], cLinea = css(pal.linea);
      let lleno = 0;
      for (let n = 0; n < cuantos; n++) {
        const s = pista[(n0 + n) % N];
        const z1 = s.z + ((n0 + n) >= N ? N * SEG : 0) - e.pos, z2 = z1 + SEG;
        const pos1 = z1 > PROF;
        const sc1 = PROF / Math.max(z1, 1), sc2 = PROF / z2;
        const x1 = W / 2 + sc1 * (x - camX) * (W / 2), y1 = hor + sc1 * ALTO_CAM * (H - hor), w1 = sc1 * ANCHO * (W / 2);
        const x2 = W / 2 + sc2 * (x + dx - camX) * (W / 2), y2 = hor + sc2 * ALTO_CAM * (H - hor), w2 = sc2 * ANCHO * (W / 2);
        PX[n] = x1; PY[n] = y1; PW[n] = w1; PZ[n] = z1;
        x += dx; dx += s.curva;
        if (!pos1 || y2 >= maxy || y2 >= y1) { PY[n] = -1; continue; }
        maxy = y2; lleno = n;
        const b = s.banda ? 0 : 1;
        ctx.fillStyle = cPasto[b]; ctx.fillRect(0, y2, W, y1 - y2);
        const r1 = w1 * 1.13, r2 = w2 * 1.13;
        if (nivel < 2 || n < 24) { poli(x1 - r1, y1 + 1, x1 - w1, y1 + 1, x2 - w2, y2, x2 - r2, y2, cRum[b]); poli(x1 + w1, y1 + 1, x1 + r1, y1 + 1, x2 + r2, y2, x2 + w2, y2, cRum[b]); }
        poli(x1 - w1, y1 + 1, x1 + w1, y1 + 1, x2 + w2, y2, x2 - w2, y2, cRuta[b]);
        if (s.banda && (nivel === 0 || n < 40)) for (const lado of [-1 / 3, 1 / 3]) {
          const l1 = w1 * 0.026, l2 = w2 * 0.026;
          poli(x1 + lado * w1 - l1, y1, x1 + lado * w1 + l1, y1, x2 + lado * w2 + l2, y2, x2 + lado * w2 - l2, y2, cLinea);
        }
      }
      // niebla suave en el horizonte (esconde que la ruta aparece de golpe)
      const gn = ctx.createLinearGradient(0, hor - 8, 0, hor + (H - hor) * 0.22); gn.addColorStop(0, css(pal.niebla, 0)); gn.addColorStop(0.3, css(pal.niebla, 0.85)); gn.addColorStop(1, css(pal.niebla, 0));
      ctx.fillStyle = gn; ctx.fillRect(0, hor - 8, W, (H - hor) * 0.22 + 8);
      // tráfico por tramo
      const porTramo = new Map<number, Coche[]>();
      for (const c of e.coches) {
        let rel = Math.floor(c.z / SEG) - n0; if (rel < 0) rel += N;
        if (rel < cuantos - 1 && PY[rel] >= 0) { const l = porTramo.get(rel); if (l) l.push(c); else porTramo.set(rel, [c]); }
      }
      // adornos y tráfico, de lejos a cerca
      for (let n = Math.min(cuantos - 1, lleno + 1); n >= 0; n--) {
        if (PY[n] < 0) continue;
        const idx = (n0 + n) % N, w1 = PW[n], x1 = PX[n], y1 = PY[n];
        if (PZ[n] < 400) continue;
        const adn = adornos[idx];
        for (let k = 0; k < adn.length; k++) {
          const a = adn[k], dw = w1 * a.w, dh = dw * (a.sprite.height / a.sprite.width);
          if (dw < 2) continue;
          ctx.drawImage(a.sprite, x1 + w1 * a.x - dw / 2, y1 - dh, dw, dh);
        }
        const cs = porTramo.get(n);
        if (cs) for (const c of cs) {
          const f = (c.z % SEG) / SEG, nx = n + 1;
          const px = PX[n] + (PX[nx] - PX[n]) * f, py = PY[n] + (PY[nx] - PY[n]) * f, pw = PW[n] + (PW[nx] - PW[n]) * f;
          const sp = c.tipo === "auto" ? autos[c.color % autos.length] : camiones[c.color % camiones.length];
          const dw = pw * c.ancho, dh = dw * (sp.height / sp.width);
          if (dw < 2) continue;
          ctx.drawImage(sp, px + pw * c.x - dw / 2, py - dh, dw, dh);
        }
      }
      // líneas de velocidad (solo cuando se va rápido)
      if (vp > 0.6) {
        ctx.strokeStyle = "rgba(255,255,255,.2)"; ctx.lineWidth = Math.max(1, W / 260);
        const m = Math.floor(8 + vp * 6);
        for (let k = 0; k < m; k++) {
          const a = ((k * 0.6180339 + e.tiempo * 1.7) % 1), lado = k % 2 ? 1 : -1, f0 = 0.3 + a * 0.55, f1 = f0 + 0.18 * vp;
          const ix = W / 2 + lado * W * (0.12 + (k % 5) * 0.045), iy = hor + (H - hor) * 0.15;
          const ox = W / 2 + lado * W * (0.5 + (k % 4) * 0.08), oy = H * 0.9;
          ctx.beginPath(); ctx.moveTo(ix + (ox - ix) * f0, iy + (oy - iy) * f0); ctx.lineTo(ix + (ox - ix) * f1, iy + (oy - iy) * f1); ctx.stroke();
        }
      }
      // noche: oscurece y los faros iluminan la ruta
      if (pal.noche > 0.02) {
        ctx.fillStyle = `rgba(4,8,30,${0.32 * pal.noche})`; ctx.fillRect(0, hor, W, H - hor);
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const gf = ctx.createLinearGradient(0, H, 0, hor + (H - hor) * 0.25); gf.addColorStop(0, `rgba(255,236,170,${0.34 * pal.noche})`); gf.addColorStop(1, "rgba(255,236,170,0)");
        ctx.fillStyle = gf; ctx.beginPath(); ctx.moveTo(W * 0.3, H); ctx.lineTo(W * 0.7, H); ctx.lineTo(W * 0.58, hor + (H - hor) * 0.25); ctx.lineTo(W * 0.42, hor + (H - hor) * 0.25); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      // camión del jugador
      camion(e, W / 2, H - H * 0.035, W * 0.36, e.tiempo);
      ctx.restore();
      if (e.flash > 0) { ctx.fillStyle = `rgba(255,50,50,${Math.min(0.55, e.flash * 0.6)})`; ctx.fillRect(0, 0, W, H); }
      if (vineta) ctx.drawImage(vineta, 0, 0);
    },
  };
}
