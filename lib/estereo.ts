// Canción de prueba del estéreo (servidor): el MP3 que subo desde el panel queda en el almacenamiento de archivos (Vercel Blob) y sus datos en la misma base (Redis) de siempre.
import { head, del } from "@vercel/blob";
import { redis } from "@/lib/servidor";
import { sumarOperaciones } from "@/lib/blobcuenta";
import { MAX_BYTES_ESTEREO, esMp3, nombreDeArchivo, type CancionEstereo } from "@/lib/estereo-comun";

const CLAVE = "estereo:cancion";
const URL_VALIDA = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/estereo\/[^\s]+\.mp3$/i;

export async function leerCancion(): Promise<CancionEstereo | null> {
  const [j] = await redis([["GET", CLAVE]]);
  try { return j ? (JSON.parse(j as string) as CancionEstereo) : null; } catch { return null; }
}

// Después de subir el archivo desde el panel: se comprueba que sea un MP3 de hasta 8 MB; si no, se borra y se avisa. Si está bien, reemplaza al anterior.
export async function guardarCancion(urlSubida: unknown, nombreCrudo: unknown): Promise<{ ok: true; cancion: CancionEstereo } | { ok: false; error: string }> {
  const url = String(urlSubida ?? "");
  if (!URL_VALIDA.test(url)) return { ok: false, error: "El archivo no se subió bien. Probá de nuevo." };
  const rechazar = async (error: string) => { await del(url).catch(() => {}); return { ok: false as const, error }; };
  let tam = 0;
  try {
    const h = await head(url);
    tam = h.size;
    if (tam > MAX_BYTES_ESTEREO) return rechazar(`El archivo pesa ${(tam / 1048576).toFixed(1)} MB: el máximo es 8 MB.`);
    if (!/audio\/(mpeg|mp3)/i.test(h.contentType)) return rechazar("Ese archivo no es un MP3.");
    const r = await fetch(url, { headers: { Range: "bytes=0-9" }, signal: AbortSignal.timeout(10_000) });
    if (!esMp3(new Uint8Array(await r.arrayBuffer()))) return rechazar("Ese archivo no es un MP3.");
  } catch { return rechazar("No se pudo revisar el archivo. Probá de nuevo."); }
  const previo = await leerCancion();
  const cancion: CancionEstereo = { url, nombre: nombreDeArchivo(String(nombreCrudo ?? "")), tam, subido: new Date().toISOString() };
  await redis([["SET", CLAVE, JSON.stringify(cancion)]]);
  await sumarOperaciones(1).catch(() => {}); // cada archivo que se sube cuenta para el límite gratis del mes
  if (previo?.url && previo.url !== url) await del(previo.url).catch(() => {});
  return { ok: true, cancion };
}

// Volver a la canción que viene con la app
export async function quitarCancion() {
  const previo = await leerCancion();
  await redis([["DEL", CLAVE]]);
  if (previo?.url) await del(previo.url).catch(() => {});
}
