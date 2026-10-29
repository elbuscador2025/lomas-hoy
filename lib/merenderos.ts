// Merenderos y ollas populares: cada uno tiene su cuenta, su cena publicada y su lista de celulares anotados.
// De la gente de la lista NO se guarda ningún dato personal: solo la dirección que da el navegador para mandarle el aviso.
import { randomBytes, randomUUID } from "node:crypto";
import { config } from "@/lomas.config.mjs";
import { redis, hoyArgentina } from "@/lib/servidor";
import { ahoraAR } from "@/lib/avisos";
import { hashear, hashCoincide, normalizarCorreo, correoAdmin } from "@/lib/cuentas";
import { validarSuscripcion, idDe, enviarALista } from "@/lib/push";

export type Cena = { estado: "hay" | "suspendida"; queHay: string; dia: string; hora: string; donde: string; t: string };
export type Merendero = { id: string; nombre: string; responsable: string; direccion: string; correo: string; activo: boolean; abierta: boolean; creado: string; sal: string; hash: string; cena?: Cena };

const DIAS_INVITACION = 7;
export const limpio = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

// ---- Lectura ----
export async function leer(id: string): Promise<Merendero | null> {
  if (!/^[a-f0-9]{8,32}$/.test(id)) return null;
  const [j] = await redis([["HGET", "mer:cuentas", id]]);
  return j ? (JSON.parse(j as string) as Merendero) : null;
}
const guardar = (m: Merendero) => redis([["HSET", "mer:cuentas", m.id, JSON.stringify(m)]]);
export const personas = async (id: string) => Number((await redis([["HLEN", `mer:subs:${id}`]]))[0]) || 0;

// Lo que ve cualquiera que tenga el enlace (nunca el correo ni la contraseña)
export const vistaPublica = (m: Merendero) => ({ id: m.id, nombre: m.nombre, direccion: m.direccion, abierta: m.abierta, cena: m.cena ?? null });

export async function listar() {
  const [vals] = await redis([["HVALS", "mer:cuentas"]]);
  const lista = (vals as string[]).map((j) => JSON.parse(j) as Merendero).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const cuentas = await redis(lista.map((m) => ["HLEN", `mer:subs:${m.id}`]));
  return lista.map((m, i) => ({ id: m.id, nombre: m.nombre, responsable: m.responsable, correo: m.correo, activo: m.activo, abierta: m.abierta, personas: Number(cuentas[i]) || 0 }));
}

// ---- Invitaciones: sirven una sola vez y vencen a los 7 días ----
export async function crearInvitacion() {
  const token = randomBytes(16).toString("hex");
  await redis([["SET", `mer:inv:${token}`, "1", "EX", DIAS_INVITACION * 86400]]);
  return token;
}
export async function invitacionVigente(token: string) {
  return /^[a-f0-9]{32}$/.test(token) && Number((await redis([["EXISTS", `mer:inv:${token}`]]))[0]) === 1;
}

// ---- Alta ----
export async function registrar(token: string, d: { nombre: string; responsable: string; direccion: string; correo: string; clave: string }) {
  if (!(await invitacionVigente(token))) return { error: "La invitación no sirve: ya se usó o venció. Pedí una nueva." };
  const correo = normalizarCorreo(d.correo);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return { error: "Escribí un mail válido." };
  if (correo === correoAdmin()) return { error: "Ese mail no se puede usar." };
  const id = randomUUID().replace(/-/g, "").slice(0, 12);
  const [reservado] = await redis([["SET", `mer:correo:${correo}`, id, "NX"]]);
  if (reservado !== "OK") return { error: "Ese mail ya está registrado." };
  // la invitación se gasta recién acá: si dos personas la usan a la vez, solo una gana
  const [gastada] = await redis([["DEL", `mer:inv:${token}`]]);
  if (Number(gastada) !== 1) { await redis([["DEL", `mer:correo:${correo}`]]); return { error: "La invitación no sirve: ya se usó o venció. Pedí una nueva." }; }
  const m: Merendero = { id, nombre: d.nombre, responsable: d.responsable, direccion: d.direccion, correo, activo: true, abierta: true, creado: new Date().toISOString(), ...(await hashear(d.clave)) };
  await guardar(m);
  return { id };
}

// ---- Entrar (lo usa el mismo "Ingresar" de siempre) ----
export async function merenderoPorCredenciales(correoIn: string, clave: string): Promise<string | null> {
  const correo = normalizarCorreo(correoIn);
  const [id] = await redis([["GET", `mer:correo:${correo}`]]);
  if (!id) return null;
  const m = await leer(String(id));
  if (!m || !m.activo) return null;
  return (await hashCoincide(clave, m.sal, m.hash)) ? m.id : null;
}

// ---- Panel de quien administra ----
export async function cambiarActivo(id: string, activo: boolean) {
  const m = await leer(id); if (!m) return false;
  await guardar({ ...m, activo });
  return true;
}
export async function nuevaClaveTemporal(id: string) {
  const m = await leer(id); if (!m) return null;
  const alfabeto = "abcdefghjkmnpqrstuvwxyz23456789";
  const temporal = Array.from(randomBytes(10), (b) => alfabeto[b % alfabeto.length]).join("");
  await guardar({ ...m, ...(await hashear(temporal)) });
  return temporal;
}

// ---- Panel del merendero ----
export async function cambiarLista(id: string, abierta: boolean) {
  const m = await leer(id); if (!m) return;
  await guardar({ ...m, abierta });
}
export async function anotar(id: string, cuerpo: Record<string, unknown>) {
  const m = await leer(id);
  if (!m || !m.activo) return { error: "Esta olla no existe.", estado: 404 };
  if (!m.abierta) return { error: "cerrada", estado: 403 };
  const s = validarSuscripcion({ subscription: cuerpo.subscription, tipos: {} });
  if (typeof s === "string") return { error: s, estado: 400 };
  // solo se guarda la dirección del celular y las claves para mandarle el aviso
  await redis([["HSET", `mer:subs:${id}`, idDe(s.endpoint), JSON.stringify({ endpoint: s.endpoint, keys: s.keys, tipos: {}, creado: new Date().toISOString() })]]);
  return { ok: true };
}

// ---- Cena y avisos ----
const quitarCero = (h: string) => h.replace(/^0/, "");
const diaTexto = (f: string) => { const t = new Date(f + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric" }).replace(",", ""); return t; };
function mensaje(m: Merendero, c: Cena) {
  if (c.estado === "suspendida") return { titulo: `🍲 ${m.nombre}: hoy no hay cena`, cuerpo: "" };
  const cuando = c.dia === hoyArgentina() ? "hoy hay cena" : `hay cena el ${diaTexto(c.dia)}`;
  return { titulo: `🍲 ${m.nombre}: ${cuando}`, cuerpo: `${c.queHay} · ${quitarCero(c.hora)} hs · ${c.donde}` };
}
const enSilencio = () => { const h = Number(ahoraAR().slice(11, 13)); return h >= config.push.silencioDesde || h < config.push.silencioHasta; };

// Guarda la cena (se ve al instante en la app); el aviso al celular se manda aparte, con avisar().
export async function guardarCena(id: string, c: Omit<Cena, "t">) {
  const m = await leer(id); if (!m) return null;
  const cena: Cena = { ...c, t: new Date().toISOString() };
  await guardar({ ...m, cena });
  return { m: { ...m, cena }, cena };
}
// Solo a los celulares de esa lista. De 23 a 7 queda guardado y sale a las 7 (si hay dos cambios seguidos, sale el último).
export async function avisar(m: Merendero, c: Cena) {
  try {
    const msg = mensaje(m, c);
    if (enSilencio()) { await redis([["HSET", "mer:pend", m.id, JSON.stringify(msg)]]); return; }
    await redis([["HDEL", "mer:pend", m.id]]);
    await enviarALista(`mer:subs:${m.id}`, { ...msg, url: "/", tag: `olla:${m.id}`, tipo: "olla" }, `olla:${m.nombre}`);
  } catch (e) {
    console.error("merendero aviso:", e);
  }
}
export async function enviarPendientes() {
  try {
    if (enSilencio()) return;
    const [x] = await redis([["HGETALL", "mer:pend"]]);
    const plano = (Array.isArray(x) ? x : []) as string[];
    for (let i = 0; i < plano.length; i += 2) {
      const id = plano[i];
      await redis([["HDEL", "mer:pend", id]]);
      const m = await leer(id);
      if (m?.activo) await enviarALista(`mer:subs:${id}`, { ...(JSON.parse(plano[i + 1]) as { titulo: string; cuerpo: string }), url: "/", tag: `olla:${id}`, tipo: "olla" }, `olla:${m.nombre}`);
    }
  } catch (e) {
    console.error("merendero pendientes:", e);
  }
}
