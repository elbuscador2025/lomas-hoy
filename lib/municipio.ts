// Usuarios del municipio y avisos. Todo se valida acá, en el servidor.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { config } from "@/lomas.config.mjs";
import { redis, hoyArgentina } from "@/lib/servidor";

const scrypt = promisify(scryptCb) as (p: string, s: Buffer, n: number) => Promise<Buffer>;

export type UsuarioMuni = { usuario: string; nombre: string; firma: string; activo: boolean; sal: string; hash: string };
import { FIRMA_POR_DEFECTO, ahoraAR, vigente, type Aviso } from "@/lib/avisos";
export { FIRMA_POR_DEFECTO, ahoraAR, vigente };
export type { Aviso };
const HORAS_SESION = 12;

// ---- Contraseñas (cifradas con scrypt, nunca en texto plano) ----
export async function hashear(clave: string, salHex = randomBytes(16).toString("hex")) {
  return { sal: salHex, hash: (await scrypt(clave, Buffer.from(salHex, "hex"), 64)).toString("hex") };
}
async function claveCorrecta(u: UsuarioMuni | null, clave: string) {
  // Si el usuario no existe se calcula igual, para que no se note la diferencia.
  const { hash } = await hashear(clave, u?.sal ?? "00".repeat(16));
  const a = Buffer.from(hash, "hex"), b = Buffer.from(u?.hash ?? "00".repeat(64), "hex");
  return !!u && a.length === b.length && timingSafeEqual(a, b);
}

export const usuarioValido = (u: unknown) => typeof u === "string" && /^[a-z0-9._-]{3,30}$/.test(u);
export const claveValida = (c: unknown) => typeof c === "string" && c.length >= 8 && c.length <= 100;

export async function leerUsuario(usuario: string): Promise<UsuarioMuni | null> {
  const [x] = await redis([["HGET", "muni:usuarios", usuario]]);
  return x ? JSON.parse(x as string) : null;
}

// ---- Ingreso con límite de intentos fallidos ----
const MAX_POR_USUARIO = 5, MAX_POR_IP = 20, VENTANA = 15 * 60;

export async function ingresar(usuario: string, clave: string, ip: string) {
  const [porUsuario, porIp] = await redis([["GET", `muni:fallos:u:${usuario}`], ["GET", `muni:fallos:ip:${ip}`]]);
  if (Number(porUsuario) >= MAX_POR_USUARIO || Number(porIp) >= MAX_POR_IP) return { error: "bloqueado" as const };
  const u = usuarioValido(usuario) ? await leerUsuario(usuario) : null;
  if (!(await claveCorrecta(u, clave)) || !u?.activo) {
    await redis([
      ["INCR", `muni:fallos:u:${usuario.slice(0, 30)}`], ["EXPIRE", `muni:fallos:u:${usuario.slice(0, 30)}`, VENTANA],
      ["INCR", `muni:fallos:ip:${ip}`], ["EXPIRE", `muni:fallos:ip:${ip}`, VENTANA],
    ]);
    return { error: "datos" as const };
  }
  const token = randomBytes(32).toString("hex");
  await redis([["SET", `muni:sesion:${token}`, u.usuario, "EX", HORAS_SESION * 3600], ["DEL", `muni:fallos:u:${usuario}`]]);
  return { token, maxAge: HORAS_SESION * 3600 };
}

export async function usuarioDeSesion(req: Request): Promise<UsuarioMuni | null> {
  const token = /(?:^|;\s*)muni=([a-f0-9]{64})/.exec(req.headers.get("cookie") ?? "")?.[1];
  if (!token) return null;
  const [nombre] = await redis([["GET", `muni:sesion:${token}`]]);
  const u = typeof nombre === "string" ? await leerUsuario(nombre) : null;
  return u?.activo ? u : null;
}

export const ipDe = (req: Request) => (req.headers.get("x-forwarded-for") ?? "desconocida").split(",")[0].trim().slice(0, 45);

// ---- Avisos ----
const limpiar = (v: unknown, max: number) =>
  String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);

// Devuelve el aviso limpio o un texto con el error.
export function validarAviso(d: Record<string, unknown>, zonas: string[]): { ok: Pick<Aviso, "titulo" | "texto" | "zona" | "actividad" | "direccion"> } | { error: string } {
  const titulo = limpiar(d.titulo, 100), texto = limpiar(d.texto, 1000), direccion = limpiar(d.direccion, 150);
  const zona = limpiar(d.zona, 40), actividad = limpiar(d.actividad, 16) || null;
  if (!titulo) return { error: "Falta el título." };
  if (!texto) return { error: "Falta el texto." };
  if (!zonas.includes(zona)) return { error: "La zona no es válida." };
  if (actividad && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(actividad)) return { error: "La fecha y hora no son válidas." };
  return { ok: { titulo, texto, zona, actividad, direccion } };
}

export async function todosLosAvisos(): Promise<Aviso[]> {
  const [x] = await redis([["HVALS", "avisos"]]);
  return (x as string[]).map((j) => JSON.parse(j) as Aviso).sort((a, b) => b.creado.localeCompare(a.creado));
}

export async function topeDiario() {
  const [x] = await redis([["GET", "muni:tope"]]);
  const n = x == null ? NaN : Number(x); // sin valor guardado = el de la configuración
  return Number.isInteger(n) && n >= 0 ? n : config.avisos.topePorDia;
}

export async function publicadosHoy() {
  const [x] = await redis([["GET", `muni:publicados:${hoyArgentina()}`]]);
  return Number(x) || 0;
}

// Cuenta el aviso en el tope diario de forma atómica. Devuelve false si ya se llegó al tope.
export async function reservarCupo() {
  const tope = await topeDiario();
  const llave = `muni:publicados:${hoyArgentina()}`;
  const [n] = await redis([["INCR", llave], ["EXPIRE", llave, 172800]]);
  if (Number(n) > tope) {
    await redis([["DECR", llave]]);
    return false;
  }
  return true;
}

// ---- Barrios (la lista que usa el municipio para etiquetar avisos; la administro desde mi panel) ----
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
