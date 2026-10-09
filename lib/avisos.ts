// Parte de los avisos del municipio que usan tanto el servidor como la pantalla (sin nada secreto).
import { config } from "@/lomas.config.mjs";

export type Aviso = {
  id: string; titulo: string; texto: string; zona: string;
  actividad: string | null; // "YYYY-MM-DDTHH:mm", hora de Argentina
  direccion: string; firma: string; autor: string; creado: string; editado?: string;
};
export type AvisoPublico = Omit<Aviso, "autor">;

export const FIRMA_POR_DEFECTO = "Municipio de Lomas de Zamora";
export const ZONAS = ["Todo Lomas", ...config.localidades];

// "YYYY-MM-DDTHH:mm" en hora de Argentina
export function ahoraAR(fecha = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: config.zonaHoraria, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(fecha).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

// Vigente: hasta que pasa la fecha de la actividad, o 7 días desde que se publicó si no tiene fecha.
export function vigente(a: Pick<Aviso, "actividad" | "creado">, ahora = ahoraAR(), ahoraMs = Date.now()) {
  if (a.actividad) return a.actividad >= ahora;
  return ahoraMs - new Date(a.creado).getTime() <= config.avisos.diasDeVigenciaSinFecha * 86400_000;
}

// "De hoy": la actividad es hoy, o no tiene fecha y se publicó hoy.
export function esDeHoy(a: Pick<Aviso, "actividad" | "creado">, ahora = ahoraAR()) {
  return (a.actividad ?? ahoraAR(new Date(a.creado))).slice(0, 10) === ahora.slice(0, 10);
}
