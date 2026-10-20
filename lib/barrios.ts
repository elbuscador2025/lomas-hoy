// Lista de barrios (la administro desde mi panel). Se usa en Mascotas y Trueque.
import { config } from "@/lomas.config.mjs";
import { redis } from "@/lib/servidor";

export async function barriosActuales(): Promise<string[]> {
  const [x] = await redis([["GET", "muni:barrios"]]);
  let lista: unknown = null;
  try { lista = JSON.parse(String(x)); } catch {}
  const base = Array.isArray(lista) && lista.length ? (lista as string[]) : config.localidades;
  return ["Todo Lomas", ...base.filter((b) => b !== "Todo Lomas")];
}
export async function guardarBarrios(lista: string[]) {
  await redis([["SET", "muni:barrios", JSON.stringify(lista.filter((b) => b !== "Todo Lomas"))]]);
}
