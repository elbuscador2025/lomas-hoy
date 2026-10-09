// Carga la lista inicial de lugares en la base (Redis). Uso: node --env-file=.env.local scripts/cargar-lugares.mjs
// No pisa lugares que ya existen (para no borrar correcciones hechas desde el panel).
import { lugaresIniciales } from "./lugares-iniciales.mjs";
import { geocodificar } from "./geocodificar.mjs";

const { KV_REST_API_URL: URL_DB, KV_REST_API_TOKEN: TOKEN } = process.env;
const redis = async (cmds) => (await (await fetch(`${URL_DB}/pipeline`, {
  method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(cmds),
})).json()).map((x) => x.result);

const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const [existentes] = await redis([["HKEYS", "lugares"]]);
let nuevos = 0, sinCoordenadas = 0;
for (const l of lugaresIniciales) {
  const id = slug(`${l.categoria}-${l.nombre}`);
  if (existentes.includes(id)) continue;
  const coords = await geocodificar(l.direccion, l.localidad);
  if (l.direccion && !coords) sinCoordenadas++;
  await redis([["HSET", "lugares", id, JSON.stringify({ id, ...l, ...(coords ?? {}) })]]);
  nuevos++;
}
console.log(`Cargados: ${nuevos}. Sin coordenadas (se ordenan al final por cercanía): ${sinCoordenadas}.`);
