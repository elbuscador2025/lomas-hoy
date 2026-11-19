// Aviso de novedades (servidor): se guarda en la misma base (Redis) que el resto de lo que se maneja desde el panel, en una sola clave.
import { redis } from "@/lib/servidor";
import { MAX_TEXTO_NOVEDAD, destinoDe, type Novedad } from "@/lib/novedad-comun";

const CLAVE = "novedad";
const limpio = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

export async function leerNovedad(): Promise<Novedad | null> {
  const [j] = await redis([["GET", CLAVE]]);
  try { return j ? (JSON.parse(j as string) as Novedad) : null; } catch { return null; }
}

// Publicar siempre crea un ID nuevo (la fecha y la hora): así se vuelve a mostrar a todos, hayan visto o no el anterior
export async function publicarNovedad(c: { texto?: unknown; enlace?: unknown; activo?: unknown }): Promise<{ ok: true; novedad: Novedad } | { ok: false; error: string }> {
  const texto = limpio(c.texto, MAX_TEXTO_NOVEDAD + 1), enlace = limpio(c.enlace, 300);
  if (texto.length < 5) return { ok: false, error: "Escribí el texto del aviso." };
  if (texto.length > MAX_TEXTO_NOVEDAD) return { ok: false, error: `El texto puede tener hasta ${MAX_TEXTO_NOVEDAD} caracteres.` };
  if (enlace && !destinoDe(enlace)) return { ok: false, error: "El enlace no sirve: poné el código de una sección (ej. escuelas) o una dirección que empiece con https://" };
  const ahora = new Date();
  const novedad: Novedad = { id: ahora.toISOString().replace(/\D/g, "").slice(0, 14), texto, enlace, activo: c.activo !== false, creado: ahora.toISOString() };
  await redis([["SET", CLAVE, JSON.stringify(novedad)]]);
  return { ok: true, novedad };
}

// Prender o apagar sin cambiar el ID (no se vuelve a mostrar a quien ya lo vio)
export async function activarNovedad(valor: boolean) {
  const n = await leerNovedad();
  if (!n) return false;
  await redis([["SET", CLAVE, JSON.stringify({ ...n, activo: valor })]]);
  return true;
}
