// Carga inicial del listado de escuelas de Lomas de Zamora desde el Padrón Oficial de Establecimientos Educativos (Nación).
// Uso:  node scripts/cargar-escuelas.mjs [archivo.xlsx]   (sin archivo, baja el padrón más nuevo de argentina.gob.ar)
// Después se puede actualizar desde el panel (pestaña Escuelas → "Actualizar el listado").
import fs from "node:fs";
import { bajarPadron, leerPadron } from "../lib/escuelas-padron.ts";
for (const l of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(l); if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, ""); }
const archivo = process.argv[2];
const { bytes, url } = archivo ? { bytes: new Uint8Array(fs.readFileSync(archivo)), url: "https://www.argentina.gob.ar/educacion/evaluacion-informacion-educativa/padron-oficial-de-establecimientos-educativos" } : await bajarPadron();
const r = leerPadron(bytes, url);
const por = {}; for (const e of r.escuelas) for (const n of e.niveles) por[n] = (por[n] || 0) + 1;
console.log("Establecimientos de Lomas de Zamora:", r.total, "(Relevamiento Anual", r.anio + ")", por);
const base = { ...r, actualizado: new Date().toISOString() };
const res = await fetch(process.env.KV_REST_API_URL + "/pipeline", { method: "POST", headers: { Authorization: "Bearer " + process.env.KV_REST_API_TOKEN }, body: JSON.stringify([["SET", "escuelas:base", JSON.stringify(base)]]) });
console.log("guardado:", (await res.json())[0].result);
