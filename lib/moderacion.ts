// Denuncias y bloqueos de Trueque y Trabajo para mayores de 50 años. Sin dependencias de las dos secciones: las pantallas de mi panel las juntan.
import { createHash } from "node:crypto";
import { redis } from "@/lib/servidor";
import { notificarAdmin } from "@/lib/push";

import { MOTIVOS, MOTIVOS_ESTAFA } from "@/lib/moderacion-comun";
export { MOTIVOS, MOTIVOS_ESTAFA };
export const DENUNCIAS_PARA_OCULTAR = 3;
export type Seccion = "trueque" | "trabajo";
export type Denuncia = { motivo: string; disp: string; t: string };
export const huella = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

// ---- Bloqueados: un número de WhatsApp y un celular ----
export type Bloqueo = { id: string; whatsapp: string; disp: string; t: string; nota: string };

export async function estaBloqueado(whatsapp: string | null, disp: string) {
  const [x] = await redis([["HVALS", "bloqueados"]]);
  return (x as string[]).map((j) => JSON.parse(j) as Bloqueo).some((b) => (!!whatsapp && b.whatsapp === whatsapp) || (!!disp && b.disp === disp));
}
export async function agregarBloqueo(whatsapp: string, disp: string, nota: string) {
  const id = huella(`${whatsapp}|${disp}`);
  const b: Bloqueo = { id, whatsapp, disp, t: new Date().toISOString(), nota: nota.slice(0, 80) };
  await redis([["HSET", "bloqueados", id, JSON.stringify(b)]]);
}
export async function listarBloqueos(): Promise<Bloqueo[]> {
  const [x] = await redis([["HVALS", "bloqueados"]]);
  return (x as string[]).map((j) => JSON.parse(j) as Bloqueo).sort((a, b) => b.t.localeCompare(a.t));
}
export async function desbloquear(id: string) {
  await redis([["HDEL", "bloqueados", id]]);
}

// ---- Denuncias: cada celular cuenta una sola vez por publicación; con 3 se oculta hasta que yo la revise ----
type Registro = { situacion: string; denuncias?: Denuncia[]; oculta?: boolean } & Record<string, unknown>;

export async function denunciar(seccion: Seccion, id: string, motivo: string, dispositivo: string, resumen: string) {
  if (!MOTIVOS.includes(motivo)) return false;
  const [j] = await redis([["HGET", seccion, id]]);
  if (!j) return false;
  const r = JSON.parse(j as string) as Registro;
  if (r.situacion !== "aprobada") return false;
  const disp = huella(dispositivo);
  const lista = (r.denuncias ?? []).filter((d) => d.disp !== disp);
  lista.push({ motivo, disp, t: new Date().toISOString() });
  const oculta = lista.length >= DENUNCIAS_PARA_OCULTAR || !!r.oculta;
  await redis([["HSET", seccion, id, JSON.stringify({ ...r, denuncias: lista, oculta })]]);
  await notificarAdmin(oculta ? "Publicación oculta por denuncias" : "Nueva denuncia", `${motivo}: ${resumen.slice(0, 100)}`, `/panel#${seccion}`);
  return true;
}
// Mi revisión: la publicación vuelve a verse y se borran las denuncias
export async function dejarPublicada(seccion: Seccion, id: string) {
  const [j] = await redis([["HGET", seccion, id]]);
  if (!j) return false;
  const { denuncias: _d, oculta: _o, ...r } = JSON.parse(j as string) as Registro;
  await redis([["HSET", seccion, id, JSON.stringify(r)]]);
  return true;
}

// ---- "Denunciar una estafa": denuncias libres que manda cualquier vecino (no ligadas a una publicación) ----
export type DenunciaLibre = { id: string; seccion: Seccion; motivo: string; whatsapp: string; publicacion: string; texto: string; t: string; bloqueada?: boolean };

export async function guardarDenunciaLibre(d: Omit<DenunciaLibre, "id" | "t">) {
  const t = new Date().toISOString();
  const id = huella(`${t}|${d.texto}|${Math.random()}`);
  await redis([["HSET", "estafas", id, JSON.stringify({ ...d, id, t })], ["EXPIRE", "estafas", 400 * 86400]]);
}
export async function listarDenunciasLibres(): Promise<DenunciaLibre[]> {
  const [x] = await redis([["HVALS", "estafas"]]);
  return (x as string[]).map((j) => JSON.parse(j) as DenunciaLibre).sort((a, b) => b.t.localeCompare(a.t));
}
export async function marcarBloqueada(id: string) {
  const [j] = await redis([["HGET", "estafas", id]]);
  if (!j) return null;
  const d = JSON.parse(j as string) as DenunciaLibre;
  await redis([["HSET", "estafas", id, JSON.stringify({ ...d, bloqueada: true })]]);
  return d;
}
