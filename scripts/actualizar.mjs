// Proceso automático: lee tren, luz y colectivos (el clima se pide al abrir la app, ver lib/clima.ts) y se los manda al sitio (/api/ingest), que los guarda.
// Si una fuente falla, el sitio NO pisa el último dato bueno: solo anota el error.
import { config as cfg } from "../lomas.config.mjs";
import { leerTren, leerLuz, leerRss, buscarParos, leerProgramados } from "./fuentes.mjs";

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

const tareas = {
  tren: async () => leerTren(await traer(cfg.tren.url, "text"), cfg),
  luz: async () => leerLuz(await traer(cfg.luz.url, "text"), cfg),
  programados: async () => leerProgramados(await traer(cfg.programados.url, "json"), cfg),
  colectivos: async () => {
    const diarios = cfg.colectivos.diarios;
    const lecturas = await Promise.allSettled(diarios.map(async (d) => leerRss(await traer(d.url, "text"), d.medio)));
    const ok = lecturas.flatMap((l, i) => (l.status === "fulfilled" && l.value.length ? [diarios[i].medio] : []));
    if (ok.length === 0) throw new Error("No se pudo leer ningún diario");
    const notas = lecturas.flatMap((l) => (l.status === "fulfilled" ? l.value : []));
    return { paros: buscarParos(notas, cfg), diariosLeidos: ok, diariosSinLeer: diarios.map((d) => d.medio).filter((m) => !ok.includes(m)) };
  },
};

let fallos = 0;
for (const [clave, tarea] of Object.entries(tareas)) {
  if (!(cfg.secciones[clave] ?? cfg[clave])?.activa) continue;
  try {
    await guardar(clave, { contenido: await tarea() });
    console.log(`${clave}: ok`);
  } catch (e) {
    fallos++;
    console.error(`${clave}: falló -> ${e.message}`);
    try { await guardar(clave, { error: e.message }); } catch {}
  }
}
process.exit(fallos > 0 ? 1 : 0);
