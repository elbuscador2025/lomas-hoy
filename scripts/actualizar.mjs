// Proceso automático: lee tren, luz y clima y guarda el resultado en Supabase.
// Si una fuente falla, NO pisa el último dato bueno: solo anota el error.
import { config as cfg } from "../lomas.config.mjs";
import { leerTren, leerLuz, leerClima, urlClima } from "./fuentes.mjs";

const { NEXT_PUBLIC_SUPABASE_URL: URL_DB, SUPABASE_SERVICE_ROLE_KEY: KEY } = process.env;
if (!URL_DB || !KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function traer(url, tipo) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (LomasHoy)" }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return tipo === "json" ? r.json() : r.text();
}

async function guardar(clave, fila) {
  const r = await fetch(`${URL_DB}/rest/v1/datos?on_conflict=clave`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ clave, ...fila }),
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
}

const tareas = {
  tren: async () => leerTren(await traer(cfg.tren.url, "text"), cfg),
  luz: async () => leerLuz(await traer(cfg.luz.url, "text"), cfg),
  clima: async () => leerClima(await traer(urlClima(cfg), "json")),
};

let fallos = 0;
for (const [clave, tarea] of Object.entries(tareas)) {
  if (!cfg.secciones[clave]?.activa) continue;
  const ahora = new Date().toISOString();
  try {
    const contenido = await tarea();
    await guardar(clave, { contenido, ok_en: ahora, intento_en: ahora, error: null });
    console.log(`${clave}: ok`);
  } catch (e) {
    fallos++;
    console.error(`${clave}: falló -> ${e.message}`);
    try { await guardar(clave, { intento_en: ahora, error: String(e.message).slice(0, 300) }); } catch {}
  }
}
process.exit(fallos === Object.keys(tareas).length ? 1 : 0);
