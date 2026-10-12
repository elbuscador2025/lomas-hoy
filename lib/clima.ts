// Clima compartido para todos los usuarios:
//  · el PRONÓSTICO (Open-Meteo) lo trae el proceso automático cada ~20 minutos y queda guardado ("datos:pronostico");
//  · el "AHORA" lo mide el SMN (Ezeiza): si lo guardado tiene más de `minutosFrescura`, el primero que abre la app
//    lo renueva (con un candado para que no lo hagan varios a la vez) y los demás reciben lo guardado.
// Nunca se consulta Open-Meteo por cada visita.
import { config } from "@/lomas.config.mjs";
import { redis } from "@/lib/servidor";
import { ahoraAR } from "@/lib/avisos";
import { consultarSmn, componerClima } from "@/scripts/clima.mjs";

type Fila = { clave: string; contenido: any; ok_en: string | null; intento_en: string | null; error: string | null }; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function asegurarClima(actual: Fila | null, pronostico: Fila | null): Promise<Fila | null> {
  if (!pronostico?.contenido) return actual; // todavía no llegó el primer pronóstico
  const edadMin = actual?.ok_en ? (Date.now() - new Date(actual.ok_en).getTime()) / 60000 : Infinity;
  const pronosticoNuevo = actual?.contenido?.pronosticoEn !== pronostico.contenido.consultadoEn;
  if (edadMin <= config.clima.minutosFrescura && !pronosticoNuevo) return actual;

  const [candado] = await redis([["SET", "candado:clima", "1", "NX", "EX", 30]]);
  if (candado !== "OK") return actual; // otro ya lo está renovando

  const ahora = new Date().toISOString();
  try {
    const medido = await consultarSmn(config).catch(() => null); // si el SMN no responde, sigue con el "ahora" de Open-Meteo
    const contenido = componerClima(pronostico.contenido, medido, ahoraAR());
    const fila: Fila = { clave: "clima", contenido, ok_en: ahora, intento_en: ahora, error: null };
    await redis([["SET", "datos:clima", JSON.stringify(fila)]]);
    return fila;
  } catch (e) {
    const fila: Fila = { clave: "clima", contenido: actual?.contenido ?? null, ok_en: actual?.ok_en ?? null, intento_en: ahora, error: String((e as Error).message).slice(0, 300) };
    await redis([["SET", "datos:clima", JSON.stringify(fila)]]);
    return fila;
  } finally {
    await redis([["DEL", "candado:clima"]]).catch(() => {});
  }
}
