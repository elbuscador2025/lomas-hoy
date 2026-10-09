// Clima compartido: una sola consulta para todos los usuarios.
// Si lo guardado tiene más de `minutosFrescura`, el primero que abre la app lo renueva (con un candado
// para que no lo hagan varios a la vez); los demás reciben lo guardado. Así nunca pasa de unos pocos minutos.
import { config } from "@/lomas.config.mjs";
import { redis } from "@/lib/servidor";
import { consultarClima } from "@/scripts/clima.mjs";

type Fila = { clave: string; contenido: unknown; ok_en: string | null; intento_en: string | null; error: string | null };

export async function asegurarClima(actual: Fila | null): Promise<Fila | null> {
  const edadMin = actual?.ok_en ? (Date.now() - new Date(actual.ok_en).getTime()) / 60000 : Infinity;
  if (edadMin <= config.clima.minutosFrescura) return actual;

  const [candado] = await redis([["SET", "candado:clima", "1", "NX", "EX", 30]]);
  if (candado !== "OK") return actual; // otro ya lo está renovando

  const ahora = new Date().toISOString();
  try {
    const contenido = await consultarClima(config);
    const fila: Fila = { clave: "clima", contenido, ok_en: ahora, intento_en: ahora, error: null };
    await redis([["SET", "datos:clima", JSON.stringify(fila)]]);
    return fila;
  } catch (e) {
    // No se pisa el último dato bueno: solo se anota el error.
    const fila: Fila = { clave: "clima", contenido: actual?.contenido ?? null, ok_en: actual?.ok_en ?? null, intento_en: ahora, error: String((e as Error).message).slice(0, 300) };
    await redis([["SET", "datos:clima", JSON.stringify(fila)]]);
    return fila;
  } finally {
    await redis([["DEL", "candado:clima"]]).catch(() => {});
  }
}
