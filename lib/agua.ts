// Cortes de agua: los cargados a mano desde mi panel (hash "agua") y las notas de diarios que trae el proceso automático (datos:agua).
// Solo en el servidor. Nada se inventa: si no hay nada cargado ni publicado, la lista queda vacía.
import { createHash } from "node:crypto";
import { redis } from "@/lib/servidor";
import type { Agua, CorteAgua, Fila } from "@/lib/datos";

export type CorteManual = { id: string; localidad: string; zona: string; desde: string; hasta: string; motivo: string; creado: string };
type Noticia = { titular: string; medio: string; link: string; fecha: string; localidad: string };

export const FUENTE_MANUAL = "Carga manual de Lomas Hoy";

// Interruptor del panel "Mostrar Agua en la app": apagado de entrada. Apagado, el vecino no ve nada y no se mandan avisos.
export async function aguaVisible() {
  const [v] = await redis([["GET", "agua:visible"]]);
  return v === "1";
}

export async function filaAgua(): Promise<Fila<Agua>> {
  const [n, m] = await redis([["GET", "datos:agua"], ["HVALS", "agua"]]);
  const lectura = n ? (JSON.parse(n as string) as Fila<{ noticias: Noticia[]; diariosSinLeer: string[] }>) : null;
  const manuales = (m as string[]).map((j) => JSON.parse(j) as CorteManual).sort((a, b) => a.desde.localeCompare(b.desde));
  const notas = [...(lectura?.contenido?.noticias ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const cortes: CorteAgua[] = [
    ...manuales.map((c) => ({ id: c.id, localidad: c.localidad, zona: c.zona, desde: c.desde, hasta: c.hasta, motivo: c.motivo, fuente: FUENTE_MANUAL, fecha: c.creado })),
    ...notas.map((x) => ({
      id: createHash("sha1").update(x.link).digest("hex").slice(0, 12), localidad: x.localidad, zona: x.titular, desde: null, hasta: null,
      motivo: "", fuente: x.medio, fecha: x.fecha, link: x.link,
    })),
  ];
  return {
    clave: "agua", contenido: { cortes, diariosSinLeer: lectura?.contenido?.diariosSinLeer ?? [] },
    ok_en: lectura?.ok_en ?? null, intento_en: lectura?.intento_en ?? null, error: lectura?.error ?? null,
  };
}
