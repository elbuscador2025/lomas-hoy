// "📸 Hoy en Lomas": la foto grande de la portada. Las que cargo yo desde el panel (hasta 3) reemplazan a la automática (la foto más nueva de Noticias o Agenda).
// Una portada mía es una foto, un título y un texto corto o un enlace. Solo guarda eso: nada de vecinos ni datos personales.
import { del } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { put } from "@/lib/blobcuenta";
import { redis } from "@/lib/servidor";

export const MAX_PORTADAS = 3;
export const MAX_TITULO_PORTADA = 90;
export const MAX_TEXTO_PORTADA = 200;
export const MAX_BYTES_PORTADA = 450_000;
export type Portada = { id: string; titulo: string; texto: string; enlace: string; foto: string; creado: string };

const limpio = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/[ \t]+/g, " ").trim().slice(0, max);

export async function listar(): Promise<Portada[]> {
  const [x] = await redis([["HVALS", "portada"]]);
  return (x as string[]).map((j) => JSON.parse(j) as Portada).sort((a, b) => a.creado.localeCompare(b.creado));
}

export async function crear(form: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const titulo = limpio(form.get("titulo"), MAX_TITULO_PORTADA + 1), texto = limpio(form.get("texto"), MAX_TEXTO_PORTADA + 1), enlace = limpio(form.get("enlace"), 400);
  if (titulo.length < 3) return { ok: false, error: "Escribí un título." };
  if (titulo.length > MAX_TITULO_PORTADA) return { ok: false, error: `El título puede tener hasta ${MAX_TITULO_PORTADA} letras.` };
  if (texto.length > MAX_TEXTO_PORTADA) return { ok: false, error: `El texto puede tener hasta ${MAX_TEXTO_PORTADA} letras.` };
  if (enlace && !/^https:\/\/[^\s]+$/.test(enlace)) return { ok: false, error: "El enlace tiene que empezar con https://" };
  if (!enlace && texto.length < 3) return { ok: false, error: "Poné un texto corto o un enlace." };
  const archivo = form.get("foto");
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, error: "Elegí una foto." };
  if (archivo.size > MAX_BYTES_PORTADA) return { ok: false, error: "La foto es muy pesada. Probá con otra." };
  const bytes = Buffer.from(await archivo.arrayBuffer());
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) return { ok: false, error: "La foto tiene que ser JPG." };
  if ((await listar()).length >= MAX_PORTADAS) return { ok: false, error: `Ya hay ${MAX_PORTADAS} portadas. Sacá una para poner otra.` };
  const id = randomUUID().slice(0, 10);
  let foto: string;
  try { foto = (await put(`portada/${id}.jpg`, bytes, { access: "public", contentType: "image/jpeg", addRandomSuffix: true })).url; }
  catch (e) { console.error("foto portada:", e); return { ok: false, error: "No se pudo subir la foto. Probá de nuevo en un rato." }; }
  const p: Portada = { id, titulo, texto, enlace, foto, creado: new Date().toISOString() };
  await redis([["HSET", "portada", id, JSON.stringify(p)]]);
  return { ok: true };
}

export async function quitar(id: string) {
  const [j] = await redis([["HGET", "portada", id]]);
  if (!j) return false;
  await del((JSON.parse(j as string) as Portada).foto).catch(() => {});
  await redis([["HDEL", "portada", id]]);
  return true;
}
