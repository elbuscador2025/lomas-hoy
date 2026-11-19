// CARRERA DE AUTOPISTA: el sonido. El motor del camión se genera por código (sin archivos de audio) y el estéreo del tablero reproduce música.
// Música: un reproductor del navegador pasado por un control de volumen propio (así el volumen también funciona en iPhone y no depende del volumen del motor).
// Las canciones del jugador se eligen desde su teléfono, se escuchan ahí mismo y se guardan en el teléfono (IndexedDB): no se suben a ningún servidor.
export const URL_PRUEBA = "/juegos/autopista/cancion-prueba.mp3";
export const MAX_CANCIONES = 10;
export const MAX_BYTES = 100 * 1024 * 1024;
const CLAVE_VOL_MUSICA = "lomas-hoy:autopista-vol-musica", CLAVE_VOL_MOTOR = "lomas-hoy:autopista-vol-motor";

export type Pista = { id: string; nombre: string; tipo: "prueba" | "mia"; tam: number; noDisponible?: boolean };
export type EstadoEstereo = { encendido: boolean; sonando: boolean; actual: number; pistas: Pista[]; volMusica: number; volMotor: number; mensaje: string; ocupado: boolean; usado: number };
export type AudioAutopista = {
  iniciar: () => void; // se llama dentro de un toque del jugador (regla de los navegadores)
  arrancarMusica: () => void;
  alternar: () => void; siguiente: () => void; anterior: () => void; reproducir: (i: number) => void;
  volumenMusica: (v: number) => void; volumenMotor: (v: number) => void; motorActivo: (v: boolean) => void;
  agregar: (archivos: File[]) => Promise<void>; quitar: (id: string) => Promise<void>;
  motor: (velocidad: number, acelerando: boolean) => void; choque: () => void; silencio: () => void;
  estado: () => EstadoEstereo; destruir: () => void;
};

// ---- Canciones guardadas en el teléfono ----
type Guardada = { id: string; nombre: string; tam: number; creado: number; blob: Blob };
const abrirBD = () => new Promise<IDBDatabase>((ok, mal) => {
  const espera = setTimeout(() => mal(new Error("tiempo")), 6000); // si el teléfono no responde, no se queda esperando para siempre
  const r = indexedDB.open("lomas-hoy-autopista", 1);
  r.onupgradeneeded = () => { r.result.createObjectStore("canciones", { keyPath: "id" }); };
  r.onsuccess = () => { clearTimeout(espera); ok(r.result); }; r.onerror = () => { clearTimeout(espera); mal(r.error); };
});
const pedido = <T,>(r: IDBRequest<T>) => new Promise<T>((ok, mal) => { r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); });
async function bd<T>(modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrirBD();
  try {
    const t = db.transaction("canciones", modo);
    const fin = new Promise<void>((ok, mal) => { t.oncomplete = () => ok(); t.onerror = () => mal(t.error); t.onabort = () => mal(t.error); }); // se prepara antes, así no se pierde el aviso
    const r = await pedido(f(t.objectStore("canciones")));
    if (modo === "readwrite") await fin;
    return r;
  } finally { db.close(); }
}
const leerNumero = (c: string, def: number) => { try { const v = localStorage.getItem(c); return v === null ? def : Math.max(0, Math.min(1, Number(v))); } catch { return def; } };
const guardarNumero = (c: string, v: number) => { try { localStorage.setItem(c, String(v)); } catch {} };
const EXT_AUDIO = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|weba|webm|mp4)$/i;
const limpiarNombre = (n: string) => n.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_]+/g, " ").trim().slice(0, 60) || "Canción";

export function crearAudio(avisar: (e: EstadoEstereo) => void): AudioAutopista {
  let ctx: AudioContext | null = null, musica: GainNode | null = null, motorG: GainNode | null = null;
  let o1: OscillatorNode | null = null, o2: OscillatorNode | null = null, filtro: BiquadFilterNode | null = null, vientoG: GainNode | null = null, ruido: AudioBuffer | null = null;
  let vivo = true, motorOn = true;
  const el = new Audio(); el.crossOrigin = "anonymous"; el.preload = "none"; // crossOrigin: la canción puede venir del almacenamiento de archivos (otro sitio) y tiene que poder pasar por el control de volumen
  let urlPrueba = URL_PRUEBA; el.id = "ap-audio"; el.setAttribute("playsinline", ""); el.style.display = "none";
  document.body.appendChild(el);
  let url: string | null = null, silencio: string | null = null;
  const e: EstadoEstereo = { encendido: false, sonando: false, actual: 0, pistas: [{ id: "prueba", nombre: "Canción de prueba", tipo: "prueba", tam: 0 }], volMusica: leerNumero(CLAVE_VOL_MUSICA, 0.7), volMotor: leerNumero(CLAVE_VOL_MOTOR, 0.6), mensaje: "", ocupado: false, usado: 0 };
  const emitir = () => { if (vivo) avisar({ ...e, pistas: e.pistas.map((p) => ({ ...p })) }); };
  const mensaje = (t: string) => { e.mensaje = t; emitir(); };

  async function cargarMias() {
    try {
      const todas = (await bd("readonly", (s) => s.getAll())) as Guardada[];
      todas.sort((a, b) => a.creado - b.creado);
      e.pistas = [e.pistas[0], ...todas.map((g): Pista => ({ id: g.id, nombre: g.nombre, tipo: "mia", tam: g.tam }))];
      e.usado = todas.reduce((t, g) => t + g.tam, 0);
    } catch { /* sin almacenamiento: solo la canción de prueba */ }
    emitir();
  }
  const t0 = setTimeout(cargarMias, 600);
  // qué canción de prueba hay cargada ahora (la original o la que subí desde el panel): solo se pide el dato, el archivo se baja al tocar «Jugar»
  fetch("/api/estereo").then((r) => (r.ok ? r.json() : null)).then((c) => { if (vivo && c?.url && c?.nombre) { urlPrueba = c.url; e.pistas[0] = { ...e.pistas[0], nombre: String(c.nombre).slice(0, 80), tam: Number(c.tam) || 0 }; emitir(); } }).catch(() => {});

  const disponibles = () => e.pistas.map((p, i) => [p, i] as const).filter(([p]) => !p.noDisponible).map(([, i]) => i);
  async function reproducir(i: number) {
    const p = e.pistas[i]; if (!p || !ctx) return;
    e.actual = i;
    try {
      if (url) { URL.revokeObjectURL(url); url = null; }
      if (silencio) { URL.revokeObjectURL(silencio); silencio = null; }
      if (p.tipo === "prueba") el.src = urlPrueba;
      else { const g = (await bd("readonly", (s) => s.get(p.id))) as Guardada | undefined; if (!g) throw new Error("falta"); url = URL.createObjectURL(g.blob); el.src = url; }
      await el.play(); e.sonando = true; e.mensaje = "";
    } catch (err) {
      e.sonando = false;
      if ((err as DOMException)?.name === "NotAllowedError") e.mensaje = "Tocá ▶ para escuchar la música.";
      else if (p.tipo === "prueba") { p.noDisponible = true; e.mensaje = "La canción de prueba todavía no está cargada."; const otra = disponibles().find((k) => k !== i); if (otra !== undefined) { emitir(); return reproducir(otra); } }
      else e.mensaje = "No se pudo reproducir esa canción.";
    }
    emitir();
  }
  const siguiente = () => { const d = disponibles(); if (!d.length) return; reproducir(d[(Math.max(0, d.indexOf(e.actual)) + 1) % d.length]); };
  el.onended = () => siguiente();
  el.onpause = () => { if (e.sonando && !el.ended) { e.sonando = false; emitir(); } };
  el.onplay = () => { if (!e.sonando) { e.sonando = true; emitir(); } };
  el.onerror = () => { if (el.src && e.pistas[e.actual]?.tipo === "prueba" && !e.pistas[e.actual].noDisponible) { /* lo maneja reproducir() */ } };

  function sonidoMotor() {
    if (!ctx || o1) return;
    o1 = ctx.createOscillator(); o1.type = "sawtooth"; o2 = ctx.createOscillator(); o2.type = "square";
    const g1 = ctx.createGain(); g1.gain.value = 0.5; const g2 = ctx.createGain(); g2.gain.value = 0.22;
    filtro = ctx.createBiquadFilter(); filtro.type = "lowpass"; filtro.frequency.value = 300; filtro.Q.value = 2.5;
    o1.connect(g1).connect(filtro); o2.connect(g2).connect(filtro); filtro.connect(motorG!);
    // viento: ruido filtrado que crece con la velocidad
    const largo = ctx.sampleRate; ruido = ctx.createBuffer(1, largo, ctx.sampleRate);
    const d = ruido.getChannelData(0); for (let k = 0; k < largo; k++) d[k] = Math.random() * 2 - 1;
    const fuente = ctx.createBufferSource(); fuente.buffer = ruido; fuente.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 0.6;
    vientoG = ctx.createGain(); vientoG.gain.value = 0;
    fuente.connect(bp).connect(vientoG).connect(motorG!);
    o1.start(); o2.start(); fuente.start();
  }
  const sincronizarMotor = () => { if (motorG && ctx && !motorOn) motorG.gain.setTargetAtTime(0, ctx.currentTime, 0.05); }; // el motor suena solo mientras se juega: lo maneja motor()

  const api: AudioAutopista = {
    iniciar() {
      if (ctx || !vivo) { ctx?.resume(); return; }
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new AC(); ctx.resume();
        // se "destraba" el reproductor con este mismo toque (un silencio cortito): así después puede cambiar de canción sin pedir otro toque, también en iPhone
        try { const w = new DataView(new ArrayBuffer(44 + 800)); const txt = (o: number, t: string) => [...t].forEach((c, k) => w.setUint8(o + k, c.charCodeAt(0))); txt(0, "RIFF"); w.setUint32(4, 36 + 800, true); txt(8, "WAVEfmt "); w.setUint32(16, 16, true); w.setUint16(20, 1, true); w.setUint16(22, 1, true); w.setUint32(24, 8000, true); w.setUint32(28, 8000, true); w.setUint16(32, 1, true); w.setUint16(34, 8, true); txt(36, "data"); w.setUint32(40, 800, true); for (let k = 0; k < 800; k++) w.setUint8(44 + k, 128); silencio = URL.createObjectURL(new Blob([w], { type: "audio/wav" })); el.src = silencio; el.play().then(() => el.pause()).catch(() => {}); } catch {}
        musica = ctx.createGain(); musica.gain.value = e.volMusica;
        ctx.createMediaElementSource(el).connect(musica).connect(ctx.destination);
        motorG = ctx.createGain(); motorG.gain.value = 0; motorG.connect(ctx.destination);
        sonidoMotor(); sincronizarMotor();
        e.encendido = true; emitir();
      } catch { mensaje("Este teléfono no permite el sonido del juego."); }
    },
    arrancarMusica() { if (!ctx || e.sonando) return; const d = disponibles(); if (d.length) reproducir(d.includes(e.actual) ? e.actual : d[0]); },
    alternar() {
      api.iniciar();
      if (!ctx) return;
      if (e.sonando) { el.pause(); e.sonando = false; emitir(); }
      else if (el.src && !el.ended && e.pistas[e.actual] && !e.pistas[e.actual].noDisponible) el.play().then(() => { e.sonando = true; e.mensaje = ""; emitir(); }).catch(() => reproducir(e.actual));
      else api.arrancarMusica();
    },
    siguiente() { api.iniciar(); siguiente(); },
    anterior() { api.iniciar(); const d = disponibles(); if (!d.length) return; reproducir(d[(Math.max(0, d.indexOf(e.actual)) - 1 + d.length) % d.length]); },
    reproducir(i) { api.iniciar(); reproducir(i); },
    volumenMusica(v) { e.volMusica = Math.max(0, Math.min(1, v)); guardarNumero(CLAVE_VOL_MUSICA, e.volMusica); if (musica && ctx) musica.gain.setTargetAtTime(e.volMusica, ctx.currentTime, 0.03); emitir(); },
    volumenMotor(v) { e.volMotor = Math.max(0, Math.min(1, v)); guardarNumero(CLAVE_VOL_MOTOR, e.volMotor); sincronizarMotor(); emitir(); },
    motorActivo(v) { motorOn = v; sincronizarMotor(); },
    async agregar(archivos) {
      e.ocupado = true; e.mensaje = ""; emitir();
      let ok = 0; const rechazos: string[] = [];
      for (const f of archivos) {
        if (!(f.type.startsWith("audio/") || EXT_AUDIO.test(f.name))) { rechazos.push(`«${limpiarNombre(f.name)}» no es un archivo de audio`); continue; }
        const cant = e.pistas.filter((p) => p.tipo === "mia").length;
        if (cant >= MAX_CANCIONES) { rechazos.push(`ya hay ${MAX_CANCIONES} canciones: quitá alguna para agregar otra`); break; }
        if (e.usado + f.size > MAX_BYTES) { rechazos.push(`«${limpiarNombre(f.name)}» no entra: el límite es ${Math.round(MAX_BYTES / 1048576)} MB`); continue; }
        try {
          const g: Guardada = { id: `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, nombre: limpiarNombre(f.name), tam: f.size, creado: Date.now(), blob: f };
          await bd("readwrite", (s) => s.put(g));
          e.pistas.push({ id: g.id, nombre: g.nombre, tipo: "mia", tam: g.tam }); e.usado += g.tam; ok++;
        } catch { rechazos.push(`«${limpiarNombre(f.name)}» no se pudo guardar en el teléfono`); }
      }
      if (ok) { try { navigator.storage?.persist?.().catch(() => {}); } catch {} } // se pide que el teléfono no borre lo guardado, sin esperar la respuesta (en algunos navegadores sale un cartel)
      e.ocupado = false;
      e.mensaje = [ok ? `Se agregaron ${ok} ${ok === 1 ? "canción" : "canciones"}.` : "", ...rechazos].filter(Boolean).join(" ");
      emitir();
    },
    async quitar(id) {
      try { await bd("readwrite", (s) => s.delete(id)); } catch {}
      const i = e.pistas.findIndex((p) => p.id === id);
      if (i < 0) return;
      const quitaba = i === e.actual;
      const [p] = e.pistas.splice(i, 1); e.usado = Math.max(0, e.usado - p.tam);
      if (quitaba) { el.pause(); e.sonando = false; el.removeAttribute("src"); e.actual = 0; } else if (i < e.actual) e.actual--;
      e.mensaje = "Canción quitada."; emitir();
    },
    motor(vp, acel) {
      if (!ctx || !o1 || !o2 || !filtro || !vientoG) return;
      const t = ctx.currentTime, f = 40 + vp * 92 + (acel ? 7 : 0);
      o1.frequency.setTargetAtTime(f, t, 0.07); o2.frequency.setTargetAtTime(f * 0.5, t, 0.07);
      filtro.frequency.setTargetAtTime(240 + vp * 1000 + (acel ? 160 : 0), t, 0.08);
      vientoG.gain.setTargetAtTime(vp * vp * 0.35, t, 0.1);
      motorG?.gain.setTargetAtTime(motorOn ? e.volMotor * (0.05 + 0.1 * vp + (acel ? 0.04 : 0)) * 3 : 0, t, 0.06);
    },
    choque() {
      if (!ctx || !motorOn) return;
      const t = ctx.currentTime, largo = Math.floor(ctx.sampleRate * 0.5), b = ctx.createBuffer(1, largo, ctx.sampleRate), d = b.getChannelData(0);
      for (let k = 0; k < largo; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / largo) ** 2;
      const s = ctx.createBufferSource(); s.buffer = b; const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100;
      const g = ctx.createGain(); g.gain.value = 0.9 * e.volMotor + 0.1; s.connect(lp).connect(g).connect(ctx.destination); s.start(t);
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
      const go = ctx.createGain(); go.gain.setValueAtTime(0.5 * (e.volMotor + 0.1), t); go.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.connect(go).connect(ctx.destination); o.start(t); o.stop(t + 0.4);
    },
    silencio() { if (motorG && ctx) motorG.gain.setTargetAtTime(0, ctx.currentTime, 0.04); },
    estado: () => ({ ...e, pistas: e.pistas.map((p) => ({ ...p })) }),
    destruir() {
      vivo = false; clearTimeout(t0);
      try { o1?.stop(); o2?.stop(); } catch {}
      el.pause(); el.removeAttribute("src"); el.load(); el.remove();
      if (url) URL.revokeObjectURL(url);
      ctx?.close().catch(() => {}); ctx = null;
    },
  };
  (el as unknown as { __audio: unknown }).__audio = { api, ganancias: () => ({ musica: musica?.gain.value ?? null, motor: motorG?.gain.value ?? null }) }; // para las pruebas
  return api;
}
