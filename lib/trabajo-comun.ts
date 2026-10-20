// Trabajo +50: tipos y reglas que usan el servidor y la pantalla (nada secreto).
import { config } from "@/lomas.config.mjs";

export const RUBROS: string[] = config.trabajo.rubros;
export type Modo = "ofrezco" | "busco";

// Lo que ve la gente (sin datos internos)
export type PublicacionTrabajo = {
  id: string; modo: Modo;
  texto: string; // ofrezco: qué trabajo es · busco: qué sé hacer y experiencia
  rubro: string; barrio: string;
  tipo?: "changa" | "fijo"; // solo "ofrezco"
  horario: string; // ofrezco: horario o días · busco: disponibilidad
  whatsapp: string; // con código de país, listo para wa.me
  foto?: string; // solo "busco", opcional
  creado: string; aprobada: string; vence: string;
};

export const vigenteTrabajo = (p: { vence: string }, ahora = Date.now()) => new Date(p.vence).getTime() > ahora;
export const esNuevaTrabajo = (p: { aprobada: string }, dias: number, ahora = Date.now()) => ahora - new Date(p.aprobada).getTime() <= dias * 86400_000;
