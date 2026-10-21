// Proceso automático: lee tren, luz y colectivos (el clima se pide al abrir la app, ver lib/clima.ts) y se los manda al sitio (/api/ingest), que los guarda.
// Si una fuente falla, el sitio NO pisa el último dato bueno: solo anota el error.
import { config as cfg } from "../lomas.config.mjs";
import { leerTren, leerLuz, leerRss, buscarParos, buscarAgua, leerProgramados, leerSubte } from "./fuentes.mjs";
import { leerPronostico, urlOpenMeteo } from "./clima.mjs";

const { SITIO_URL, INGEST_SECRET } = process.env;
if (!SITIO_URL || !INGEST_SECRET) {
  console.error("Faltan SITIO_URL o INGEST_SECRET");
  process.exit(1);
}

async function traer(url, tipo) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (LomasHoy)" }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return tipo === "json" ? r.json() : r.text();
}

async function guardar(clave, cuerpo) {
  const r = await fetch(`${SITIO_URL}/api/ingest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${INGEST_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ clave, ...cuerpo }),
  });
  if (!r.ok) throw new Error(`Sitio ${r.status}`);
}

// Los diarios se leen una sola vez por corrida: de ahí salen los paros de colectivos y las notas de cortes de agua.
let diariosLeidos;
async function leerDiarios() {
  diariosLeidos ??= (async () => {
    const diarios = cfg.colectivos.diarios;
    const lecturas = await Promise.allSettled(diarios.map(async (d) => leerRss(await traer(d.url, "text"), d.medio)));
    const ok = lecturas.flatMap((l, i) => (l.status === "fulfilled" && l.value.length ? [diarios[i].medio] : []));
    if (ok.length === 0) throw new Error("No se pudo leer ningún diario");
    return { notas: lecturas.flatMap((l) => (l.status === "fulfilled" ? l.value : [])), diariosLeidos: ok, diariosSinLeer: diarios.map((d) => d.medio).filter((m) => !ok.includes(m)) };
  })();
  return diariosLeidos;
}

const tareas = {
  // Mascotas: no trae datos; avisa al sitio para que baje lo vencido (y borre sus fotos) y mande el resumen de las 19 hs
  mascotas: async () => ({ ok: true }),
  // Pronóstico de Open-Meteo: una sola consulta cada ~20 min para todos (la pantalla lee lo guardado)
  pronostico: async () => ({ ...leerPronostico(await traer(urlOpenMeteo(cfg), "json")), consultadoEn: new Date().toISOString() }),
  tren: async () => leerTren(await traer(cfg.tren.url, "text"), cfg),
  luz: async () => leerLuz(await traer(cfg.luz.url, "text"), cfg),
  programados: async () => leerProgramados(await traer(cfg.programados.url, "json"), cfg),
  // Sin clave todavía: se omite (el sitio muestra "Sin datos por ahora" en gris)
  subte: async () => {
    const { SUBTE_CLIENT_ID: id, SUBTE_CLIENT_SECRET: secreto } = process.env;
    if (!id || !secreto) return null;
    return leerSubte(await traer(`${cfg.subte.url}?json=1&client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(secreto)}`, "json"), cfg);
  },
  colectivos: async () => {
    const d = await leerDiarios();
    return { paros: buscarParos(d.notas, cfg), diariosLeidos: d.diariosLeidos, diariosSinLeer: d.diariosSinLeer };
  },
  agua: async () => {
    const d = await leerDiarios();
    return { noticias: buscarAgua(d.notas, cfg), diariosSinLeer: d.diariosSinLeer };
  },
};

let fallos = 0;
for (const [clave, tarea] of Object.entries(tareas)) {
  if (!(cfg.secciones[clave === "pronostico" ? "clima" : clave] ?? cfg[clave])?.activa) continue;
  try {
    const contenido = await tarea();
    if (contenido === null) { console.log(`${clave}: sin clave, se omite`); continue; }
    await guardar(clave, { contenido });
    console.log(`${clave}: ok`);
  } catch (e) {
    fallos++;
    console.error(`${clave}: falló -> ${e.message}`);
    try { await guardar(clave, { error: e.message }); } catch {}
  }
}
process.exit(fallos > 0 ? 1 : 0);
