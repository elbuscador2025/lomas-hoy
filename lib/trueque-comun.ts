// Trueque entre vecinos: tipos y reglas que usan el servidor y la pantalla (nada secreto).
import { config } from "@/lomas.config.mjs";

export const CATEGORIAS_TRUEQUE: string[] = config.trueque.categorias;

// Lo que ve la gente (sin datos internos)
export type PublicacionTrueque = {
  id: string; ofrezco: string; busco: string; categoria: string; barrio: string;
  whatsapp: string; // con código de país, listo para wa.me
  foto: string; creado: string; aprobada: string; vence: string;
};
export type FeriaTrueque = {
  id: string; lugar: string; direccion: string; barrio: string; dias: string; horario: string; whatsapp: string; // whatsapp puede ir vacío
};
export type TruequePublico = { publicaciones: PublicacionTrueque[]; ferias: FeriaTrueque[] };

export const vigenteTrueque = (p: { vence: string }, ahora = Date.now()) => new Date(p.vence).getTime() > ahora;
export const esNuevaTrueque = (p: { aprobada: string }, dias: number, ahora = Date.now()) => ahora - new Date(p.aprobada).getTime() <= dias * 86400_000;

// "Posible venta": el texto menciona vender, precio, $ o números que parecen plata
export const posibleVenta = (texto: string) =>
  /\$|\bvend(o|e|emos|er)\b|\bventa\b|\bprecio\b|\bpesos\b|\busd\b|\bd[oó]lar(es)?\b|\b\d{1,3}(\.\d{3})+\b|\b\d{4,}\b/i.test(texto);
