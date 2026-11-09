// Carga las farmacias de Lomas de Zamora en la base (categoría "farmacias"). Uso: node --env-file=.env.local scripts/cargar-farmacias.mjs <pami.csv> [osm.json]
// Fuente principal: listado de farmacias de PAMI (datos abiertos, datos.pami.org.ar). Teléfono y horario: OpenStreetMap, solo si figuran allá.
// No pisa lo que ya existe (para no borrar correcciones hechas desde el panel).
import { readFileSync } from "node:fs";
import { geocodificar } from "./geocodificar.mjs";

const { KV_REST_API_URL: URL_DB, KV_REST_API_TOKEN: TOKEN } = process.env;
const redis = async (cmds) => (await (await fetch(`${URL_DB}/pipeline`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(cmds) })).json()).map((x) => x.result);
const sin = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const slug = (s) => sin(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const lindo = (s) => s.toLowerCase().replace(/(^|[\s.(-])([a-zñáéíóú])/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(De|Del|La|Las|Los|Y|E)\b/g, (m) => m.toLowerCase()).replace(/\bAv\./g, "Av.");
const llave = (s) => sin(s).replace(/\b(farmacia|farmacias|farma|av|avenida|calle)\b/g, "").replace(/[^a-z0-9]/g, "");

const [archPami, archOsm] = process.argv.slice(2);
const PARTIDO = new Set(["LOMAS DE ZAMORA", "BANFIELD", "TEMPERLEY", "VILLA TURDERA SUR", "TURDERA", "LLAVALLOL"]);
const pami = readFileSync(archPami, "latin1").split(/\r?\n/).slice(3).filter(Boolean).map((l) => l.split(";"))
  .filter((r) => r[0] === "BUENOS AIRES" && PARTIDO.has(r[5].trim()))
  .map((r) => ({ nombre: lindo(r[3].trim()), direccion: lindo(r[4].trim()), localidad: lindo(r[5].trim()).replace("Villa Turdera Sur", "Turdera"), fuente: "PAMI – Listado de farmacias (datos abiertos, agosto 2026)", fuenteUrl: "https://datos.pami.org.ar/dataset/farmacias", lng: Number(String(r[8]).replace(",", ".")) }));

const osm = archOsm ? JSON.parse(readFileSync(archOsm, "utf8")).elements.map((e) => ({ t: e.tags ?? {}, lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon })).filter((e) => e.t.name) : [];
const tel = (t) => (t.phone || t["contact:phone"] || "").split(";")[0].trim();
const hay = new Map(pami.map((p) => [llave(p.nombre) + llave(p.direccion), p]));
const porNombre = (n) => pami.filter((p) => llave(p.nombre) === llave(n));
let conTel = 0;
const lista = [...pami];
for (const e of osm) {
  const dir = [e.t["addr:street"], e.t["addr:housenumber"]].filter(Boolean).join(" ");
  const par = porNombre(e.t.name).find((p) => !dir || llave(p.direccion).includes(llave(e.t["addr:street"] ?? "")) || (e.lat && p.coords && Math.abs(p.coords.lat - e.lat) < 0.003));
  if (par) { if (!par.telefonos && tel(e.t)) { par.telefonos = [tel(e.t)]; conTel++; } if (!par.horario && e.t.opening_hours) par.horario = e.t.opening_hours; continue; }
  if (e["t"]["addr:street"] && e.t["addr:housenumber"] && !hay.has(llave(e.t.name) + llave(dir)))
    lista.push({ nombre: lindo(e.t.name), direccion: lindo(dir), localidad: "Lomas de Zamora", telefonos: tel(e.t) ? [tel(e.t)] : undefined, fuente: "OpenStreetMap (colaborativo)", fuenteUrl: "https://www.openstreetmap.org", lat: e.lat, lng: e.lng });
}

const [existentes] = await redis([["HKEYS", "lugares"]]);
let nuevos = 0, sinCoordenadas = 0;
for (const f of lista) {
  const id = slug(`farmacias-${f.nombre}-${f.direccion}`);
  if (existentes.includes(id)) continue;
  let coords = f.lat ? { lat: f.lat, lng: f.lng } : await geocodificar(f.direccion, f.localidad);
  if (!coords) sinCoordenadas++;
  await redis([["HSET", "lugares", id, JSON.stringify({ id, categoria: "farmacias", nombre: f.nombre, direccion: f.direccion, localidad: f.localidad, telefonos: f.telefonos ?? [], horario: f.horario ?? "", fuente: f.fuente, fuenteUrl: f.fuenteUrl, ...(coords ?? {}) })]]);
  nuevos++;
}
console.log(`PAMI: ${pami.length}. En total cargadas: ${nuevos} (con teléfono de OSM: ${conTel}). Sin coordenadas (van al final al ordenar por cercanía): ${sinCoordenadas}.`);
