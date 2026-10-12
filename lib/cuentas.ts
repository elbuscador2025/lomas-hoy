// Entrada única para los dos paneles (el mío y el del municipio): correo + contraseña, sesión de 30 días.
// Las contraseñas se guardan cifradas (scrypt). Nada secreto vive en el repositorio.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { redis } from "@/lib/servidor";
import { hashear, leerUsuario, type UsuarioMuni } from "@/lib/municipio";

export type Sesion = { tipo: "admin" | "muni"; id: string };

const DIAS_SESION = 30;
const MAX_FALLOS = 5, MAX_FALLOS_IP = 20, VENTANA = 15 * 60; // 5 intentos por celular y correo → 15 minutos de bloqueo

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export const normalizarCorreo = (s: unknown) => String(s ?? "").trim().toLowerCase().slice(0, 80);
export const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);
export const ipDe = (req: Request) => (req.headers.get("x-forwarded-for") ?? "desconocida").split(",")[0].trim().slice(0, 45);

const iguales = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
async function hashCoincide(clave: string, sal: string, hash: string) {
  const { hash: calculado } = await hashear(clave, sal);
  return iguales(calculado, hash);
}

// ---- Mi cuenta (administrador) ----
// La contraseña inicial es la variable PANEL_PASSWORD de Vercel; al cambiarla desde el panel queda cifrada en la base y manda ella.
export const correoAdmin = () => normalizarCorreo(process.env.ADMIN_EMAIL);
export async function claveAdminOk(clave: string) {
  const [reg] = await redis([["GET", "admin:clave"]]);
  if (reg) { const { sal, hash } = JSON.parse(reg as string); return hashCoincide(clave, sal, hash); }
  const inicial = process.env.PANEL_PASSWORD ?? "";
  return inicial.length > 0 && iguales(clave, inicial);
}
export async function cambiarClaveAdmin(nueva: string) {
  await redis([["SET", "admin:clave", JSON.stringify(await hashear(nueva))]]);
}

// ---- Sesiones ----
export async function iniciarSesion(s: Sesion) {
  const token = randomBytes(32).toString("hex");
  const id = sha(token);
  await redis([
    ["SET", `ses:${id}`, JSON.stringify(s), "EX", DIAS_SESION * 86400],
    ["SADD", `ses:de:${s.tipo}:${s.id}`, id], ["EXPIRE", `ses:de:${s.tipo}:${s.id}`, DIAS_SESION * 86400],
  ]);
  return `sesion=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${DIAS_SESION * 86400}`;
}
export const cookieVacia = "sesion=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";

const tokenDe = (req: Request) => /(?:^|;\s*)sesion=([a-f0-9]{64})/.exec(req.headers.get("cookie") ?? "")?.[1] ?? null;

export async function sesionDe(req: Request): Promise<Sesion | null> {
  const token = tokenDe(req);
  if (!token) return null;
  const [j] = await redis([["GET", `ses:${sha(token)}`]]);
  return j ? (JSON.parse(j as string) as Sesion) : null;
}
export async function cerrarSesion(req: Request) {
  const token = tokenDe(req);
  if (token) await redis([["DEL", `ses:${sha(token)}`]]);
}
export async function cerrarSesionesDe(tipo: Sesion["tipo"], id: string) {
  const [ids] = await redis([["SMEMBERS", `ses:de:${tipo}:${id}`]]);
  const lista = (ids as string[]) ?? [];
  if (lista.length) await redis([...lista.map((x) => ["DEL", `ses:${x}`] as (string | number)[]), ["DEL", `ses:de:${tipo}:${id}`]]);
}

export async function esAdmin(req: Request) {
  return (await sesionDe(req))?.tipo === "admin";
}
// Usuario del municipio con sesión abierta (y activo)
export async function usuarioDeSesion(req: Request): Promise<UsuarioMuni | null> {
  const s = await sesionDe(req);
  if (s?.tipo !== "muni") return null;
  const u = await leerUsuario(s.id);
  return u?.activo ? u : null;
}

// ---- Entrar ----
export async function entrar(entrada: unknown, clave: string, ip: string) {
  const correo = normalizarCorreo(entrada);
  const llave = `fallos:${sha(ip).slice(0, 16)}:${sha(correo).slice(0, 16)}`;
  const [porPar, porIp] = await redis([["GET", llave], ["GET", `fallos:ip:${sha(ip).slice(0, 16)}`]]);
  if (Number(porPar) >= MAX_FALLOS || Number(porIp) >= MAX_FALLOS_IP) return { error: "bloqueado" as const };

  let sesion: Sesion | null = null;
  if (correo && correo === correoAdmin()) {
    if (await claveAdminOk(clave)) sesion = { tipo: "admin", id: "admin" };
  } else {
    // Los usuarios viejos entran con su usuario (sin @); los nuevos, con su correo.
    const u = correo ? await leerUsuario(correo) : null;
    const ok = u ? await hashCoincide(clave, u.sal, u.hash) : (await hashear(clave, "00".repeat(16)), false); // mismo trabajo si no existe
    if (u && ok && u.activo) {
      sesion = { tipo: "muni", id: u.usuario };
      await redis([["HSET", "muni:usuarios", u.usuario, JSON.stringify({ ...u, ultimoIngreso: new Date().toISOString() })]]);
    }
  }
  if (!sesion) {
    await redis([
      ["INCR", llave], ["EXPIRE", llave, VENTANA],
      ["INCR", `fallos:ip:${sha(ip).slice(0, 16)}`], ["EXPIRE", `fallos:ip:${sha(ip).slice(0, 16)}`, VENTANA],
    ]);
    return { error: "datos" as const };
  }
  await redis([["DEL", llave]]);
  return { sesion, cookie: await iniciarSesion(sesion), destino: sesion.tipo === "admin" ? "/panel" : "/municipio" };
}

// ---- Enlaces de un solo uso (invitaciones y cambios de contraseña) ----
export const nuevoToken = () => randomBytes(32).toString("hex");
export const llaveToken = (tipo: "invitacion" | "reset", token: string) => `${tipo}:${sha(token)}`;
export const tokenValido = (t: unknown): t is string => typeof t === "string" && /^[a-f0-9]{64}$/.test(t);
export async function crearEnlace(tipo: "invitacion" | "reset", datos: object, segundos: number) {
  const token = nuevoToken();
  await redis([["SET", llaveToken(tipo, token), JSON.stringify(datos), "EX", segundos]]);
  return token;
}
export async function enlaceVigente(tipo: "invitacion" | "reset", token: string) {
  if (!tokenValido(token)) return false;
  const [e] = await redis([["EXISTS", llaveToken(tipo, token)]]);
  return Number(e) === 1;
}
// Usa el enlace: solo el primero que llega lo consigue (GETDEL es atómico)
export async function consumirEnlace<T>(tipo: "invitacion" | "reset", token: string): Promise<T | null> {
  if (!tokenValido(token)) return null;
  const [j] = await redis([["GETDEL", llaveToken(tipo, token)]]);
  return j ? (JSON.parse(j as string) as T) : null;
}
