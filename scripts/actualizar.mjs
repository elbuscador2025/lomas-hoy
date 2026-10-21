// Cadete de respaldo (GitHub Actions): corre las mismas tareas que el despertador externo y le manda cada dato al sitio (/api/ingest).
// El cadete principal es el despertador externo, que llama a /api/actualizar cada 15 minutos (GitHub se atrasa horas).
import { correrTareas } from "./tareas.mjs";

const { SITIO_URL, INGEST_SECRET } = process.env;
if (!SITIO_URL || !INGEST_SECRET) {
  console.error("Faltan SITIO_URL o INGEST_SECRET");
  process.exit(1);
}

async function guardar(clave, cuerpo) {
  const r = await fetch(`${SITIO_URL}/api/ingest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${INGEST_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ clave, ...cuerpo }),
  });
  if (!r.ok) throw new Error(`Sitio ${r.status}`);
}

const fallos = await correrTareas({ guardar });
process.exit(fallos > 0 ? 1 : 0);
