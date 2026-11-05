// Candado breve en Redis: mientras una denuncia (u otra cuenta parecida) se lee y se guarda, las demás de la misma publicación esperan su turno.
// Así tres denuncias que llegan al mismo tiempo se cuentan las tres. Si el candado no se consigue en unos 3 segundos, se sigue igual (mejor contar la denuncia que perderla).
import { randomUUID } from "node:crypto";
import { redis } from "@/lib/servidor";

const SOLTAR = 'if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end';
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function conCandado<T>(clave: string, trabajo: () => Promise<T>): Promise<T> {
  const k = `candado:${clave}`, yo = randomUUID();
  let tengo = false;
  try {
    for (let i = 0; i < 40 && !tengo; i++) {
      const [ok] = await redis([["SET", k, yo, "NX", "PX", 5000]]); // se libera solo a los 5 segundos si algo falla
      if (ok) tengo = true;
      else await dormir(40 + Math.floor(Math.random() * 60));
    }
  } catch (e) { console.error("candado", e); }
  try {
    return await trabajo();
  } finally {
    if (tengo) await redis([["EVAL", SOLTAR, 1, k, yo]]).catch(() => {}); // solo suelta el suyo
  }
}
