// Cuenta las operaciones avanzadas de Vercel Blob (cada foto que se sube es una). El plan gratis permite 2.000 por mes;
// si se pasa, Blob deja de andar hasta que pasan 30 días. Todas las secciones suben fotos con este "put" para que quede el conteo.
import { put as ponerBlob } from "@vercel/blob";
import { redis } from "@/lib/servidor";
import { notificarAdmin } from "@/lib/push";

export const LIMITE_OPERACIONES = 2000;
export const AVISO_OPERACIONES = 0.8;
const mes = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).slice(0, 7);
const clave = () => `blob:ops:${mes()}`;

export async function operacionesDelMes() {
  const [n] = await redis([["GET", clave()]]);
  return Number(n) || 0;
}
export async function sumarOperaciones(n: number) {
  const [total] = await redis([["INCRBY", clave(), n]]);
  await redis([["EXPIRE", clave(), 70 * 86400]]);
  if (Number(total) >= LIMITE_OPERACIONES * AVISO_OPERACIONES) {
    const [primera] = await redis([["SET", `blob:aviso:${mes()}`, "1", "NX", "EX", 40 * 86400]]);
    if (primera) await notificarAdmin("Fotos: cerca del límite gratis", `Van ${total} de ${LIMITE_OPERACIONES} subidas de fotos este mes (80%).`, "/panel");
  }
}

export async function put(...args: Parameters<typeof ponerBlob>) {
  const r = await ponerBlob(...args);
  await sumarOperaciones(1).catch((e) => console.error("conteo blob", e));
  return r;
}
