// Localidades de Lomas para los avisos de luz. Lo usan el servidor y la pantalla.
import { config } from "@/lomas.config.mjs";

export const LOCALIDADES: string[] = [...config.localidades].sort((a, b) => a.localeCompare(b, "es"));
const sin = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const comoLoInforma = config.luz.comoLoInforma as Record<string, string>;

export const localidadValida = (l: unknown): l is string => typeof l === "string" && config.localidades.includes(l);
// ¿El corte informado por Edesur/ENRE (o por la lista de programados) es de la localidad que eligió el vecino?
const canonica = (l: string) => sin(comoLoInforma[l] ?? l);
export const mismaLocalidad = (elegida: string | null | undefined, informada: string | null | undefined) =>
  !!elegida && !!informada && canonica(elegida) === canonica(informada);
