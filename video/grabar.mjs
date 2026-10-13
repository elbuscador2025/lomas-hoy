// Graba la app real (https://lomas-hoy.vercel.app) en un celular de 390 px de ancho y guarda los cuadros de cada escena.
// Uso: node grabar.mjs <carpeta-scratchpad>   (ahí está demo.json con el usuario de ejemplo; no se muestra en el video)
import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const SP = process.argv[2];
const S = "https://lomas-hoy.vercel.app", J = { "Content-Type": "application/json" };
const demo = JSON.parse(fs.readFileSync(path.join(SP, "demo.json"), "utf8"));
const env = Object.fromEntries(fs.readFileSync("../.env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const redis = async (c) => (await (await fetch(env.KV_REST_API_URL + "/pipeline", { method: "POST", headers: { Authorization: "Bearer " + env.KV_REST_API_TOKEN }, body: JSON.stringify(c) })).json()).map((x) => x.result);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const FRAMES = path.resolve("public/frames");
fs.mkdirSync(FRAMES, { recursive: true });
for (const x of fs.readdirSync(FRAMES)) fs.rmSync(path.join(FRAMES, x), { recursive: true, force: true }); // se vacía la carpeta (sin borrarla)

// ---------- datos de ejemplo ----------
async function entrarComo(correo, clave) {
  const r = await fetch(S + "/api/entrar", { method: "POST", headers: J, body: JSON.stringify({ correo, clave }) });
  return r.headers.get("set-cookie").split(";")[0];
}
// (no hay avisos reales todavía: se limpian los de pruebas anteriores y el tope diario para que la grabación publique bien)
const [viejos] = await redis([["HKEYS", "avisos"]]);
const [topes] = await redis([["KEYS", "muni:publicados:*"]]);
await redis([...viejos.map((k) => ["HDEL", "avisos", k]), ...topes.map((k) => ["DEL", k]), ["DEL", "push:subs"]]);
const cookieDemo = await entrarComo(demo.correo, demo.clave);
// corte programado de ejemplo (el proceso automático lo reemplaza por el dato real a los pocos minutos)
const manana = new Date(Date.now() + 86400_000 - 3 * 3600_000).toISOString().slice(0, 10);
await redis([["SET", "datos:programados", JSON.stringify({ clave: "programados", ok_en: new Date().toISOString(), intento_en: new Date().toISOString(), error: null,
  contenido: { cortes: [{ id: "ejemplo", localidad: "Llavallol", lat: -34.7985, lng: -58.43, inicio: `${manana}T08:00`, fin: `${manana}T16:00`, clientes: 120, motivo: "Pedido de instalacion para obras" }] } })]]);

// ---------- navegador ----------
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, args: ["--no-first-run", "--hide-scrollbars", "--window-size=520,1000"] });
await b.defaultBrowserContext().overridePermissions(S, ["notifications"]);
b.on("targetcreated", async (t) => { if (t.type() === "page" && t.url() !== "about:blank" && !t.url().startsWith(S)) { const p = await t.page().catch(() => null); p?.close().catch(() => {}); } });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.evaluateOnNewDocument(() => {
  // marca el toque con un círculo, para que se vea dónde toca el dedo
  addEventListener("touchstart", (e) => {
    const t = e.touches[0]; const d = document.createElement("div");
    d.style.cssText = `position:fixed;left:${t.clientX}px;top:${t.clientY}px;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:rgba(31,90,214,.28);border:3px solid rgba(31,90,214,.85);pointer-events:none;z-index:2147483647`;
    document.documentElement.appendChild(d);
    d.animate([{ transform: "scale(.4)", opacity: 1 }, { transform: "scale(1.25)", opacity: 0 }], { duration: 650, easing: "ease-out" }).onfinish = () => d.remove();
  }, true);
});
const cdp = await p.createCDPSession();

// ---------- escenas ----------
const escenas = [];
let actual = null;
async function escena(nombre, fn) {
  const dir = path.join(FRAMES, nombre); fs.mkdirSync(dir, { recursive: true });
  const e = { nombre, frames: [], t0: null, duracion: 0, marcas: {} }; let n = 0; actual = e;
  const alRecibir = async ({ data, metadata, sessionId }) => {
    const t = metadata.timestamp; if (e.t0 === null) e.t0 = t;
    const f = `f${String(++n).padStart(5, "0")}.jpg`;
    fs.writeFileSync(path.join(dir, f), Buffer.from(data, "base64"));
    e.frames.push({ t: +(t - e.t0).toFixed(3), f });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  };
  cdp.on("Page.screencastFrame", alRecibir);
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  const inicio = Date.now();
  await fn((m) => { e.marcas[m] = +((Date.now() - inicio) / 1000).toFixed(2); });
  e.duracion = +((Date.now() - inicio) / 1000).toFixed(2);
  await cdp.send("Page.stopScreencast");
  cdp.off("Page.screencastFrame", alRecibir);
  escenas.push(e);
  console.log(`escena ${nombre}: ${e.duracion}s, ${e.frames.length} cuadros`);
}

const centro = (sel, texto, ultimo = false) => p.evaluate((sel, texto, ultimo) => {
  const lista = [...document.querySelectorAll(sel)].filter((x) => !texto || x.textContent.includes(texto));
  const el = ultimo ? lista[lista.length - 1] : lista[0];
  if (!el) return null; el.scrollIntoView({ block: "center", behavior: "instant" });
  const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, sel, texto, ultimo);
async function tocar(sel, texto, pausa = 450, ultimo = false) {
  const c = await centro(sel, texto, ultimo); if (!c) throw new Error("No encontré " + sel + " " + (texto ?? ""));
  await espera(250); await p.touchscreen.tap(c.x, c.y); await espera(pausa);
}
const desplazar = (y, ms) => p.evaluate((y, ms) => new Promise((ok) => {
  const y0 = scrollY, t0 = performance.now();
  const paso = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; scrollTo(0, y0 + (y - y0) * e); k < 1 ? requestAnimationFrame(paso) : ok(); };
  requestAnimationFrame(paso);
}), y, ms);
const deslizarHoras = (x, ms) => p.evaluate((x, ms) => new Promise((ok) => {
  const el = document.querySelector(".horas-azul"), x0 = el.scrollLeft, t0 = performance.now();
  const paso = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; el.scrollLeft = x0 + (x - x0) * e; k < 1 ? requestAnimationFrame(paso) : ok(); };
  requestAnimationFrame(paso);
}), x, ms);
const volver = async () => { await tocar(".volver", null, 900); };
const ir = async (url) => { await p.goto(url, { waitUntil: "networkidle2" }); await espera(1500); };

// 1) pantalla principal: clima con la frase y la fila de horas deslizándose
await ir(S + "/?v=" + Date.now());
await p.evaluate(() => { localStorage.setItem("lomas-hoy:bienvenida", "cerrada"); localStorage.setItem("lomas-hoy:cartel-instalar", "cerrada"); }); // sin carteles en el video
await ir(S + "/?v=" + Date.now());
await escena("principal", async () => {
  await espera(1300);
  await deslizarHoras(900, 2500); await espera(300);
  await deslizarHoras(0, 1000); await espera(300);
});
await escena("secciones", async () => {
  await desplazar(560, 1600); await espera(900);
  await desplazar(1000, 1600); await espera(800);
});
// 2) tren, colectivos y luz
await escena("transporte", async (marca) => {
  await tocar(".tile", "Tren Roca", 1600); await volver();
  await tocar(".tile", "Colectivos", 1600); await volver();
  await tocar(".tile", "Luz", 900); marca("luz");
  const y = await p.evaluate(() => document.querySelector(".bloque")?.getBoundingClientRect().top + scrollY - 70);
  await desplazar(y ?? 400, 1400); await espera(1100);
  const c = await centro("a.btn", "Ver la zona en el mapa");
  if (c) { await espera(300); await p.touchscreen.tap(c.x, c.y); await espera(900); }
  await volver();
});
// 3) guardias y salitas, veterinarias y farmacias
await escena("salud", async (marca) => {
  await tocar(".tile", "Guardias y salitas", 1100);
  await desplazar(520, 1400); await espera(700);
  await volver();
  marca("vets"); await tocar(".tile", "Veterinarias", 1100);
  await desplazar(560, 1400); await espera(700);
  await volver();
  marca("farmacias"); await tocar(".tile", "Farmacias", 1900);
  await volver();
});
// 4) mascotas, hoy cobran y feriados
await escena("mascotas", async (marca) => {
  await tocar(".tile", "Mascotas perdidas", 1300);
  await desplazar(700, 1800); await espera(500);
  await desplazar(0, 800);
  await tocar(".filtro", "Perdidos", 1000);
  await tocar(".filtro", "Todos", 400);
  await volver();
  marca("cobran"); await tocar(".tile", "Hoy cobran", 1900);
  await desplazar(380, 1200); await espera(500);
  await volver();
  marca("feriados"); await desplazar(0, 900); await espera(1300); // arriba de todo: la franja de feriados
});
// 5) notificaciones: la campanita y los interruptores
await escena("avisos", async (marca) => {
  await tocar(".campana", null, 1100);
  await tocar("button", "Activar avisos", 2600); marca("activado");
  await desplazar(0, 300);
  await tocar("button[role=switch]", null, 1300, true); // prende "Mascotas perdidas" (el último interruptor)
  await volver();
});
// (los avisos de ejemplo de otras áreas se crean ahora, para que la pantalla principal no los muestre antes)
// (se cargan directo en la base para no gastar el tope diario de avisos, que la grabación necesita)
for (const [i, [titulo, texto, zona]] of [
  ["Vacunación antirrábica gratuita", "Jornada de vacunación para perros y gatos. Llevá el carnet de tu mascota.", "Banfield"],
  ["Charla de seguridad vial", "Charla abierta para vecinos y escuelas. Entrada libre y gratuita.", "Todo Lomas"],
].entries()) {
  const id = "demo-" + i;
  await redis([["HSET", "avisos", id, JSON.stringify({ id, titulo, texto, zona, actividad: null, direccion: "", firma: "Equipo de ejemplo · Deportes", autor: demo.correo, creado: new Date(Date.now() - (i + 1) * 3 * 3600_000).toISOString() })]]);
}
// 6) panel para el municipio: entrar, escribir un aviso, elegir el barrio y publicar
await escena("municipio", async (marca) => {
  await desplazar(99999, 1300); await espera(500);
  await tocar("a", "Ingresar", 1000);
  await p.type("input[autocomplete=username]", demo.correo, { delay: 45 }); await espera(200);
  await p.type("input[type=password]", demo.clave, { delay: 40 }); await espera(200);
  await tocar("button.btn", "Ingresar", 2300);
  const campos = await p.$$("form.form input, form.form textarea, form.form select");
  await tocar("form.form input[maxlength='100']", null, 300);
  await p.type("form.form input[maxlength='100']", "Castración gratuita de 10 a 15 hs", { delay: 32 }); await espera(200);
  await tocar("form.form textarea", null, 300);
  await p.type("form.form textarea", "Jornada gratuita para perros y gatos en la plaza del barrio.", { delay: 18 }); await espera(200);
  await p.evaluate(() => { const s = [...document.querySelectorAll("form.form select")][0]; s.scrollIntoView({ block: "center" }); });
  await espera(500);
  await p.select("form.form select", "Villa Albertina"); await espera(900);
  await tocar("form.form button", "Publicar", 2000); marca("publicado");
  marca("historial");
  await desplazar(520, 1300); await espera(900);
  await desplazar(1100, 1300); await espera(700); marca("compartir");
  await p.evaluate(() => { document.querySelectorAll("a.btn").forEach((a) => { if (a.textContent.includes("Compartir Lomas Hoy")) a.scrollIntoView({ block: "center", behavior: "smooth" }); }); });
  await espera(1500);
});
// 7) el administrador invita a una persona del municipio con un enlace
{
  const cAdm = await entrarComo("ramonantoniog745@gmail.com", fs.readFileSync(process.env.TEMP + "/panel_pw.txt", "utf8").trim());
  await p.setCookie({ name: "sesion", value: cAdm.split("=")[1], domain: "lomas-hoy.vercel.app", path: "/", httpOnly: true, secure: true });
}
await ir(S + "/panel");
await escena("invitar", async () => {
  await espera(500);
  await tocar(".pestanas button", "Municipio", 1000);
  await tocar("button", "Invitar", 1700);
  await espera(900);
});
fs.writeFileSync(path.join(FRAMES, "escenas.json"), JSON.stringify(escenas));
await b.close();
console.log("listo");
