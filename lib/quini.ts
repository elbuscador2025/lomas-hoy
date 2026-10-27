// Quini 6: se guardan solo el último sorteo y el anterior (nada más viejo).
// Si la lectura trae un solo sorteo (el sitio oficial de Santa Fe no responde desde el servidor), el anterior sale de lo que ya estaba guardado:
// cuando cambia el último sorteo, el que estaba pasa a ser el anterior.
import { redis } from "@/lib/servidor";
import type { QuiniSorteo } from "@/lib/quiniela-comun";

export async function rotarQuini<T extends { sorteos: QuiniSorteo[] }>(contenido: T): Promise<T> {
  if (contenido.sorteos.length >= 2) return { ...contenido, sorteos: contenido.sorteos.slice(0, 2) };
  const nuevo = contenido.sorteos[0];
  const [previo] = await redis([["GET", "datos:quini6"]]);
  let guardados: QuiniSorteo[] = [];
  try { guardados = JSON.parse(String(previo))?.contenido?.sorteos ?? []; } catch {}
  const anterior = guardados.find((s) => s.fecha < nuevo.fecha); // el más nuevo de lo guardado que sea más viejo que el último
  return { ...contenido, sorteos: anterior ? [{ ...nuevo, sorteo: nuevo.sorteo ?? (guardados[0]?.fecha === nuevo.fecha ? guardados[0].sorteo : null) }, anterior] : [nuevo] };
}
