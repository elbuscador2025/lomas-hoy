import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";
import escenasJson from "../public/frames/escenas.json";

const { fontFamily } = loadFont("normal", { weights: ["500", "600", "800"], subsets: ["latin"] });
const FPS = 30;
const AZUL = "#1F5AD6", AZUL_OSCURO = "#0E2A5E", CELESTE = "#E3EDFF";

type Escena = { nombre: string; duracion: number; frames: { t: number; f: string }[]; marcas: Record<string, number> };
const escenas = escenasJson as Escena[];
const E = (n: string) => escenas.find((e) => e.nombre === n)!;

// ---------- guion ----------
type Subtitulo = { en: number; titulo: string; sub: string }; // "en" = segundos del video desde que empieza la escena
type Aviso = { en: number; dura: number; titulo: string; cuerpo: string };
type Guion = { nombre: string; velocidad: number; extra?: number; textos: Subtitulo[]; ejemplo?: [number, number][]; avisos?: Aviso[] };
const m = (n: string, k: string, v: number) => E(n).marcas[k] / v; // marca → segundos del video

const guion: Guion[] = [
  { nombre: "principal", velocidad: 1, textos: [{ en: 0, titulo: "El clima, claro y simple", sub: "¿Llueve? ¿Qué me pongo? En una frase" }] },
  { nombre: "secciones", velocidad: 1.15, textos: [{ en: 0, titulo: "Todo en una sola pantalla", sub: "Tren, luz, salud, mascotas y mucho más" }] },
  {
    nombre: "transporte", velocidad: 1.1,
    textos: [
      { en: 0, titulo: "Tren Roca y colectivos", sub: "Novedades y paros, al instante" },
      { en: m("transporte", "luz", 1.1), titulo: "Cortes de luz programados", sub: "Con aviso y la zona en el mapa" },
    ],
    ejemplo: [[m("transporte", "luz", 1.1), 99]],
  },
  {
    nombre: "salud", velocidad: 1.15,
    textos: [
      { en: 0, titulo: "Guardias y salitas", sub: "Teléfono y cómo llegar, a un toque" },
      { en: m("salud", "vets", 1.15), titulo: "Veterinarias de guardia", sub: "Las que atienden las 24 horas" },
      { en: m("salud", "farmacias", 1.15), titulo: "Farmacias abiertas ahora", sub: "Te lleva a las más cercanas" },
    ],
  },
  {
    nombre: "mascotas", velocidad: 1.2, extra: 1.5,
    textos: [
      { en: 0, titulo: "Mascotas perdidas", sub: "Entre vecinos, sin registro" },
      { en: m("mascotas", "cobran", 1.2), titulo: "Hoy cobran", sub: "El calendario de ANSES, a mano" },
      { en: m("mascotas", "feriados", 1.2), titulo: "Feriados a la vista", sub: "Te avisa antes y el mismo día" },
    ],
    ejemplo: [[0, m("mascotas", "cobran", 1.2)]],
  },
  {
    nombre: "avisos", velocidad: 1,
    textos: [{ en: 0, titulo: "Avisos en tu celular", sub: "Elegís cuáles querés recibir" }],
    ejemplo: [[4.6, 99]],
    avisos: [{ en: 4.6, dura: 2.7, titulo: "Llavallol: corte de luz", cuerpo: "120 usuarios sin luz · hasta las 15 hs" }],
  },
  {
    nombre: "municipio", velocidad: 1.35,
    textos: [
      { en: 0, titulo: "Panel para el municipio", sub: "Avisos para los vecinos, en minutos" },
      { en: m("municipio", "publicado", 1.35), titulo: "Le llega a todos los vecinos", sub: "El barrio va al principio del título" },
      { en: m("municipio", "publicado", 1.35) + 2.4, titulo: "Avisos firmados", sub: "Con historial y botón Compartir" },
    ],
    ejemplo: [[0, 99]],
    avisos: [{ en: m("municipio", "publicado", 1.35), dura: 3.2, titulo: "Villa Albertina: Castración gratuita de 10 a 15 hs", cuerpo: "Equipo de ejemplo · Deportes: Jornada gratuita para perros y gatos en la plaza del barrio." }],
  },
  {
    nombre: "invitar", velocidad: 1, extra: 1.3,
    textos: [{ en: 0, titulo: "Sumá a tu equipo", sub: "Enlace de invitación de un solo uso" }],
    ejemplo: [[0, 99]],
  },
];

const INTRO = 3.3, SOLAPE = 0.45, OUTRO = 6.6;
const seg = (s: number) => Math.round(s * FPS);

// posición de cada escena en el video
let cursor = INTRO - SOLAPE;
const tramos = guion.map((g) => {
  const dur = E(g.nombre).duracion / g.velocidad + (g.extra ?? 0);
  const t = { ...g, desde: cursor, dur };
  cursor += dur - SOLAPE;
  return t;
});
const INICIO_OUTRO = cursor + SOLAPE - 0.2;
export const DURACION = seg(INICIO_OUTRO + OUTRO);

// ---------- piezas ----------
const cuadro = (e: Escena, t: number) => {
  let a = 0, b = e.frames.length - 1;
  while (a < b) { const mid = (a + b + 1) >> 1; if (e.frames[mid].t <= t) a = mid; else b = mid - 1; }
  return e.frames[a].f;
};

const Fondo: React.FC = () => {
  const f = useCurrentFrame();
  const mov = Math.sin(f / 90) * 40;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(165deg, ${AZUL} 0%, #1747B0 45%, ${AZUL_OSCURO} 100%)` }}>
      <div style={{ position: "absolute", width: 900, height: 900, borderRadius: "50%", left: -300 + mov, top: -260, background: "radial-gradient(circle, rgba(255,255,255,.16), rgba(255,255,255,0) 65%)" }} />
      <div style={{ position: "absolute", width: 1000, height: 1000, borderRadius: "50%", right: -420 - mov, bottom: -300, background: "radial-gradient(circle, rgba(120,170,255,.28), rgba(120,170,255,0) 65%)" }} />
    </AbsoluteFill>
  );
};

const PW = 620, PH = 1342, MARCO = 24; // pantalla y bisel
const PHONE_X = (1080 - PW) / 2, PHONE_Y = 486;

const Celular: React.FC<{ nombre: string; velocidad: number; entra: boolean }> = ({ nombre, velocidad, entra }) => {
  const f = useCurrentFrame();
  const e = E(nombre);
  const t = Math.min((f / FPS) * velocidad, e.duracion);
  const op = entra ? interpolate(f, [0, seg(SOLAPE)], [0, 1], { extrapolateRight: "clamp" }) : 1;
  return <Img src={staticFile(`frames/${nombre}/${cuadro(e, t)}`)} style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, objectFit: "cover", opacity: op }} />;
};

const Marco: React.FC<{ children: React.ReactNode; subida: number }> = ({ children, subida }) => (
  <div style={{ position: "absolute", left: PHONE_X - MARCO, top: PHONE_Y - MARCO + subida, width: PW + MARCO * 2, height: PH + MARCO * 2 }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: 96, background: "linear-gradient(145deg,#2a3550,#0b1220)", boxShadow: "0 50px 120px rgba(5,15,50,.55), 0 0 0 3px rgba(255,255,255,.14) inset" }} />
    <div style={{ position: "absolute", left: MARCO, top: MARCO, width: PW, height: PH, borderRadius: 72, overflow: "hidden", background: "#fff" }}>
      {children}
      <div style={{ position: "absolute", top: 9, left: "50%", marginLeft: -48, width: 96, height: 26, borderRadius: 16, background: "#05080f" }} />
    </div>
  </div>
);

const Chip: React.FC<{ texto: string }> = ({ texto }) => (
  <div style={{ position: "absolute", right: PHONE_X - 10, top: PHONE_Y - 74, background: "#FFD54A", color: "#3a2b00", fontFamily, fontWeight: 800, fontSize: 30, padding: "10px 24px", borderRadius: 999, boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}>{texto}</div>
);

const Banner: React.FC<{ a: Aviso & { desde: number } }> = ({ a }) => {
  const f = useCurrentFrame() - seg(a.desde);
  const entra = spring({ frame: f, fps: FPS, config: { damping: 16, stiffness: 140 } });
  const sale = interpolate(f, [seg(a.dura) - 8, seg(a.dura)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (f < 0 || f > seg(a.dura)) return null;
  const y = interpolate(entra, [0, 1], [-260, 0]) - sale * 260;
  return (
    <div style={{ position: "absolute", left: PHONE_X + 14, width: PW - 28, top: PHONE_Y + 62 + y, borderRadius: 40, background: "rgba(250,251,255,.97)", boxShadow: "0 24px 60px rgba(5,15,50,.45)", padding: "22px 26px", display: "flex", gap: 20, fontFamily, color: "#0E2A5E" }}>
      <Img src={staticFile("icono.png")} style={{ width: 76, height: 76, borderRadius: 20, flex: "none" }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: "#5B6F99", letterSpacing: 1 }}>LOMAS HOY · ahora</div>
        <div style={{ fontSize: 31, fontWeight: 800, lineHeight: 1.18, marginTop: 4 }}>{a.titulo}</div>
        <div style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.25, marginTop: 6, color: "#2b3f6b" }}>{a.cuerpo}</div>
      </div>
    </div>
  );
};

const Texto: React.FC<{ titulo: string; sub: string; desde: number; hasta: number }> = ({ titulo, sub, desde, hasta }) => {
  const f = useCurrentFrame();
  const d = seg(desde), h = seg(hasta);
  if (f < d || f > h) return null;
  const entra = spring({ frame: f - d - 3, fps: FPS, config: { damping: 18, stiffness: 120 } });
  const sale = interpolate(f, [h - 9, h - 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 118, textAlign: "center", fontFamily, color: "#fff", opacity: Math.min(1, entra) * (1 - sale), transform: `translateY(${interpolate(entra, [0, 1], [34, 0]) - sale * 20}px)` }}>
      <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.06, letterSpacing: -1.5, textShadow: "0 6px 30px rgba(5,15,50,.35)" }}>{titulo}</div>
      <div style={{ fontSize: 42, fontWeight: 500, lineHeight: 1.22, marginTop: 20, color: CELESTE }}>{sub}</div>
    </div>
  );
};

const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const a = spring({ frame: f, fps: FPS, config: { damping: 14, stiffness: 110 } });
  const b = spring({ frame: f - 14, fps: FPS, config: { damping: 18, stiffness: 100 } });
  const sale = interpolate(f, [seg(INTRO - 0.95), seg(INTRO - 0.35)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily, color: "#fff", opacity: 1 - sale }}>
      <div style={{ transform: `scale(${a})` }}><Marca tam={230} /></div>
      <div style={{ fontSize: 176, fontWeight: 800, letterSpacing: -4, marginTop: 50, transform: `scale(${0.7 + 0.3 * a})`, opacity: a }}>Lomas Hoy</div>
      <div style={{ fontSize: 56, fontWeight: 500, textAlign: "center", lineHeight: 1.25, width: 860, marginTop: 26, color: CELESTE, opacity: Math.min(1, b), transform: `translateY(${interpolate(b, [0, 1], [30, 0])}px)` }}>
        Todo lo que pasa hoy en Lomas, en una pantalla
      </div>
    </AbsoluteFill>
  );
};

const Marca: React.FC<{ tam: number }> = ({ tam }) => (
  <div style={{ width: tam, height: tam, borderRadius: tam * 0.26, background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 30px 80px rgba(5,15,50,.5)" }}>
    <svg width={tam * 0.66} height={tam * 0.66} viewBox="0 0 24 24" fill="none" stroke={AZUL} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4v1.5M3.8 6.3l1 1M2 12h1.5M14.2 6.3l-1 1" /><path d="M7 10a3.5 3.5 0 0 1 6.2-2.2" /><path d="M8 20a4 4 0 0 1-.4-7.98A5.2 5.2 0 0 1 17.8 13a3.5 3.5 0 0 1-.3 7z" />
    </svg>
  </div>
);

const Check: React.FC = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#7CF0A8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" stroke="rgba(124,240,168,.45)" /><path d="M7 12.5l3.2 3.2L17 9" /></svg>
);

const Cierre: React.FC = () => {
  const f = useCurrentFrame();
  const item = (i: number) => spring({ frame: f - 8 - i * 22, fps: FPS, config: { damping: 18, stiffness: 110 } });
  const url = spring({ frame: f - 90, fps: FPS, config: { damping: 16, stiffness: 100 } });
  const entra = interpolate(f, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ fontFamily, color: "#fff", opacity: entra }}>
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ display: "inline-block" }}><Marca tam={150} /></div>
        <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -3, marginTop: 24 }}>Lomas Hoy</div>
      </div>
      <div style={{ position: "absolute", top: 620, left: 110, right: 70 }}>
        {["Gratis para el vecino", "Sin registro", "Se instala en el celular"].map((t, i) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 46, opacity: Math.min(1, item(i)), transform: `translateX(${interpolate(item(i), [0, 1], [-60, 0])}px)` }}>
            <Check />
            <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: -1, whiteSpace: "nowrap" }}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 1130, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: Math.min(1, url), transform: `scale(${0.85 + 0.15 * Math.min(1, url)})` }}>
        <div style={{ background: "#fff", borderRadius: 40, padding: 24, boxShadow: "0 30px 80px rgba(5,15,50,.45)" }}>
          <Img src={staticFile("qr-app.png")} style={{ width: 400, height: 400, display: "block" }} />
        </div>
        <div style={{ marginTop: 40, background: "#fff", color: AZUL_OSCURO, fontSize: 60, fontWeight: 800, padding: "18px 54px", borderRadius: 999, letterSpacing: -1 }}>lomas-hoy.vercel.app</div>
        <div style={{ marginTop: 46, fontSize: 30, fontWeight: 500, color: CELESTE, textAlign: "center", width: 860, lineHeight: 1.3 }}>
          Herramienta ciudadana independiente.<br />No es una aplicación oficial del Municipio.
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Presentacion: React.FC = () => {
  const f = useCurrentFrame();
  const subida = interpolate(spring({ frame: f - seg(INTRO - 0.6), fps: FPS, config: { damping: 18, stiffness: 90 } }), [0, 1], [900, 0]);
  const salida = interpolate(f, [seg(INICIO_OUTRO) - 6, seg(INICIO_OUTRO) + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // textos, chips y avisos con tiempo absoluto
  const textos: { titulo: string; sub: string; desde: number; hasta: number }[] = [];
  const chips: [number, number][] = [];
  const banners: (Aviso & { desde: number })[] = [];
  tramos.forEach((t, i) => {
    const finEscena = t.desde + t.dur - (i < tramos.length - 1 ? SOLAPE : 0);
    t.textos.forEach((x, j) => {
      const desde = t.desde + x.en + (j === 0 ? 0.1 : 0);
      const hasta = j + 1 < t.textos.length ? t.desde + t.textos[j + 1].en : finEscena;
      textos.push({ titulo: x.titulo, sub: x.sub, desde, hasta });
    });
    (t.ejemplo ?? []).forEach(([a, b]) => chips.push([t.desde + a, Math.min(t.desde + b, finEscena)]));
    (t.avisos ?? []).forEach((a) => banners.push({ ...a, desde: t.desde + a.en }));
  });
  return (
    <AbsoluteFill style={{ background: AZUL }}>
      <Fondo />
      <Intro />
      <AbsoluteFill style={{ opacity: 1 - salida }}>
        {textos.map((x, i) => <Texto key={i} {...x} />)}
        <Marco subida={subida}>
          {tramos.map((t, i) => (
            <Sequence key={t.nombre} from={seg(t.desde)} durationInFrames={seg(t.dur) + 2} layout="none">
              <Sequence from={0} durationInFrames={seg(t.dur) + 2}>
                <Celular nombre={t.nombre} velocidad={t.velocidad} entra={i > 0} />
              </Sequence>
            </Sequence>
          ))}
        </Marco>
        {chips.map(([a, b], i) => {
          const visible = f >= seg(a) && f <= seg(b);
          return visible ? <Chip key={i} texto="Datos de ejemplo" /> : null;
        })}
        {banners.map((a, i) => <Banner key={i} a={a} />)}
      </AbsoluteFill>
      <Sequence from={seg(INICIO_OUTRO)}><Cierre /></Sequence>
    </AbsoluteFill>
  );
};
