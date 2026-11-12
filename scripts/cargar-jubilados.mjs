// Primera carga de "Jubilados": los 124 centros de jubilados del directorio oficial del Municipio de Lomas de Zamora
// (https://lomasdezamora.gov.ar/gestion/centros-de-jubilados, consultado en noviembre de 2026: nombre, dirección, localidad y ubicación).
// Teléfono, días y horarios y actividades no están publicados: quedan vacíos ("Consultar" en la app). Se pueden completar desde el panel.
// Uso: node --env-file=.env.local scripts/cargar-jubilados.mjs   (no pisa fichas que ya existen)
import { readFileSync } from "node:fs";
const { KV_REST_API_URL: URL_DB, KV_REST_API_TOKEN: TOKEN } = process.env;
const redis = async (cmds) => (await (await fetch(`${URL_DB}/pipeline`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(cmds) })).json()).map((x) => x.result);
const { lista, maps } = JSON.parse(readFileSync(new URL("./centros-jubilados-muni.json", import.meta.url), "utf8"));
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const bonito = (s) => s.replace(/\bDe\b/g, "de").replace(/\bDel\b/g, "del").replace(/\bLa\b/g, (m, i, t) => (i === 0 ? m : "la")).replace(/\bY\b/g, "y");
const [existentes] = await redis([["HKEYS", "jubilados"]]);
let nuevos = 0;
for (const [i, c] of lista.entries()) {
  const partes = c.dir.split(" - "), barrio = bonito(partes.pop().trim()), direccion = partes.join(" - ").trim();
  const id = "muni-" + slug(`${c.nombre}-${direccion}`).slice(0, 60);
  if (existentes.includes(id)) continue;
  const m = /destination=(-?\d+\.\d+),(-?\d+\.\d+)/.exec(maps[i] ?? "");
  const centro = {
    id, nombre: `Centro de Jubilados ${c.nombre.trim()}`, direccion, barrio, ...(m ? { lat: Number(m[1]), lng: Number(m[2]) } : {}),
    actividades: "", horarios: "", telefono: "", fuente: "Municipio de Lomas de Zamora – Centros de Jubilados", fuenteUrl: "https://lomasdezamora.gov.ar/gestion/centros-de-jubilados",
    activo: true, actualizado: new Date().toISOString(),
  };
  await redis([["HSET", "jubilados", id, JSON.stringify(centro)]]);
  nuevos++;
}
console.log(`Centros cargados: ${nuevos} de ${lista.length}.`);
