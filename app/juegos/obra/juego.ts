// ZAFÁ LOMAS: el juego de trepar una obra en construcción esquivando las pelotas que tira un perro gigante (Phaser, 2D). Se carga solo cuando se toca "Jugar".
// Dibujos, sonidos y reglas propios. Pensado para celulares de gama baja: pantalla chica (360 de ancho), pocos objetos y tope de 30 cuadros por segundo.
import type PhaserTipos from "phaser";
import { tono } from "../comun";
import { sonidoActivo } from "../../FeedbackToque";
import { PALETA, VECINO, PERRO, BANDERA, type Dibujo } from "./sprites";

type Fase = "jugando" | "pausa" | "fin";
export type EstadoObra = { puntos: number; vidas: number; nivel: number; fase: Fase; oleada: number };
export type Entrada = "izq" | "der" | "saltar" | "subir" | "bajar";
export type ControlObra = { pausar: () => void; reanudar: () => void; reiniciar: () => void; destruir: () => void; entrada: (n: Entrada, v: boolean) => void };
type Img = PhaserTipos.GameObjects.Image;
type Piso = { i: number; x0: number; x1: number; yIzq: number; yDer: number; dir: 1 | -1 };
type Escalera = { g: number; x: number }; // une el piso g con el g + 1
type Bola = { img: Img; f: number; x: number; y: number; dir: 1 | -1; estado: "rueda" | "cae" | "baja"; vy: number; esc: Escalera | null; ultEsc: number; puntuada: boolean };

const W = 360, CTRL = 120, K = 18, ESC = 3, RADIO = 11; // ancho del juego, zona de botones abajo, desnivel de cada piso, tamaño de los dibujos y de la pelota
const VEL = 80, VEL_ESC = 54, ALTO_SALTO = 235, GRAVEDAD = 760;

const suena = (f: () => void) => { if (sonidoActivo()) f(); };
const SON = {
  salto: () => suena(() => tono(360, 0.13, "square", 0.04, 0, 760)),
  esquivo: () => suena(() => { tono(880, 0.07, "triangle", 0.05); tono(1175, 0.09, "triangle", 0.05, 0.07); }),
  paso: () => suena(() => tono(300, 0.035, "square", 0.025)),
  guau: () => suena(() => { tono(240, 0.09, "sawtooth", 0.05, 0, 130); tono(190, 0.1, "square", 0.03, 0.02, 110); }),
  golpe: () => suena(() => { tono(220, 0.35, "sawtooth", 0.07, 0, 45); tono(110, 0.4, "square", 0.05, 0.03, 40); }),
  piso: () => suena(() => { tono(520, 0.07, "triangle", 0.05); tono(780, 0.09, "triangle", 0.05, 0.07); }),
  nivel: () => suena(() => { [523, 659, 784, 1046, 1318].forEach((f, i) => tono(f, 0.14, "triangle", 0.06, i * 0.1)); }),
  fin: () => suena(() => { [440, 370, 311, 247, 196].forEach((f, i) => tono(f, 0.2, "sawtooth", 0.05, i * 0.16)); }),
};

export function crearJuego(Phaser: typeof PhaserTipos, parent: HTMLElement, avisar: (e: EstadoObra) => void): ControlObra {
  let esc: Escena | null = null;
  const caja = parent.getBoundingClientRect();
  const H = Math.round(Math.min(780, Math.max(480, W * (caja.height / Math.max(1, caja.width)))));
  const entradas: Record<Entrada, boolean> = { izq: false, der: false, saltar: false, subir: false, bajar: false };

  // ---- La obra: pisos inclinados que se alternan (la pelota baja siempre hacia el borde) y escaleras entre piso y piso ----
  const N = H >= 700 ? 6 : 5, yTope = 150, yBase = H - CTRL - 26, sp = (yBase - yTope) / (N - 1);
  const pisos: Piso[] = Array.from({ length: N }, (_, i) => {
    const dir: 1 | -1 = (N - 1 - i) % 2 === 0 ? 1 : -1, ym = yBase - i * sp;
    return dir === 1 ? { i, x0: 0, x1: W - 44, yIzq: ym - K / 2, yDer: ym + K / 2, dir } : { i, x0: 44, x1: W, yIzq: ym + K / 2, yDer: ym - K / 2, dir };
  });
  const yPiso = (p: Piso, x: number) => p.yIzq + ((p.yDer - p.yIzq) * (Math.min(p.x1, Math.max(p.x0, x)) - p.x0)) / (p.x1 - p.x0);
  const escaleras: Escalera[] = [];
  // las escaleras de un piso y las del siguiente nunca quedan una arriba de la otra: hay que caminar (y esquivar) para llegar a la que sigue
  for (let g = 0; g < N - 1; g++) { const d = N - 2 - g; (d === 0 ? [140] : d % 2 === 1 ? [268, 72] : [176]).forEach((x) => escaleras.push({ g, x })); }
  const XMETA = W - 64, XMIN_TOPE = 112; // la bandera de la meta y hasta dónde se puede acercar al perro

  class Escena extends Phaser.Scene {
    readonly pisos = pisos; readonly N = N; readonly escaleras = escaleras; // (a la vista para poder revisar el juego desde las pruebas)
    fase: Fase = "jugando";
    puntos = 0; vidas = 3; nivel = 1; oleada = 0;
    // el vecino
    vecino!: Img; px = 40; f = 0; modo: "suelo" | "salto" | "escalera" = "suelo"; alto = 0; altoV = 0; prog = 0; lad: Escalera | null = null; mira = 1; inmune = 0; paso = 0; tPaso = 0; tSonidoEsc = 0; maxPiso = 0; muriendo = 0; celebra = 0; saltoPrev = false;
    // el perro, las pelotas y lo demás
    perro!: Img; bandera!: Img; bolas: Bola[] = []; tBola = 1.2; lanzando = 0; tPerro = 0;
    emisores: Record<string, PhaserTipos.GameObjects.Particles.ParticleEmitter> = {};
    teclas!: PhaserTipos.Types.Input.Keyboard.CursorKeys; extra: Record<string, PhaserTipos.Input.Keyboard.Key> = {};

    constructor() { super("obra"); }

    pintar(clave: string, dib: Dibujo, esc: number) {
      if (this.textures.exists(clave)) return;
      const ancho = Math.max(...dib.map((f) => f.length));
      const t = this.textures.createCanvas(clave, ancho * esc, dib.length * esc)!, c = t.getContext();
      dib.forEach((fila, y) => [...fila.padEnd(ancho, ".")].forEach((ch, x) => { const col = PALETA[ch]; if (col) { c.fillStyle = col; c.fillRect(x * esc, y * esc, esc, esc); } }));
      t.refresh();
    }
    crearTexturas() {
      (Object.keys(VECINO) as (keyof typeof VECINO)[]).forEach((k) => this.pintar(`v-${k}`, VECINO[k], ESC));
      this.pintar("perro0", PERRO[0], 4); this.pintar("perro1", PERRO[1], 4);
      this.pintar("bandera", BANDERA, 3);
      if (!this.textures.exists("pelota")) { // la pelota naranja con costuras (así se ve que gira)
        const t = this.textures.createCanvas("pelota", 22, 22)!, c = t.getContext();
        c.fillStyle = "#FF7A2F"; c.beginPath(); c.arc(11, 11, 10, 0, Math.PI * 2); c.fill();
        c.strokeStyle = "#6B2A0C"; c.lineWidth = 1.6; c.beginPath(); c.arc(11, 11, 9.6, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.moveTo(11, 1.5); c.lineTo(11, 20.5); c.moveTo(1.5, 11); c.lineTo(20.5, 11); c.stroke();
        c.beginPath(); c.arc(-2, 11, 11.5, -0.95, 0.95); c.stroke(); c.beginPath(); c.arc(24, 11, 11.5, Math.PI - 0.95, Math.PI + 0.95); c.stroke();
        c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(5, 5, 4, 3); t.refresh();
      }
      if (!this.textures.exists("chispa")) {
        const t = this.textures.createCanvas("chispa", 16, 16)!, c = t.getContext(), g = c.createRadialGradient(8, 8, 0, 8, 8, 8);
        g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.45, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = g; c.fillRect(0, 0, 16, 16); t.refresh();
      }
      if (!this.textures.exists("estrella")) { const t = this.textures.createCanvas("estrella", 2, 2)!, c = t.getContext(); c.fillStyle = "#fff"; c.fillRect(0, 0, 2, 2); t.refresh(); }
    }

    // El escenario se dibuja una sola vez: cielo de noche con edificios, pisos de andamio, escaleras y el suelo de los botones
    dibujarObra() {
      const g = this.add.graphics().setDepth(0);
      g.fillStyle(0x070a1f, 1); g.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) this.add.image(((i * 97) % W) + 3, (i * 53) % (H - CTRL), "estrella").setAlpha(0.2 + (i % 4) * 0.12).setDepth(0);
      // edificios lejanos
      const edif = [[10, 140, 50], [70, 100, 44], [124, 170, 56], [190, 120, 46], [244, 150, 52], [300, 110, 50]];
      for (const [x, alto, ancho] of edif) {
        const y = H - CTRL - alto;
        g.fillStyle(0x0d1433, 1); g.fillRect(x, y, ancho, alto + CTRL);
        g.fillStyle(0xffd66b, 0.55);
        for (let wy = y + 10; wy < H - CTRL - 12; wy += 22) for (let wx = x + 8; wx < x + ancho - 8; wx += 14) if (((wx * 7 + wy * 3) % 5) < 2) g.fillRect(wx, wy, 5, 8);
      }
      // suelo
      g.fillStyle(0x0b1230, 1); g.fillRect(0, H - CTRL, W, CTRL); g.fillStyle(0x3a4a8c, 1); g.fillRect(0, H - CTRL, W, 3);
      // pisos de andamio: viga naranja con travesaños en cruz abajo
      for (const p of pisos) {
        g.lineStyle(2, 0x8a4b08, 1);
        for (let x = p.x0; x < p.x1 - 12; x += 26) { g.lineBetween(x, yPiso(p, x) + 9, x + 26, yPiso(p, x + 26) + 24); g.lineBetween(x + 26, yPiso(p, x + 26) + 9, x, yPiso(p, x) + 24); }
        g.lineStyle(3, 0x8a4b08, 1); g.lineBetween(p.x0, p.yIzq + 24, p.x1, p.yDer + 24);
        g.fillStyle(0xff9f1c, 1); g.fillPoints([{ x: p.x0, y: p.yIzq }, { x: p.x1, y: p.yDer }, { x: p.x1, y: p.yDer + 9 }, { x: p.x0, y: p.yIzq + 9 }], true);
        g.lineStyle(2, 0xffd27a, 1); g.lineBetween(p.x0, p.yIzq, p.x1, p.yDer);
        g.lineStyle(2, 0xb45f06, 1); g.lineBetween(p.x0, p.yIzq + 9, p.x1, p.yDer + 9);
      }
      // escaleras
      for (const e of escaleras) {
        const yb = yPiso(pisos[e.g], e.x), yt = yPiso(pisos[e.g + 1], e.x);
        g.lineStyle(3, 0xc9cfe6, 1); g.lineBetween(e.x - 8, yb, e.x - 8, yt); g.lineBetween(e.x + 8, yb, e.x + 8, yt);
        g.lineStyle(2, 0x9aa3cf, 1);
        for (let y = yb - 8; y > yt + 4; y -= 10) g.lineBetween(e.x - 8, y, e.x + 8, y);
      }
    }

    create() {
      esc = this;
      this.fase = "jugando"; this.puntos = 0; this.vidas = 3; this.nivel = 1; this.oleada = 0; this.bolas = []; this.emisores = {};
      this.celebra = 0; this.muriendo = 0; this.lanzando = 0; this.saltoPrev = false;
      this.crearTexturas();
      this.cameras.main.setBackgroundColor("#070A1F");
      this.dibujarObra();
      const top = pisos[N - 1];
      this.perro = this.add.image(52, yPiso(top, 52) + 2, "perro0").setOrigin(0.5, 1).setDepth(3);
      this.bandera = this.add.image(XMETA, yPiso(top, XMETA) + 1, "bandera").setOrigin(0.5, 1).setDepth(2);
      this.vecino = this.add.image(40, 0, "v-quieto").setOrigin(0.5, 1).setDepth(5);
      this.teclas = this.input.keyboard!.createCursorKeys();
      this.extra = { a: this.input.keyboard!.addKey("A"), d: this.input.keyboard!.addKey("D"), w: this.input.keyboard!.addKey("W"), s: this.input.keyboard!.addKey("S"), esp: this.input.keyboard!.addKey("SPACE"), z: this.input.keyboard!.addKey("Z") };
      this.empezarNivel();
    }

    avisarEstado() { avisar({ puntos: this.puntos, vidas: this.vidas, nivel: this.nivel, fase: this.fase, oleada: this.oleada }); }
    emisor(color: string) {
      return (this.emisores[color] ??= this.add.particles(0, 0, "chispa", { lifespan: { min: 280, max: 650 }, speed: { min: 50, max: 200 }, scale: { start: 1.1, end: 0 }, alpha: { start: 1, end: 0 }, blendMode: "ADD", emitting: false, tint: parseInt(color.slice(1), 16), gravityY: 120 }).setDepth(8));
    }
    explotar(x: number, y: number, color: string, n = 12) { this.emisor(color).explode(n, x, y); }

    // ---- Cada nivel: el vecino abajo a la izquierda y las pelotas desde cero. Más nivel = pelotas más rápidas y más seguidas ----
    empezarNivel() {
      this.oleada++;
      this.bolas.forEach((b) => b.img.destroy()); this.bolas = [];
      this.reaparecer(false);
      this.tBola = 1.4; this.maxPiso = 0;
      this.avisarEstado();
    }
    reaparecer(conInmune: boolean) {
      this.px = 40; this.f = 0; this.modo = "suelo"; this.alto = 0; this.altoV = 0; this.lad = null; this.mira = 1; this.inmune = conInmune ? 1.8 : 0; this.muriendo = 0;
      this.vecino.setAngle(0).setAlpha(1).setFlipX(false).setTexture("v-quieto").setPosition(this.px, yPiso(pisos[0], this.px));
    }
    vBola() { return Math.min(125, 52 + 9 * this.nivel); }
    cadaBola() { return Math.max(1.0, 2.7 - 0.28 * this.nivel); }

    lanzarBola() {
      const top = pisos[N - 1], x = 98;
      const img = this.add.image(x, yPiso(top, x) - RADIO, "pelota").setDepth(4);
      this.bolas.push({ img, f: N - 1, x, y: yPiso(top, x) - RADIO, dir: 1, estado: "rueda", vy: 0, esc: null, ultEsc: -1, puntuada: false });
      this.lanzando = 0.35; SON.guau();
    }

    perdioVida() {
      if (this.inmune > 0 || this.muriendo > 0 || this.fase !== "jugando") return;
      this.vidas--; this.muriendo = 0.9; this.celebra = 0;
      this.explotar(this.px, this.vecino.y - 20, "#FFC83D", 14); this.explotar(this.px, this.vecino.y - 20, "#2F6BFF", 10);
      this.cameras.main.shake(260, 0.014); this.cameras.main.flash(120, 255, 90, 90, false);
      SON.golpe(); this.avisarEstado();
    }
    terminar() { this.fase = "fin"; SON.fin(); this.avisarEstado(); }

    nivelCompleto() {
      this.celebra = 1.4; this.puntos += 500 * this.nivel;
      this.explotar(XMETA, this.bandera.y - 24, "#FFC83D", 20); this.explotar(XMETA, this.bandera.y - 24, "#2F6BFF", 16); this.explotar(XMETA, this.bandera.y - 24, "#F0506E", 14);
      SON.nivel(); this.avisarEstado();
    }

    update(_t: number, delta: number) {
      const dt = Math.min(delta, 70) / 1000;
      if (this.fase !== "jugando") return;
      this.tPerro += dt;
      this.perro.setTexture(this.lanzando > 0 ? "perro1" : "perro0").setScale(1 + (this.lanzando > 0 ? 0.04 : Math.sin(this.tPerro * 3) * 0.015));
      if (this.lanzando > 0) this.lanzando -= dt;

      if (this.celebra > 0) { this.celebra -= dt; this.vecino.setTexture("v-salto"); if (this.celebra <= 0) { this.nivel++; this.empezarNivel(); } return; }
      if (this.muriendo > 0) {
        this.muriendo -= dt; this.vecino.angle += 700 * dt; this.vecino.y += 150 * dt; this.vecino.setAlpha(Math.max(0.2, this.muriendo / 0.9));
        if (this.muriendo <= 0) { if (this.vidas <= 0) { this.vecino.setVisible(false); this.terminar(); } else { this.bolas.forEach((b) => b.img.destroy()); this.bolas = []; this.reaparecer(true); this.tBola = 1.6; this.avisarEstado(); } }
        return;
      }

      // ---- entradas: botones de la pantalla y teclado ----
      const k = this.teclas, x = this.extra;
      const izq = entradas.izq || k.left?.isDown || x.a?.isDown, der = entradas.der || k.right?.isDown || x.d?.isDown;
      const subir = entradas.subir || k.up?.isDown || x.w?.isDown, bajar = entradas.bajar || k.down?.isDown || x.s?.isDown;
      const saltar = entradas.saltar || x.esp?.isDown || x.z?.isDown, saltoNuevo = saltar && !this.saltoPrev; this.saltoPrev = !!saltar;

      // ---- el vecino ----
      const p = pisos[this.f];
      if (this.modo === "suelo" || this.modo === "salto") {
        const dx = (der ? 1 : 0) - (izq ? 1 : 0);
        if (dx) { this.mira = dx; this.px += dx * VEL * (this.modo === "salto" ? 0.85 : 1) * dt; this.paso += dt; }
        const minX = this.f === N - 1 ? XMIN_TOPE : p.x0 + 10;
        this.px = Math.min(p.x1 - 10, Math.max(minX, this.px));
        if (this.modo === "suelo") {
          this.vecino.y = yPiso(p, this.px);
          if (saltoNuevo) { this.modo = "salto"; this.alto = 0; this.altoV = ALTO_SALTO; SON.salto(); }
          else if (subir) { const e = escaleras.find((e) => e.g === this.f && Math.abs(e.x - this.px) <= 14); if (e) { this.modo = "escalera"; this.lad = e; this.px = e.x; this.prog = 0; } }
          else if (bajar) { const e = escaleras.find((e) => e.g + 1 === this.f && Math.abs(e.x - this.px) <= 14); if (e) { this.modo = "escalera"; this.lad = e; this.px = e.x; this.prog = 1; } }
          this.vecino.setTexture(dx && Math.floor(this.paso * 8) % 2 ? "v-paso" : "v-quieto");
          if (dx && this.tPaso <= 0) { SON.paso(); this.tPaso = 0.22; }
        } else {
          this.alto += this.altoV * dt; this.altoV -= GRAVEDAD * dt;
          if (this.alto <= 0) { this.alto = 0; this.modo = "suelo"; }
          this.vecino.y = yPiso(p, this.px) - this.alto; this.vecino.setTexture("v-salto");
        }
        this.tPaso -= dt;
        this.vecino.setFlipX(this.mira < 0);
      } else if (this.lad) {
        const e = this.lad, yb = yPiso(pisos[e.g], e.x), yt = yPiso(pisos[e.g + 1], e.x), largo = yb - yt;
        this.prog += ((subir ? 1 : 0) - (bajar ? 1 : 0)) * (VEL_ESC / largo) * dt;
        if ((subir || bajar) && (this.tSonidoEsc -= dt) <= 0) { SON.paso(); this.tSonidoEsc = 0.18; }
        if (this.prog >= 1) { this.f = e.g + 1; this.modo = "suelo"; this.prog = 1; if (this.f > this.maxPiso) { this.maxPiso = this.f; this.puntos += 50; SON.piso(); this.avisarEstado(); } }
        else if (this.prog <= 0) { this.f = e.g; this.modo = "suelo"; this.prog = 0; }
        this.vecino.x = e.x; this.vecino.y = yb + (yt - yb) * Math.min(1, Math.max(0, this.prog));
        this.vecino.setTexture("v-trepa").setFlipX(Math.floor(this.prog * (largo / 9)) % 2 === 0);
      }
      if (this.modo !== "escalera") this.vecino.x = this.px; else this.px = this.vecino.x;
      if (this.inmune > 0) { this.inmune -= dt; this.vecino.setAlpha(Math.floor(this.inmune * 10) % 2 ? 0.3 : 1); if (this.inmune <= 0) this.vecino.setAlpha(1); }

      // meta: llegar a la bandera del piso de arriba
      if (this.modo === "suelo" && this.f === N - 1 && this.px >= XMETA - 8) return this.nivelCompleto();

      // ---- el perro tira pelotas ----
      this.tBola -= dt;
      if (this.tBola <= 0) { this.lanzarBola(); this.tBola = this.cadaBola() * (0.75 + Math.random() * 0.5); }

      // ---- las pelotas ----
      const v = this.vBola();
      for (let n = this.bolas.length - 1; n >= 0; n--) {
        const b = this.bolas[n];
        if (b.estado === "rueda") {
          const pb = pisos[b.f];
          b.x += b.dir * v * dt; b.y = yPiso(pb, b.x) - RADIO; b.img.angle += b.dir * (v / RADIO) * dt * 57.3;
          // a veces bajan por una escalera
          const e = escaleras.find((e) => e.g + 1 === b.f && Math.abs(e.x - b.x) < 3 && b.ultEsc !== e.x);
          if (e) { b.ultEsc = e.x; if (Math.random() < Math.min(0.4, 0.18 + 0.03 * this.nivel)) { b.estado = "baja"; b.esc = e; b.x = e.x; } }
          if ((b.dir === 1 && b.x >= pb.x1) || (b.dir === -1 && b.x <= pb.x0)) { b.estado = "cae"; b.vy = 0; }
        } else if (b.estado === "baja" && b.esc) {
          const e = b.esc, yDest = yPiso(pisos[e.g], e.x) - RADIO;
          b.y += 78 * dt; b.img.angle += 240 * dt;
          if (b.y >= yDest) { b.f = e.g; b.estado = "rueda"; b.dir = pisos[b.f].dir; b.y = yDest; b.esc = null; }
        } else {
          b.vy += 640 * dt; b.y += b.vy * dt; b.x += b.dir * 34 * dt; b.img.angle += b.dir * 300 * dt;
          const g = b.f - 1;
          if (g < 0) { if (b.y > H + 20) { b.img.destroy(); this.bolas.splice(n, 1); } b.img.setPosition(b.x, b.y); continue; }
          const yDest = yPiso(pisos[g], b.x) - RADIO;
          if (b.y >= yDest) { b.f = g; b.estado = "rueda"; b.dir = pisos[g].dir; b.y = yDest; b.ultEsc = -1; }
        }
        b.img.setPosition(b.x, b.y);
        // ¿la esquivó saltando, o le pegó?
        const cy = this.vecino.y - 21;
        if (Math.abs(b.x - this.px) < 16 && Math.abs(b.y - cy) < 26 && this.inmune <= 0) { this.perdioVida(); if (this.muriendo > 0) break; }
        else if (!b.puntuada && this.modo === "salto" && b.f === this.f && b.estado === "rueda" && Math.abs(b.x - this.px) < 8 && this.alto > 12) {
          b.puntuada = true; this.puntos += 100; SON.esquivo(); this.explotar(b.x, b.y - 8, "#FFE98A", 6); this.avisarEstado();
        }
      }
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, width: W, height: H, backgroundColor: "#070A1F",
    fps: { target: 30, limit: 30 }, // tope de 30 cuadros por segundo: gasta menos batería y anda en celulares modestos
    render: { pixelArt: true, antialias: false, powerPreference: "low-power" },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true }, // los sonidos son tonos propios del navegador
    scene: Escena,
  });
  (parent as HTMLElement & { juego?: unknown }).juego = game; // para poder revisar el juego desde las pruebas

  return {
    pausar: () => { if (esc && esc.fase === "jugando") { esc.fase = "pausa"; esc.scene.pause(); esc.avisarEstado(); } },
    reanudar: () => { if (esc && esc.fase === "pausa") { esc.fase = "jugando"; esc.scene.resume(); esc.avisarEstado(); } },
    reiniciar: () => { if (esc) { (Object.keys(entradas) as Entrada[]).forEach((n) => (entradas[n] = false)); esc.scene.resume(); esc.scene.restart(); } },
    destruir: () => { esc = null; game.destroy(true); },
    entrada: (n, v) => { entradas[n] = v; },
  };
}
