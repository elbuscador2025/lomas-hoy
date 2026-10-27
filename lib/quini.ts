// Quini 6: se guardan solo el último sorteo y el anterior (nada más viejo).
// Si la lectura trae un solo sorteo (el sitio oficial de Santa Fe no responde desde el servidor), el anterior sale de lo que ya estaba guardado:
// cuando cambia el último sorteo, el que estaba pasa a ser el anterior.
// Antes de reemplazar lo guardado se controla que el sorteo nuevo no sea igual al anterior; si algo no cierra, se conserva lo que había.
import { redis } from "@/lib/servidor";
import type { QuiniSorteo } from "@/lib/quiniela-comun";
import type { Problema } from "@/lib/controles";
import { controlarQuini } from "@/scripts/quiniela.mjs";

type Contenido = { sorteos: QuiniSorteo[]; controles?: Problema[] };

export async function rotarQuini<T extends Contenido>(contenido: T): Promise<T> {
  const hoy = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
  const controles = [...(contenido.controles ?? [])];
  const [previo] = await redis([["GET", "datos:quini6"]]);
  let guardado: Contenido | null = null;
  try { guardado = JSON.parse(String(previo))?.contenido ?? null; } catch {}
  const guardados = guardado?.sorteos ?? [];
  if (!contenido.sorteos.length) return guardado ? ({ ...guardado, controles } as unknown as T) : { ...contenido, controles }; // nada válido: queda lo que había
  if (contenido.sorteos.length >= 2) return { ...contenido, sorteos: contenido.sorteos.slice(0, 2), controles };
  const nuevo = contenido.sorteos[0];
  const anterior = guardados.find((s) => s.fecha < nuevo.fecha); // el más nuevo de lo guardado que sea más viejo que el último
  const r = controlarQuini(nuevo, hoy, anterior ?? null);
  if (!r.ok) { // igual al anterior o con fecha rara: no se muestra, se conserva lo guardado
    controles.push({ quiniela: "Quini 6", sorteo: nuevo.fecha, fecha: nuevo.fecha, motivo: r.motivo });
    return guardado ? ({ ...guardado, controles } as unknown as T) : { ...contenido, sorteos: [], controles };
  }
  return { ...contenido, controles, sorteos: anterior ? [{ ...nuevo, sorteo: nuevo.sorteo ?? (guardados[0]?.fecha === nuevo.fecha ? guardados[0].sorteo : null) }, anterior] : [nuevo] };
}
