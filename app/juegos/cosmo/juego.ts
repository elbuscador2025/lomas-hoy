// COSMO LOMAS: el juego de naves (Phaser, 2D). Se carga solo cuando se toca "Jugar".
// Dibujos, sonidos y reglas propios. Pensado para celulares de gama baja: pantalla chica (360 x 560), pocos objetos, partículas contadas y tope de 30 cuadros por segundo.
import type PhaserTipos from "phaser";
import { tono } from "../comun";
import { sonidoActivo } from "../../FeedbackToque";
import { TIPOS, NAVE, OVNI, COLOR_NAVE, COLOR_OVNI, type Dibujo } from "./sprites";

type Fase = "jugando" | "pausa" | "fin";
export type EstadoCosmo = { puntos: number; vidas: number; nivel: number; fase: Fase; oleada: number; doble: boolean };
export type ControlCosmo = { pausar: () => void; reanudar: () => void; reiniciar: () => void; destruir: () => void };
type Img = PhaserTipos.GameObjects.Image;
type Invasor = { img: Img; col: number; fila: number; tipo: number; vivo: boolean };

const W = 360; // ancho del juego; el alto se adapta a la pantalla (así el juego llena todo el lugar disponible)
const AN_INV = 22, AL_INV = 16, SX = 34, SY = 26; // tamaño de cada invasor y separación
const BAJA = 14; // cuánto bajan al llegar al borde

// ---- Sonidos propios (tonos del navegador). Se apagan con el mismo interruptor de la app ----
const suena = (f: () => void) => { if (sonidoActivo()) f(); };
const SON = {
  disparo: () => suena(() => tono(960, 0.07, "square", 0.02, 0, 360)),
  muere: () => suena(() => { tono(260, 0.14, "sawtooth", 0.05, 0, 70); tono(140, 0.18, "square", 0.03, 0.02, 50); }),
  golpe: () => suena(() => { tono(170, 0.4, "sawtooth", 0.07, 0, 40); tono(95, 0.45, "square", 0.05, 0.03, 35); }),
  ovni: () => suena(() => { [880, 660, 880, 660].forEach((f, i) => tono(f, 0.09, "triangle", 0.04, i * 0.1)); }),
  premio: () => suena(() => { [660, 880, 1175, 1568].forEach((f, i) => tono(f, 0.1, "square", 0.04, i * 0.07)); }),
  oleada: () => suena(() => { [392, 523, 659, 784].forEach((f, i) => tono(f, 0.12, "triangle", 0.06, i * 0.1)); }),
  baja: () => suena(() => tono(70, 0.06, "square", 0.04)),
  fin: () => suena(() => { [440, 370, 311, 247, 196].forEach((f, i) => tono(f, 0.2, "sawtooth", 0.05, i * 0.16)); }),
};

const aclarar = (hex: string) => { const n = parseInt(hex.slice(1), 16); const m = (c: number) => Math.round(c + (255 - c) * 0.42); return `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`; };
const entero = (hex: string) => parseInt(hex.slice(1), 16);

export function crearJuego(Phaser: typeof PhaserTipos, parent: HTMLElement, avisar: (e: EstadoCosmo) => void): ControlCosmo {
  let esc: Escena | null = null;
  const caja = parent.getBoundingClientRect();
  const H = Math.round(Math.min(780, Math.max(480, W * (caja.height / Math.max(1, caja.width))))), Y_NAVE = H - 58;

  class Escena extends Phaser.Scene {
    fase: Fase = "jugando";
    puntos = 0; vidas = 3; nivel = 1; oleada = 0;
    invasores: Invasor[] = [];
    balas: Img[] = []; balasE: (Img & { fase0?: number })[] = [];
    nave!: Img; llama!: Img; ovni: Img | null = null; capsula: Img | null = null;
    estrellas: { img: Img; v: number }[] = [];
    emisores: Record<string, PhaserTipos.GameObjects.Particles.ParticleEmitter> = {};
    pos = { ox: 40, oy: -200 };
    dir = 1; total = 1; entrando = true; cuadro = 0; tCuadro = 0;
    objetivo = W / 2; arrastre: { px: number; sx: number } | null = null;
    tDisparo = 0; tEnemigo = 0; tOvni = 12; inmune = 0; doble = 0; esperando = false;
    teclas!: PhaserTipos.Types.Input.Keyboard.CursorKeys; teclasAD: Record<string, PhaserTipos.Input.Keyboard.Key> = {};

    constructor() { super("cosmo"); }

    // ---- Dibujos: cada cuadradito de la grilla se pinta en un lienzo chico (el borde de arriba, un poco más claro, da relieve) ----
    pintar(clave: string, dib: Dibujo, color: string, esc: number) {
      if (this.textures.exists(clave)) return;
      const t = this.textures.createCanvas(clave, dib[0].length * esc, dib.length * esc)!;
      const c = t.getContext(), claro = aclarar(color);
      dib.forEach((fila, y) => [...fila].forEach((ch, x) => { if (ch === "#") { c.fillStyle = y === 0 || dib[y - 1][x] !== "#" ? claro : color; c.fillRect(x * esc, y * esc, esc, esc); } }));
      t.refresh();
    }
    rect(clave: string, w: number, h: number, color: string) {
      if (this.textures.exists(clave)) return;
      const t = this.textures.createCanvas(clave, w, h)!, c = t.getContext();
      c.fillStyle = color; c.fillRect(0, 0, w, h); c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(Math.floor(w / 2) - 1, 0, 2, h); t.refresh();
    }
    crearTexturas() {
      TIPOS.forEach((t, i) => t.formas.forEach((f, k) => this.pintar(`k${i}f${k}`, f, t.color, 2)));
      this.pintar("nave", NAVE, COLOR_NAVE, 3);
      this.pintar("ovni", OVNI, COLOR_OVNI, 3);
      this.rect("bala", 4, 14, "#FFF27A");
      this.rect("balaE", 5, 12, "#FF5AA5");
      this.rect("estrella", 2, 2, "#FFFFFF");
      if (!this.textures.exists("llama")) { const t = this.textures.createCanvas("llama", 8, 12)!, c = t.getContext(); c.fillStyle = "#FF9F1C"; c.fillRect(0, 0, 8, 7); c.fillStyle = "#FFE14A"; c.fillRect(2, 0, 4, 12); t.refresh(); }
      if (!this.textures.exists("capsula")) {
        const t = this.textures.createCanvas("capsula", 18, 18)!, c = t.getContext();
        c.fillStyle = "#FFE14A"; c.fillRect(1, 1, 16, 16); c.fillStyle = "#10213F"; c.fillRect(5, 4, 3, 10); c.fillRect(10, 4, 3, 10); t.refresh();
      }
      if (!this.textures.exists("chispa")) {
        const t = this.textures.createCanvas("chispa", 16, 16)!, c = t.getContext(), g = c.createRadialGradient(8, 8, 0, 8, 8, 8);
        g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.45, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = g; c.fillRect(0, 0, 16, 16); t.refresh();
      }
    }

    create() {
      esc = this;
      this.fase = "jugando"; this.puntos = 0; this.vidas = 3; this.nivel = 1; this.oleada = 0;
      this.invasores = []; this.balas = []; this.balasE = []; this.ovni = null; this.capsula = null; this.estrellas = []; this.emisores = {};
      this.inmune = 0; this.doble = 0; this.tDisparo = 0; this.tEnemigo = 0; this.tOvni = 12; this.esperando = false; this.entrando = true;
      this.crearTexturas();
      this.cameras.main.setBackgroundColor("#05060F");
      // estrellas que bajan despacito (tres capas)
      for (let i = 0; i < 44; i++) {
        const v = [12, 26, 48][i % 3], img = this.add.image(Math.random() * W, Math.random() * H, "estrella").setAlpha(0.25 + (i % 3) * 0.22).setScale(i % 3 === 2 ? 1.5 : 1);
        this.estrellas.push({ img, v });
      }
      this.nave = this.add.image(W / 2, Y_NAVE, "nave").setDepth(5);
      this.llama = this.add.image(W / 2, Y_NAVE + 18, "llama").setDepth(4);
      this.tweens.add({ targets: this.llama, scaleY: { from: 0.6, to: 1.15 }, duration: 110, yoyo: true, repeat: -1 });
      this.objetivo = W / 2;
      this.teclas = this.input.keyboard!.createCursorKeys();
      this.teclasAD = { a: this.input.keyboard!.addKey("A"), d: this.input.keyboard!.addKey("D") };
      // deslizar el dedo: la nave se mueve lo mismo que el dedo (así el dedo no tapa la nave)
      this.input.on("pointerdown", (p: PhaserTipos.Input.Pointer) => { this.arrastre = { px: p.x, sx: this.nave.x }; });
      this.input.on("pointermove", (p: PhaserTipos.Input.Pointer) => { if (this.arrastre && p.isDown) this.objetivo = Phaser.Math.Clamp(this.arrastre.sx + (p.x - this.arrastre.px), 22, W - 22); });
      this.input.on("pointerup", () => { this.arrastre = null; });
      this.nuevaOleada();
      this.avisarEstado();
    }

    avisarEstado() { avisar({ puntos: this.puntos, vidas: this.vidas, nivel: this.nivel, fase: this.fase, oleada: this.oleada, doble: this.doble > 0 }); }

    emisor(color: string) {
      return (this.emisores[color] ??= this.add.particles(0, 0, "chispa", {
        lifespan: { min: 280, max: 650 }, speed: { min: 50, max: 210 }, scale: { start: 1.1, end: 0 }, alpha: { start: 1, end: 0 },
        blendMode: "ADD", emitting: false, tint: entero(color), gravityY: 30,
      }).setDepth(8));
    }
    explotar(x: number, y: number, color: string, n = 12) { this.emisor(color).explode(n, x, y); }

    // ---- Oleadas: cada una trae más invasores, más rápidos y que disparan más seguido ----
    nuevaOleada() {
      this.oleada++;
      const cols = Math.min(9, 6 + Math.ceil(this.nivel / 2)), filas = Math.min(6, 3 + Math.ceil(this.nivel / 2));
      this.invasores.forEach((i) => i.img.destroy());
      this.invasores = [];
      for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) {
        const tipo = f % TIPOS.length;
        this.invasores.push({ img: this.add.image(0, -50, `k${tipo}f0`).setDepth(3), col: c, fila: f, tipo, vivo: true });
      }
      this.total = this.invasores.length; this.dir = 1; this.cuadro = 0; this.esperando = false; this.entrando = true;
      this.pos.ox = (W - ((cols - 1) * SX + AN_INV)) / 2 + AN_INV / 2; this.pos.oy = -filas * SY - 20;
      this.tweens.add({ targets: this.pos, oy: 86, duration: 1000, ease: "Cubic.easeOut", onComplete: () => { this.entrando = false; } });
      this.tEnemigo = 1.2;
      SON.oleada();
      this.avisarEstado();
    }

    disparar() {
      const xs = this.doble > 0 ? [-9, 9] : [0];
      for (const dx of xs) this.balas.push(this.add.image(this.nave.x + dx, this.nave.y - 20, "bala").setDepth(4));
      this.emisor("#FFF27A").explode(2, this.nave.x, this.nave.y - 18);
      SON.disparo();
    }

    disparoEnemigo() {
      const vivos = this.invasores.filter((i) => i.vivo);
      if (!vivos.length) return;
      // solo disparan los que están más abajo en su columna
      const bajos = new Map<number, Invasor>();
      vivos.forEach((i) => { const b = bajos.get(i.col); if (!b || i.fila > b.fila) bajos.set(i.col, i); });
      const lista = [...bajos.values()], elegido = lista[Math.floor(Math.random() * lista.length)];
      const b = this.add.image(elegido.img.x, elegido.img.y + 10, "balaE").setDepth(4) as Img & { fase0?: number };
      b.fase0 = Math.random() * 6;
      this.balasE.push(b);
    }

    golpeJugador() {
      if (this.inmune > 0 || this.fase !== "jugando") return;
      this.vidas--;
      this.explotar(this.nave.x, this.nave.y, "#7DF9FF", 18);
      this.explotar(this.nave.x, this.nave.y, "#FFA63D", 12);
      this.cameras.main.shake(260, 0.014); // leve temblor de pantalla
      this.cameras.main.flash(120, 255, 90, 90, false);
      SON.golpe();
      this.balasE.forEach((b) => b.destroy()); this.balasE = [];
      if (this.vidas <= 0) return this.terminar();
      this.inmune = 1.8; this.doble = 0;
      this.avisarEstado();
    }

    terminar() {
      if (this.fase === "fin") return;
      this.fase = "fin";
      this.nave.setVisible(false); this.llama.setVisible(false);
      this.explotar(this.nave.x, this.nave.y, "#7DF9FF", 22);
      SON.fin();
      this.avisarEstado();
    }

    update(_t: number, delta: number) {
      const dt = Math.min(delta, 70) / 1000;
      // estrellas
      for (const e of this.estrellas) { e.img.y += e.v * dt; if (e.img.y > H) { e.img.y = -2; e.img.x = Math.random() * W; } }
      if (this.fase !== "jugando") return;

      // ---- la nave ----
      const k = this.teclas, ad = this.teclasAD;
      const izq = k.left?.isDown || ad.a?.isDown, der = k.right?.isDown || ad.d?.isDown;
      if (izq || der) this.objetivo = Phaser.Math.Clamp(this.objetivo + (der ? 1 : -1) * 330 * dt * (izq && der ? 0 : 1), 22, W - 22);
      this.nave.x += (this.objetivo - this.nave.x) * Math.min(1, 16 * dt);
      this.llama.x = this.nave.x;
      if (this.inmune > 0) { this.inmune -= dt; this.nave.setAlpha(Math.floor(this.inmune * 10) % 2 ? 0.25 : 1); if (this.inmune <= 0) this.nave.setAlpha(1); }
      if (this.doble > 0) { this.doble -= dt; if (this.doble <= 0) this.avisarEstado(); }
      this.tDisparo -= dt;
      if (this.tDisparo <= 0 && !this.entrando) { this.tDisparo = this.doble > 0 ? 0.27 : 0.34; this.disparar(); } // disparo automático

      // ---- los invasores ----
      const vivos = this.invasores.filter((i) => i.vivo);
      if (vivos.length) {
        const falta = 1 - vivos.length / this.total;
        const vel = (24 + 8 * this.nivel) * (1 + 2.4 * falta) * (this.entrando ? 0 : 1);
        this.pos.ox += this.dir * vel * dt;
        let minC = 99, maxC = -1, maxF = -1;
        for (const i of vivos) { minC = Math.min(minC, i.col); maxC = Math.max(maxC, i.col); maxF = Math.max(maxF, i.fila); }
        const izqB = this.pos.ox + minC * SX - AN_INV / 2, derB = this.pos.ox + maxC * SX + AN_INV / 2;
        if (!this.entrando && ((this.dir > 0 && derB >= W - 6) || (this.dir < 0 && izqB <= 6))) {
          this.dir = -this.dir; this.pos.oy += BAJA; SON.baja();
          this.pos.ox += this.dir * 3;
        }
        this.tCuadro += dt;
        const cambio = Math.max(0.16, 0.5 / (1 + 2.4 * falta)); // aletean más rápido cuando quedan pocos
        const nuevoCuadro = this.tCuadro >= cambio;
        if (nuevoCuadro) { this.tCuadro = 0; this.cuadro ^= 1; }
        for (const i of vivos) {
          i.img.setPosition(this.pos.ox + i.col * SX, this.pos.oy + i.fila * SY);
          if (nuevoCuadro) i.img.setTexture(`k${i.tipo}f${this.cuadro}`);
        }
        if (this.pos.oy + maxF * SY + AL_INV / 2 >= Y_NAVE - 16 && !this.entrando) return this.terminar();
        // disparos de los invasores
        if (!this.entrando) {
          this.tEnemigo -= dt;
          if (this.tEnemigo <= 0 && this.balasE.length < 2 + Math.floor(this.nivel / 2)) { this.disparoEnemigo(); this.tEnemigo = Math.max(0.45, 1.25 - this.nivel * 0.09) * (0.6 + Math.random() * 0.8); }
        }
      } else if (!this.esperando) {
        // oleada limpia: premio y a la que sigue
        this.esperando = true; this.puntos += 100 * this.nivel; this.nivel++;
        this.balasE.forEach((b) => b.destroy()); this.balasE = [];
        this.time.delayedCall(900, () => { if (this.fase === "jugando") this.nuevaOleada(); });
        this.avisarEstado();
      }

      // ---- mis disparos ----
      for (let n = this.balas.length - 1; n >= 0; n--) {
        const b = this.balas[n]; b.y -= 440 * dt;
        let pego = false;
        if (b.y < -14) pego = true;
        else if (!this.entrando) {
          for (const i of vivos) {
            if (i.vivo && Math.abs(b.x - i.img.x) < AN_INV / 2 + 2 && Math.abs(b.y - i.img.y) < AL_INV / 2 + 7) {
              i.vivo = false; i.img.setVisible(false); this.puntos += TIPOS[i.tipo].puntos;
              this.explotar(i.img.x, i.img.y, TIPOS[i.tipo].color, 12); SON.muere();
              pego = true; this.avisarEstado(); break;
            }
          }
          const o = this.ovni;
          if (!pego && o && Math.abs(b.x - o.x) < 22 && Math.abs(b.y - o.y) < 14) {
            const pts = [50, 100, 150, 300][Math.floor(Math.random() * 4)];
            this.puntos += pts; this.explotar(o.x, o.y, COLOR_OVNI, 22); this.explotar(o.x, o.y, "#FFE14A", 12); SON.muere();
            this.capsula = this.add.image(o.x, o.y, "capsula").setDepth(4);
            o.destroy(); this.ovni = null; pego = true; this.avisarEstado();
          }
        }
        if (pego) { b.destroy(); this.balas.splice(n, 1); }
      }

      // ---- disparos de los invasores ----
      const vEnem = 140 + 10 * this.nivel;
      for (let n = this.balasE.length - 1; n >= 0; n--) {
        const b = this.balasE[n]; b.y += Math.min(vEnem, 250) * dt; b.fase0 = (b.fase0 ?? 0) + dt * 9; b.x += Math.sin(b.fase0) * 18 * dt;
        if (b.y > H + 10) { b.destroy(); this.balasE.splice(n, 1); continue; }
        if (Math.abs(b.x - this.nave.x) < 17 && Math.abs(b.y - this.nave.y) < 15) { b.destroy(); this.balasE.splice(n, 1); this.golpeJugador(); if (this.fase !== "jugando") return; }
      }

      // ---- el ovni de bonus y el premio que suelta ----
      this.tOvni -= dt;
      if (!this.ovni && this.tOvni <= 0 && vivos.length > 5 && !this.entrando) {
        const desdeIzq = Math.random() < 0.5;
        this.ovni = this.add.image(desdeIzq ? -24 : W + 24, 46, "ovni").setDepth(3);
        (this.ovni as Img & { sentido?: number }).sentido = desdeIzq ? 1 : -1;
        this.tOvni = 16 + Math.random() * 12; SON.ovni();
      }
      if (this.ovni) {
        const o = this.ovni as Img & { sentido: number };
        o.x += o.sentido * 85 * dt;
        if (o.x < -40 || o.x > W + 40) { o.destroy(); this.ovni = null; }
      }
      if (this.capsula) {
        this.capsula.y += 90 * dt;
        if (Math.abs(this.capsula.x - this.nave.x) < 26 && Math.abs(this.capsula.y - this.nave.y) < 20) {
          this.doble = 10; this.capsula.destroy(); this.capsula = null; SON.premio();
          this.explotar(this.nave.x, this.nave.y - 6, "#FFE14A", 10); this.avisarEstado();
        } else if (this.capsula.y > H + 10) { this.capsula.destroy(); this.capsula = null; }
      }
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, width: W, height: H, backgroundColor: "#05060F",
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
    reiniciar: () => { if (esc) { esc.scene.resume(); esc.scene.restart(); } },
    destruir: () => { esc = null; game.destroy(true); },
  };
}
