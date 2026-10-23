// Notificaciones web push. Nada de acá puede romper la app: publicar un aviso o leer una fuente
// nunca depende de que el envío funcione (siempre se llama con notificarSeguro / dentro de after()).
import webpush from "web-push";
import { createHash } from "node:crypto";
import { config } from "@/lomas.config.mjs";
import { redis, hoyArgentina } from "@/lib/servidor";
import { ahoraAR } from "@/lib/avisos";

export type Tipo = "tren" | "luz" | "agua" | "tormenta" | "colectivos" | "mascotas" | "trueque" | "trabajo" | "resumen" | "subte";
export const TIPOS: Tipo[] = ["tren", "luz", "agua", "tormenta", "colectivos", "mascotas", "trueque", "trabajo", "resumen", "subte"];
export type Suscripcion = {
  endpoint: string; keys: { p256dh: string; auth: string };
  tipos: Partial<Record<Tipo, boolean>>; creado: string; // sin nombre, teléfono, ni nada personal
};
export type Evento = {
  tipo: Tipo; clave: string; ttl: number; refrescar?: boolean; // clave = identifica la novedad para no repetirla
  titulo: string; cuerpo: string | ((s: Suscripcion) => string); url: string; nocturna?: boolean;
  urgente?: boolean; // prioridad alta: el celular lo recibe aunque esté en reposo (el saludo de las 7 llegó con 48 minutos de atraso)
};

export const idDe = (endpoint: string) => createHash("sha256").update(endpoint).digest("base64url").slice(0, 22);
const corto = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

// ---- Claves VAPID: se limpian por si quedó algún espacio o salto de línea invisible ----
let listo = false;
function prepararVapid() {
  if (listo) return;
  const limpiar = (v?: string) => (v ?? "").replace(/[^\x21-\x7e]/g, ""); // sin espacios ni caracteres raros
  const subject = limpiar(process.env.VAPID_SUBJECT);
  const pub = limpiar(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY), priv = limpiar(process.env.VAPID_PRIVATE_KEY);
  if (!/^(mailto:[^@\s]+@[^@\s]+\.[^@\s]+|https:\/\/[^\s]+)$/.test(subject)) throw new Error("VAPID_SUBJECT no es válido (tiene que ser mailto:correo o https://sitio)");
  if (!pub || !priv) throw new Error("Faltan las claves VAPID");
  webpush.setVapidDetails(subject, pub, priv);
  listo = true;
}

// ---- Suscripciones ----
export function validarSuscripcion(d: Record<string, unknown>): Suscripcion | string {
  const s = d.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined;
  const endpoint = String(s?.endpoint ?? ""), p256dh = String(s?.keys?.p256dh ?? ""), auth = String(s?.keys?.auth ?? "");
  if (!/^https:\/\/[^\s]{10,500}$/.test(endpoint)) return "Suscripción inválida.";
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(p256dh) || !/^[A-Za-z0-9_-]{8,100}$/.test(auth)) return "Suscripción inválida.";
  const t = (d.tipos ?? {}) as Record<string, unknown>;
  const tipos = Object.fromEntries(TIPOS.map((k) => [k, !!t[k] && config.push.tipos[k].activa])) as Record<Tipo, boolean>;
  // Las alertas de tormenta están prendidas para todos: una versión vieja de la app (anterior a v2) las mandaba apagadas sin que la persona lo hubiera elegido
  if (!(Number(d.v) >= 2)) tipos.tormenta = config.push.tipos.tormenta.activa;
  return { endpoint, keys: { p256dh, auth }, tipos, creado: new Date().toISOString() };
}

export async function guardarSuscripcion(s: Suscripcion) {
  const id = idDe(s.endpoint);
  const [previo] = await redis([["HGET", "push:subs", id]]);
  const creado = previo ? (JSON.parse(previo as string) as Suscripcion).creado : s.creado;
  await redis([["HSET", "push:subs", id, JSON.stringify({ ...s, creado })]]);
}
export async function borrarSuscripcion(endpoint: string) {
  await redis([["HDEL", "push:subs", idDe(endpoint)]]);
}
export async function todasLasSuscripciones(): Promise<Suscripcion[]> {
  const [x] = await redis([["HVALS", "push:subs"]]);
  return (x as string[]).map((j) => JSON.parse(j) as Suscripcion);
}

// ---- Registro de lo que pasó ----
async function registrar(entrada: Record<string, unknown>, enviados = 0, fallidos = 0) {
  const dia = hoyArgentina();
  await redis([
    ["LPUSH", "push:log", JSON.stringify({ t: new Date().toISOString(), ...entrada })],
    ["LTRIM", "push:log", 0, 199],
    ...(enviados || fallidos
      ? ([["HINCRBY", `push:dia:${dia}`, "enviados", enviados], ["HINCRBY", `push:dia:${dia}`, "fallidos", fallidos], ["EXPIRE", `push:dia:${dia}`, 60 * 86400]] as (string | number)[][])
      : []),
  ]);
}

type Resultado = { ok: boolean; estado?: number; mensaje?: string; borrar?: boolean };
async function enviarUna(s: Suscripcion, carga: object, urgente = false): Promise<Resultado> {
  try {
    await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(carga), { TTL: 3600, urgency: urgente ? "high" : "normal" });
    return { ok: true };
  } catch (e) {
    const err = e as { statusCode?: number; body?: string; message?: string };
    // 404 / 410: la suscripción venció o ya no existe → se borra sola
    return { ok: false, estado: err.statusCode, mensaje: String(err.body || err.message || "error").slice(0, 160), borrar: err.statusCode === 404 || err.statusCode === 410 };
  }
}

async function enviarATodas(subs: Suscripcion[], cargaDe: (s: Suscripcion) => object, urgente = false) {
  const resultados: Resultado[] = [];
  for (let i = 0; i < subs.length; i += 10) {
    resultados.push(...(await Promise.all(subs.slice(i, i + 10).map((s) => enviarUna(s, cargaDe(s), urgente)))));
  }
  return resultados;
}

// ---- Enviar una novedad ----
export async function notificar(ev: Evento) {
  if (!config.push.tipos[ev.tipo].activa) return;
  // 1) Nunca dos veces lo mismo (si la novedad sigue activa, se renueva el plazo para que no se repita)
  const [nueva] = await redis([["SET", `push:ev:${ev.clave}`, "1", "NX", "EX", ev.ttl]]);
  if (nueva !== "OK") {
    if (ev.refrescar) await redis([["EXPIRE", `push:ev:${ev.clave}`, ev.ttl]]);
    return;
  }
  // 2) Silencio de 23:00 a 7:00 (la novedad igual se ve dentro de la app)
  const hora = Number(ahoraAR().slice(11, 13));
  if ((hora >= config.push.silencioDesde || hora < config.push.silencioHasta) && !ev.nocturna) {
    await registrar({ tipo: ev.tipo, evento: ev.clave, titulo: ev.titulo, omitida: "horario de silencio" });
    return;
  }
  prepararVapid();
  // 3) Quiénes la reciben: todos los que tienen ese tipo prendido (si todavía no eligieron, está prendido)
  // (mascotas, trueque y trabajo son opcionales: solo le llega a quien lo prendió)
  const interesadas = (await todasLasSuscripciones()).filter((s) => (ev.tipo === "mascotas" || ev.tipo === "trueque" || ev.tipo === "trabajo" || ev.tipo === "subte" ? s.tipos?.[ev.tipo] === true : s.tipos?.[ev.tipo] !== false));
  // 4) Máximo por día y por celular
  const dia = hoyArgentina();
  const [filas] = await redis([["HGETALL", `push:cuenta:${dia}`]]);
  const cuenta = new Map<string, number>();
  const plano = (Array.isArray(filas) ? filas : []) as string[];
  for (let i = 0; i < plano.length; i += 2) cuenta.set(plano[i], Number(plano[i + 1]));
  const destino = interesadas.filter((s) => (cuenta.get(idDe(s.endpoint)) ?? 0) < config.push.maximoPorDia);

  const carga = { titulo: corto(ev.titulo, 60), url: ev.url, tag: ev.clave };
  const res = await enviarATodas(destino, (s) => ({ ...carga, tipo: ev.tipo, cuerpo: corto(typeof ev.cuerpo === "function" ? ev.cuerpo(s) : ev.cuerpo, 240) }), ev.urgente);

  const ok = destino.filter((_, i) => res[i].ok), mal = res.filter((r) => !r.ok);
  const aBorrar = destino.filter((_, i) => res[i].borrar);
  await redis([
    ...ok.map((s) => ["HINCRBY", `push:cuenta:${dia}`, idDe(s.endpoint), 1] as (string | number)[]),
    ["EXPIRE", `push:cuenta:${dia}`, 2 * 86400],
    ...aBorrar.map((s) => ["HDEL", "push:subs", idDe(s.endpoint)] as (string | number)[]),
  ]);
  await registrar({
    tipo: ev.tipo, evento: ev.clave, titulo: carga.titulo, interesadas: interesadas.length, enviadas: ok.length, fallidas: mal.length,
    sinCupo: interesadas.length - destino.length, borradas: aBorrar.length,
    errores: [...new Set(mal.map((r) => `${r.estado ?? "?"}: ${r.mensaje}`))].slice(0, 3),
  }, ok.length, mal.length);
}

// Envía a un solo celular (no cuenta para el máximo ni se frena por horario). Sirve para las pruebas del panel.
export async function enviarAUno(endpoint: string, carga: { titulo: string; cuerpo: string; url: string; tag: string; tipo?: string }, nombre: string) {
  prepararVapid();
  const [j] = await redis([["HGET", "push:subs", idDe(endpoint)]]);
  if (!j) return { ok: false, mensaje: "Este celular no tiene los avisos activados." } as Resultado;
  const r = await enviarUna(JSON.parse(j as string), carga);
  if (r.borrar) await borrarSuscripcion(endpoint);
  await registrar({ tipo: nombre, evento: nombre, enviadas: r.ok ? 1 : 0, fallidas: r.ok ? 0 : 1, errores: r.ok ? [] : [`${r.estado ?? "?"}: ${r.mensaje}`] }, r.ok ? 1 : 0, r.ok ? 0 : 1);
  return r;
}
export async function leerSuscripcion(endpoint: string): Promise<Suscripcion | null> {
  const [j] = await redis([["HGET", "push:subs", idDe(endpoint)]]);
  return j ? (JSON.parse(j as string) as Suscripcion) : null;
}

// Nunca tira error: si algo falla se anota y la app sigue como si nada.
export async function notificarSeguro(ev: Evento) {
  try {
    await notificar(ev);
  } catch (e) {
    console.error("push:", e);
    await registrar({ tipo: ev.tipo, evento: ev.clave, error: String((e as Error).message).slice(0, 200) }).catch(() => {});
  }
}

// Notificación de prueba a un solo celular (no cuenta para el máximo ni se frena por horario).
export async function enviarPrueba(endpoint: string) {
  prepararVapid();
  const [j] = await redis([["HGET", "push:subs", idDe(endpoint)]]);
  if (!j) return { ok: false, mensaje: "Este celular no tiene los avisos activados." };
  const r = await enviarUna(JSON.parse(j as string), { titulo: "Prueba de Lomas Hoy", cuerpo: "Si ves esto, las notificaciones funcionan.", url: "/", tag: "prueba" });
  if (r.borrar) await borrarSuscripcion(endpoint);
  await registrar({ tipo: "prueba", evento: "prueba", enviadas: r.ok ? 1 : 0, fallidas: r.ok ? 0 : 1, errores: r.ok ? [] : [`${r.estado ?? "?"}: ${r.mensaje}`] }, r.ok ? 1 : 0, r.ok ? 0 : 1);
  return r;
}

// ---- Avisos solo para mí (administrador): celulares que activé desde mi panel ----
export async function guardarSuscripcionAdmin(d: Record<string, unknown>) {
  const s = validarSuscripcion({ subscription: d.subscription, tipos: {} });
  if (typeof s === "string") return s;
  await redis([["HSET", "push:admin", idDe(s.endpoint), JSON.stringify(s)]]);
  return null;
}
// No pasa por el silencio ni por el tope: es un aviso de trabajo para mí. Nunca tira error.
export async function notificarAdmin(titulo: string, cuerpo: string, url: string) {
  try {
    prepararVapid();
    const [x] = await redis([["HVALS", "push:admin"]]);
    const subs = (x as string[]).map((j) => JSON.parse(j) as Suscripcion);
    const res = await Promise.all(subs.map((s) => enviarUna(s, { titulo: corto(titulo, 60), cuerpo: corto(cuerpo, 160), url, tag: `admin:${Date.now()}` })));
    const aBorrar = subs.filter((_, i) => res[i].borrar);
    if (aBorrar.length) await redis(aBorrar.map((s) => ["HDEL", "push:admin", idDe(s.endpoint)]));
    await registrar({ tipo: "admin", evento: titulo, enviadas: res.filter((r) => r.ok).length, fallidas: res.filter((r) => !r.ok).length, errores: [...new Set(res.filter((r) => !r.ok).map((r) => `${r.estado ?? "?"}: ${r.mensaje}`))].slice(0, 3) },
      res.filter((r) => r.ok).length, res.filter((r) => !r.ok).length);
  } catch (e) {
    console.error("push admin:", e);
  }
}
