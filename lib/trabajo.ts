// Trabajo +50: guardado, moderación, fotos y limpieza. Todo se valida acá, en el servidor.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { put, del } from "@vercel/blob";
import { config } from "@/lomas.config.mjs";
import { redis, hoyArgentina } from "@/lib/servidor";
import { ahoraAR } from "@/lib/avisos";
import { barriosActuales } from "@/lib/barrios";
import { notificarSeguro } from "@/lib/push";
import { normalizarWhatsapp } from "@/lib/mascotas-comun";
import { posibleEstafa, datoProhibido } from "@/lib/estafas";
import { estaBloqueado, huella } from "@/lib/moderacion";
import type { PublicacionTrabajo, Modo } from "@/lib/trabajo-comun";

type Registro = {
  id: string; modo: Modo; texto: string; rubro: string; barrio: string; tipo?: "changa" | "fijo"; horario: string; whatsapp: string;
  foto?: { url: string }; creado: string; situacion: "pendiente" | "aprobada";
  aprobada?: string; vence?: string; posibleEstafa: boolean; disp: string; oculta?: boolean;
  denuncias?: { motivo: string; disp: string; t: string }[]; tokenHash: string; // el enlace propio se guarda solo como huella
};

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const limpio = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
const DIAS = 86400_000;

async function todas(): Promise<Registro[]> {
  const [x] = await redis([["HVALS", "trabajo"]]);
  return (x as string[]).map((j) => JSON.parse(j) as Registro);
}
const borrarFoto = (r: Registro) => (r.foto ? del(r.foto.url).catch(() => {}) : Promise.resolve());

// Lo que se muestra en la app: aprobadas, sin ocultar por denuncias y que no vencieron
export async function publicas(): Promise<PublicacionTrabajo[]> {
  const ahora = Date.now();
  return (await todas())
    .filter((r) => r.situacion === "aprobada" && !r.oculta && r.vence && new Date(r.vence).getTime() > ahora)
    .sort((a, b) => b.aprobada!.localeCompare(a.aprobada!))
    .map((r) => ({ id: r.id, modo: r.modo, texto: r.texto, rubro: r.rubro, barrio: r.barrio, tipo: r.tipo, horario: r.horario, whatsapp: r.whatsapp, foto: r.foto?.url, creado: r.creado, aprobada: r.aprobada!, vence: r.vence! }));
}

// Máximo 3 por día por celular
export async function limitePorDia(dispositivo: string, ip: string) {
  const dia = hoyArgentina();
  const kd = `trabajo:dia:${dia}:d:${sha(dispositivo).slice(0, 16)}`, ki = `trabajo:dia:${dia}:ip:${sha(ip).slice(0, 16)}`;
  const [d, i] = await redis([["INCR", kd], ["INCR", ki]]);
  await redis([["EXPIRE", kd, 2 * 86400], ["EXPIRE", ki, 2 * 86400]]);
  return Number(d) <= config.trabajo.maxPorDiaPorCelular && Number(i) <= config.trabajo.maxPorDiaPorCelular * 3;
}

export async function crearPendiente(form: FormData, dispositivo: string): Promise<{ ok: true; token: string; id: string; posibleEstafa: boolean; modo: Modo } | { ok: false; error: string }> {
  const max = config.trabajo.maxTexto;
  const modo = limpio(form.get("modo"), 10);
  if (modo !== "ofrezco" && modo !== "busco") return { ok: false, error: "No se pudo enviar." };
  const texto = limpio(form.get("texto"), max + 1), horario = limpio(form.get("horario"), 80);
  const rubro = limpio(form.get("rubro"), 30), barrio = limpio(form.get("barrio"), 40), tipo = limpio(form.get("tipo"), 10);
  if (texto.length < 5) return { ok: false, error: modo === "ofrezco" ? "Contá qué trabajo es." : "Contá qué sabés hacer." };
  if (texto.length > max) return { ok: false, error: `El texto puede tener hasta ${max} caracteres.` };
  if (horario.length < 3) return { ok: false, error: modo === "ofrezco" ? "Poné el horario o los días." : "Poné tu disponibilidad." };
  if (!config.trabajo.rubros.includes(rubro)) return { ok: false, error: "Elegí el rubro." };
  if (!(await barriosActuales()).includes(barrio)) return { ok: false, error: "Elegí el barrio." };
  if (modo === "ofrezco" && tipo !== "changa" && tipo !== "fijo") return { ok: false, error: "Elegí si es una changa o un trabajo fijo." };
  const prohibido = datoProhibido(texto, horario);
  if (prohibido) return { ok: false, error: prohibido };
  const whatsapp = normalizarWhatsapp(limpio(form.get("whatsapp"), 30));
  if (!whatsapp) return { ok: false, error: "El WhatsApp no es válido. Ponelo con código de área, sin 0 ni 15 (ej. 11 5555-5555)." };
  const disp = huella(dispositivo);
  if (await estaBloqueado(whatsapp, disp)) return { ok: false, error: "No podés publicar desde este celular o con este número." };

  const id = randomUUID().slice(0, 10), token = randomBytes(24).toString("hex");
  let foto: { url: string } | undefined;
  const archivo = form.get("foto"); // solo "busco", y es opcional
  if (modo === "busco" && archivo instanceof File && archivo.size > 0) {
    if (archivo.size > 900_000) return { ok: false, error: "La foto es muy pesada. Probá con otra." };
    const bytes = Buffer.from(await archivo.arrayBuffer());
    if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) return { ok: false, error: "La foto tiene que ser una imagen JPG." };
    try {
      foto = { url: (await put(`trabajo/${id}.jpg`, bytes, { access: "public", contentType: "image/jpeg", addRandomSuffix: true })).url };
    } catch (e) {
      console.error("foto:", e);
      return { ok: false, error: "No se pudo subir la foto. Probá de nuevo en un rato." };
    }
  }
  const sospechosa = posibleEstafa(texto, horario);
  const r: Registro = {
    id, modo, texto, rubro, barrio, tipo: modo === "ofrezco" ? (tipo as "changa" | "fijo") : undefined, horario, whatsapp, foto,
    creado: new Date().toISOString(), situacion: "pendiente", posibleEstafa: sospechosa, disp, tokenHash: sha(token),
  };
  await redis([["HSET", "trabajo", id, JSON.stringify(r)], ["SET", `trabajo:tok:${sha(token)}`, id, "EX", 40 * 86400]]);
  return { ok: true, token, id, posibleEstafa: sospechosa, modo };
}

// ---- Moderación (mi panel) ----
export async function paraModerar() {
  const t = await todas();
  const ordenar = (a: Registro, b: Registro) => b.creado.localeCompare(a.creado);
  const ver = ({ tokenHash: _t, ...r }: Registro) => r;
  return { pendientes: t.filter((r) => r.situacion === "pendiente").sort(ordenar).map(ver), aprobadas: t.filter((r) => r.situacion === "aprobada").sort(ordenar).map(ver) };
}
export async function aprobar(id: string) {
  const [j] = await redis([["HGET", "trabajo", id]]);
  if (!j) return false;
  const r = JSON.parse(j as string) as Registro;
  const ahora = new Date();
  await redis([["HSET", "trabajo", id, JSON.stringify({ ...r, situacion: "aprobada", aprobada: ahora.toISOString(), vence: new Date(ahora.getTime() + config.trabajo.diasVigencia * DIAS).toISOString() })]]);
  return true;
}
// Rechazar o bajar: se borra la publicación y su foto
export async function quitar(id: string) {
  const [j] = await redis([["HGET", "trabajo", id]]);
  if (!j) return false;
  const r = JSON.parse(j as string) as Registro;
  await borrarFoto(r);
  await redis([["HDEL", "trabajo", id], ["DEL", `trabajo:tok:${r.tokenHash}`]]);
  return true;
}
// Datos para bloquear a quien publicó (y para bajar todo lo suyo)
export async function deQuien(id: string) {
  const [j] = await redis([["HGET", "trabajo", id]]);
  if (!j) return null;
  const r = JSON.parse(j as string) as Registro;
  return { whatsapp: r.whatsapp, disp: r.disp ?? "", nota: r.texto };
}
export async function quitarDe(whatsapp: string, disp: string) {
  for (const r of await todas()) if (r.whatsapp === whatsapp || (disp && r.disp === disp)) await quitar(r.id);
}

// ---- Enlace propio de quien publicó ("Ya conseguí" / "Ya lo cubrí") ----
export async function porToken(token: string): Promise<Registro | null> {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const [id] = await redis([["GET", `trabajo:tok:${sha(token)}`]]);
  if (!id) return null;
  const [j] = await redis([["HGET", "trabajo", String(id)]]);
  return j ? (JSON.parse(j as string) as Registro) : null;
}
export const baja = quitar;

// ---- Mantenimiento (lo corre el proceso automático): vencidas se bajan solas y se borra su foto ----
export async function mantener() {
  const ahora = Date.now();
  for (const r of await todas()) {
    const vencida = r.situacion === "aprobada"
      ? !!r.vence && new Date(r.vence).getTime() <= ahora
      : ahora - new Date(r.creado).getTime() > config.trabajo.diasVigencia * DIAS; // una pendiente sin revisar también vence
    if (vencida) await quitar(r.id);
  }
  // Aviso diario (solo para quien lo prendió): entre las 19 y las 20, juntando lo publicado hoy
  const ahoraStr = ahoraAR(), hm = ahoraStr.slice(11, 16);
  if (hm >= config.trabajo.horaResumen.desde && hm < config.trabajo.horaResumen.hasta) {
    const hoy = ahoraStr.slice(0, 10);
    const n = (await publicas()).filter((m) => ahoraAR(new Date(m.aprobada)).slice(0, 10) === hoy).length;
    if (n > 0) {
      await notificarSeguro({
        tipo: "trabajo", clave: `trabajo:resumen:${hoy}`, ttl: 2 * 86400,
        titulo: "Trabajo +50", cuerpo: `Hoy hay ${n} ${n === 1 ? "trabajo nuevo" : "trabajos nuevos"} en Lomas`, url: "/?v=trabajo",
      });
    }
  }
}
