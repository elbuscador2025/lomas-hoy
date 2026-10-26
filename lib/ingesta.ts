// Guardar un dato que trajo un "cadete" (el despertador externo o GitHub) y disparar los avisos que correspondan.
import { after } from "next/server";
import { mantener } from "@/lib/mascotas";
import { mantener as mantenerTrueque } from "@/lib/trueque";
import { mantener as mantenerTrabajo } from "@/lib/trabajo";
import { mantener as mantenerPasa } from "@/lib/pasa";
import { evaluarResumen } from "@/lib/resumen";
import { evaluarTren, evaluarProgramados, evaluarColectivos, evaluarAgua, evaluarSubte, evaluarTormenta, evaluarAlertasSmn } from "@/lib/eventos";
import { redis } from "@/lib/servidor";
import { enriquecerAgua } from "@/lib/agua";

export const CLAVES_VALIDAS = ["tren", "luz", "colectivos", "programados", "agua", "pronostico", "mascotas", "subte", "alertas", "noticias"];

// Si falló la lectura (contenido vacío), se conserva el último dato bueno y solo se anota el error.
export async function guardarDato(clave: string, contenido: any, error?: unknown) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const ahora = new Date().toISOString();
  const llave = `datos:${clave}`;
  if (contenido) {
    if (clave === "agua") contenido = await enriquecerAgua(contenido).catch(() => contenido); // lee el texto completo de las notas nuevas (barrios y horario)
    await redis([["SET", llave, JSON.stringify({ clave, contenido, ok_en: ahora, intento_en: ahora, error: null })]]);
    // Los avisos salen después de responder: si fallan, el dato ya quedó guardado.
    if (clave === "tren") after(() => evaluarTren(contenido).catch((e) => console.error("push tren", e)));
    if (clave === "programados") after(() => evaluarProgramados(contenido).catch((e) => console.error("push programados", e)));
    if (clave === "mascotas") after(() => Promise.all([mantener(), mantenerTrueque(), mantenerTrabajo(), mantenerPasa(), evaluarResumen()]).catch((e) => console.error("mascotas", e)));
    if (clave === "colectivos") after(() => evaluarColectivos(contenido).catch((e) => console.error("push colectivos", e)));
    if (clave === "subte") after(() => evaluarSubte(contenido).catch((e) => console.error("push subte", e)));
    if (clave === "alertas") after(() => evaluarAlertasSmn(contenido).catch((e) => console.error("push alertas", e)));
    if (clave === "pronostico") after(() => evaluarTormenta(contenido).catch((e) => console.error("push tormenta", e)));
    if (clave === "agua") after(() => evaluarAgua().catch((e) => console.error("push agua", e)));
  } else {
    const [previo] = await redis([["GET", llave]]);
    const base = previo ? JSON.parse(previo as string) : { clave, contenido: null, ok_en: null };
    await redis([["SET", llave, JSON.stringify({ ...base, intento_en: ahora, error: String(error ?? "error").slice(0, 300) })]]);
  }
}

// Anota que corrió una actualización (para mi panel: "Última actualización de datos: hace X minutos")
export async function registrarCorrida(origen: "despertador" | "github") {
  const t = new Date().toISOString();
  await redis([["SET", "actualizacion:ultima", t], ["LPUSH", "actualizacion:log", JSON.stringify({ t, o: origen })], ["LTRIM", "actualizacion:log", 0, 11]]);
}
