// "Hoy cobran": a qué grupo pertenece cada línea cargada y cómo se nombra cada uno. Lo usan la pantalla "Hoy cobran" y el saludo de la mañana.
import { terminaciones, type PagoAnses } from "@/lib/anses";

export type Clave = "jubilados" | "auh" | "pensiones";
export type Bloque = { id: string; titulo: string; quienes: string; hoy: string; ya: string };

// Cada botón tiene uno o dos bloques (grupos de pago), con nombres en palabras simples.
export const BLOQUES: Record<Clave, Bloque[]> = {
  jubilados: [
    { id: "min", titulo: "Jubilados que cobran la mínima", quienes: "los que ganan la mínima", hoy: "Hoy cobran los que ganan la mínima", ya: "Los que cobran la mínima ya cobraron este mes" },
    { id: "sup", titulo: "Jubilados que cobran más que la mínima", quienes: "los que ganan más que la mínima", hoy: "Hoy cobran los que ganan más que la mínima", ya: "Los que cobran más que la mínima ya cobraron este mes" },
  ],
  auh: [{ id: "auh", titulo: "Asignación por hijo (AUH)", quienes: "la AUH", hoy: "Hoy cobra la AUH", ya: "La AUH ya se cobró este mes" }],
  pensiones: [{ id: "pen", titulo: "Pensiones no contributivas", quienes: "las pensiones", hoy: "Hoy cobran las pensiones", ya: "Las pensiones ya se cobraron este mes" }],
};

// Las líneas de "haberes superiores al mínimo" son el segundo bloque de Jubilados.
export const grupoDe = (p: string): { clave: Clave; bloque: string } | null => {
  const t = p.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/auh|asignacion/.test(t)) return { clave: "auh", bloque: "auh" };
  if (/pension/.test(t)) return { clave: "pensiones", bloque: "pen" };
  if (/jubil/.test(t)) return { clave: "jubilados", bloque: /superior/.test(t) ? "sup" : "min" };
  return null;
};
export const dniDe = (pagos: PagoAnses[]) => terminaciones([...new Set(pagos.flatMap((p) => p.dnis))].sort((a, b) => a - b));

// Para el saludo: quién cobra hoy, nombrando siempre al grupo. "" si no cobra nadie.
// Ej: "Cobran jubilados que ganan más que la mínima, DNI 2 y 3. AUH: DNI 5. Pensiones: DNI 6."
export function cobranHoyTexto(pagos: PagoAnses[], hoy: string) {
  const deHoy = pagos.filter((p) => p.fecha === hoy);
  const de = (clave: Clave, bloque: string) => deHoy.filter((p) => { const g = grupoDe(p.prestacion); return g?.clave === clave && g.bloque === bloque; });
  const partes: string[] = [];
  const min = de("jubilados", "min"), sup = de("jubilados", "sup"), auh = de("auh", "auh"), pen = de("pensiones", "pen");
  if (min.length) partes.push(`Cobran jubilados que cobran la mínima, DNI ${dniDe(min)}.`);
  if (sup.length) partes.push(`Cobran jubilados que ganan más que la mínima, DNI ${dniDe(sup)}.`);
  if (auh.length) partes.push(`AUH: DNI ${dniDe(auh)}.`);
  if (pen.length) partes.push(`Pensiones: DNI ${dniDe(pen)}.`);
  return partes.join(" ");
}
