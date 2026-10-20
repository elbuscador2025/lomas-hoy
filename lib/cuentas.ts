// Entrada a mi panel: correo + contraseña, sesión de 30 días.
// Las contraseñas se guardan cifradas (scrypt). Nada secreto vive en el repositorio.
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { redis } from "@/lib/servidor";
const scrypt = promisify(scryptCb) as (p: string, s: Buffer, n: number) => Promise<Buffer>;

export type Sesion = { tipo: "admin"; id: string };

// Contraseñas cifradas con scrypt, nunca en texto plano
export async function hashear(clave: string, salHex = randomBytes(16).toString("hex")) {
  return { sal: salHex, hash: (await scrypt(clave, Buffer.from(salHex, "hex"), 64)).toString("hex") };
}
export const claveValida = (c: unknown) => typeof c === "string" && c.length >= 8 && c.length <= 100;

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

// ---- Entrar ----
export async function entrar(entrada: unknown, clave: string, ip: string) {
  const correo = normalizarCorreo(entrada);
  const llave = `fallos:${sha(ip).slice(0, 16)}:${sha(correo).slice(0, 16)}`;
  const [porPar, porIp] = await redis([["GET", llave], ["GET", `fallos:ip:${sha(ip).slice(0, 16)}`]]);
  if (Number(porPar) >= MAX_FALLOS || Number(porIp) >= MAX_FALLOS_IP) return { error: "bloqueado" as const };

  let sesion: Sesion | null = null;
  if (correo && correo === correoAdmin() && (await claveAdminOk(clave))) sesion = { tipo: "admin", id: "admin" };
  if (!sesion) {
    await redis([
      ["INCR", llave], ["EXPIRE", llave, VENTANA],
      ["INCR", `fallos:ip:${sha(ip).slice(0, 16)}`], ["EXPIRE", `fallos:ip:${sha(ip).slice(0, 16)}`, VENTANA],
    ]);
    return { error: "datos" as const };
  }
  await redis([["DEL", llave]]);
  return { sesion, cookie: await iniciarSesion(sesion), destino: "/panel" };
}

