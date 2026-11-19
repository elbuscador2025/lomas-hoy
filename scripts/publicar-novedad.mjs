// Publica el aviso de novedades desde la terminal (lo usa Claude Code al terminar algo nuevo y visible).
// Uso:  node scripts/publicar-novedad.mjs "Texto de hasta 160 caracteres" "escuelas"     (el segundo dato es opcional: código de sección o https://…)
import fs from "node:fs";
for (const l of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(l); if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, ""); }
const texto = (process.argv[2] ?? "").replace(/\s+/g, " ").trim(), enlace = (process.argv[3] ?? "").trim();
if (texto.length < 5 || texto.length > 160) { console.error(`El texto tiene que tener entre 5 y 160 caracteres (tiene ${texto.length}).`); process.exit(1); }
if (enlace && !/^[a-z0-9][a-z0-9:-]{0,40}$/i.test(enlace) && !/^https:\/\/\S+$/.test(enlace)) { console.error("El enlace tiene que ser el código de una sección (ej. escuelas) o una dirección https://"); process.exit(1); }
const ahora = new Date();
const novedad = { id: ahora.toISOString().replace(/\D/g, "").slice(0, 14), texto, enlace, activo: true, creado: ahora.toISOString() };
const r = await fetch(process.env.KV_REST_API_URL + "/pipeline", { method: "POST", headers: { Authorization: "Bearer " + process.env.KV_REST_API_TOKEN }, body: JSON.stringify([["SET", "novedad", JSON.stringify(novedad)]]) });
console.log("Aviso publicado y activo:", (await r.json())[0].result, "·", novedad.id, "·", texto, enlace ? `→ ${enlace}` : "");
