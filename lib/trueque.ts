// Trueque entre vecinos: guardado, moderación, fotos y limpieza. Todo se valida acá, en el servidor.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { put, del } from "@vercel/blob";
import { config } from "@/lomas.config.mjs";
import { redis, hoyArgentina } from "@/lib/servidor";
import { ahoraAR } from "@/lib/avisos";
import { barriosActuales } from "@/lib/barrios";
import { notificarSeguro } from "@/lib/push";
import { normalizarWhatsapp } from "@/lib/mascotas-comun";
import { posibleVenta, type PublicacionTrueque, type FeriaTrueque } from "@/lib/trueque-comun";

type Registro = {
  id: string; ofrezco: string; busco: string; categoria: string; barrio: string; whatsapp: string;
  foto: { url: string }; creado: string; situacion: "pendiente" | "aprobada";
  aprobada?: string; vence?: string; posibleVenta: boolean; tokenHash: string; // el enlace propio se guarda solo como huella
};
type RegistroFeria = FeriaTrueque & { creado: string; situacion: "pendiente" | "aprobada" };

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const limpio = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
const DIAS = 86400_000;

async function todas(): Promise<Registro[]> {
  const [x] = await redis([["HVALS", "trueque"]]);
  return (x as string[]).map((j) => JSON.parse(j) as Registro);
}
async function todasFerias(): Promise<RegistroFeria[]> {
  const [x] = await redis([["HVALS", "trueque:ferias"]]);
  return (x as string[]).map((j) => JSON.parse(j) as RegistroFeria);
}
const borrarFoto = (r: Registro) => del(r.foto.url).catch(() => {});

// Lo que se muestra en la app: aprobadas y que no vencieron
export async function publicas() {
  const ahora = Date.now();
  const publicaciones: PublicacionTrueque[] = (await todas())
    .filter((r) => r.situacion === "aprobada" && r.vence && new Date(r.vence).getTime() > ahora)
    .sort((a, b) => b.aprobada!.localeCompare(a.aprobada!))
    .map((r) => ({ id: r.id, ofrezco: r.ofrezco, busco: r.busco, categoria: r.categoria, barrio: r.barrio, whatsapp: r.whatsapp, foto: r.foto.url, creado: r.creado, aprobada: r.aprobada!, vence: r.vence! }));
  const ferias: FeriaTrueque[] = (await todasFerias())
    .filter((f) => f.situacion === "aprobada")
    .sort((a, b) => a.lugar.localeCompare(b.lugar, "es"))
    .map(({ id, lugar, direccion, barrio, dias, horario, whatsapp }) => ({ id, lugar, direccion, barrio, dias, horario, whatsapp }));
  return { publicaciones, ferias };
}

// Máximo 3 por día por celular (publicaciones y ferias suman)
export async function limitePorDia(dispositivo: string, ip: string) {
  const dia = hoyArgentina();
  const kd = `trueque:dia:${dia}:d:${sha(dispositivo).slice(0, 16)}`, ki = `trueque:dia:${dia}:ip:${sha(ip).slice(0, 16)}`;
  const [d, i] = await redis([["INCR", kd], ["INCR", ki]]);
  await redis([["EXPIRE", kd, 2 * 86400], ["EXPIRE", ki, 2 * 86400]]);
  return Number(d) <= config.trueque.maxPorDiaPorCelular && Number(i) <= config.trueque.maxPorDiaPorCelular * 3;
}

export async function crearPendiente(form: FormData): Promise<{ ok: true; token: string; id: string; posibleVenta: boolean } | { ok: false; error: string }> {
  const max = config.trueque.maxTexto;
  const ofrezco = limpio(form.get("ofrezco"), max + 1), busco = limpio(form.get("busco"), max + 1);
  const categoria = limpio(form.get("categoria"), 20), barrio = limpio(form.get("barrio"), 40);
  if (ofrezco.length < 3) return { ok: false, error: "Contá qué ofrecés." };
  if (busco.length < 3) return { ok: false, error: "Contá qué buscás a cambio." };
  if (ofrezco.length > max || busco.length > max) return { ok: false, error: `Cada texto puede tener hasta ${max} caracteres.` };
  if (!config.trueque.categorias.includes(categoria)) return { ok: false, error: "Elegí la categoría." };
  if (!(await barriosActuales()).includes(barrio)) return { ok: false, error: "Elegí el barrio." };
  const whatsapp = normalizarWhatsapp(limpio(form.get("whatsapp"), 30));
  if (!whatsapp) return { ok: false, error: "El WhatsApp no es válido. Ponelo con código de área, sin 0 ni 15 (ej. 11 5555-5555)." };

  const foto = form.get("foto");
  if (!(foto instanceof File) || foto.size === 0) return { ok: false, error: "Falta la foto." };
  if (foto.size > 900_000) return { ok: false, error: "La foto es muy pesada. Probá con otra." };
  const bytes = Buffer.from(await foto.arrayBuffer());
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) return { ok: false, error: "La foto tiene que ser una imagen JPG." };

  const id = randomUUID().slice(0, 10), token = randomBytes(24).toString("hex");
  let url: string;
  try {
    url = (await put(`trueque/${id}.jpg`, bytes, { access: "public", contentType: "image/jpeg", addRandomSuffix: true })).url;
  } catch (e) {
    console.error("foto:", e);
    return { ok: false, error: "No se pudo subir la foto. Probá de nuevo en un rato." };
  }
  const venta = posibleVenta(`${ofrezco} ${busco}`);
  const r: Registro = { id, ofrezco, busco, categoria, barrio, whatsapp, foto: { url }, creado: new Date().toISOString(), situacion: "pendiente", posibleVenta: venta, tokenHash: sha(token) };
  await redis([["HSET", "trueque", id, JSON.stringify(r)], ["SET", `trueque:tok:${sha(token)}`, id, "EX", 40 * 86400]]);
  return { ok: true, token, id, posibleVenta: venta };
}

export async function crearFeria(c: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
  const lugar = limpio(c.lugar, 80), direccion = limpio(c.direccion, 100), barrio = limpio(c.barrio, 40);
  const dias = limpio(c.dias, 60), horario = limpio(c.horario, 40);
  if (lugar.length < 3) return { ok: false, error: "Escribí el nombre o lugar de la feria." };
  if (direccion.length < 3) return { ok: false, error: "Escribí la dirección." };
  if (!(await barriosActuales()).includes(barrio)) return { ok: false, error: "Elegí el barrio." };
  if (dias.length < 3) return { ok: false, error: "Escribí los días." };
  if (horario.length < 3) return { ok: false, error: "Escribí el horario." };
  const crudo = limpio(c.whatsapp, 30);
  const whatsapp = crudo ? normalizarWhatsapp(crudo) : "";
  if (whatsapp === null) return { ok: false, error: "El WhatsApp no es válido. Ponelo con código de área, sin 0 ni 15 (ej. 11 5555-5555)." };
  const id = randomUUID().slice(0, 10);
  const f: RegistroFeria = { id, lugar, direccion, barrio, dias, horario, whatsapp, creado: new Date().toISOString(), situacion: "pendiente" };
  await redis([["HSET", "trueque:ferias", id, JSON.stringify(f)]]);
  return { ok: true };
}

// ---- Moderación (mi panel) ----
export async function paraModerar() {
  const [t, f] = [await todas(), await todasFerias()];
  const ordenar = (a: { creado: string }, b: { creado: string }) => b.creado.localeCompare(a.creado);
  const ver = ({ tokenHash: _t, ...r }: Registro) => r;
  return {
    pendientes: t.filter((r) => r.situacion === "pendiente").sort(ordenar).map(ver),
    aprobadas: t.filter((r) => r.situacion === "aprobada").sort(ordenar).map(ver),
    feriasPendientes: f.filter((r) => r.situacion === "pendiente").sort(ordenar),
    feriasAprobadas: f.filter((r) => r.situacion === "aprobada").sort(ordenar),
  };
}
export async function aprobar(id: string) {
  const [j] = await redis([["HGET", "trueque", id]]);
  if (!j) return false;
  const r = JSON.parse(j as string) as Registro;
  const ahora = new Date();
  await redis([["HSET", "trueque", id, JSON.stringify({ ...r, situacion: "aprobada", aprobada: ahora.toISOString(), vence: new Date(ahora.getTime() + config.trueque.diasVigencia * DIAS).toISOString() })]]);
  return true;
}
// Rechazar o bajar: se borra la publicación y su foto
export async function quitar(id: string) {
  const [j] = await redis([["HGET", "trueque", id]]);
  if (!j) return false;
  const r = JSON.parse(j as string) as Registro;
  await borrarFoto(r);
  await redis([["HDEL", "trueque", id], ["DEL", `trueque:tok:${r.tokenHash}`]]);
  return true;
}
export async function aprobarFeria(id: string) {
  const [j] = await redis([["HGET", "trueque:ferias", id]]);
  if (!j) return false;
  await redis([["HSET", "trueque:ferias", id, JSON.stringify({ ...(JSON.parse(j as string) as RegistroFeria), situacion: "aprobada" })]]);
  return true;
}
export async function quitarFeria(id: string) {
  const [n] = await redis([["HDEL", "trueque:ferias", id]]);
  return Number(n) > 0;
}

// ---- Enlace propio de quien publicó ("Ya lo cambié") ----
export async function porToken(token: string): Promise<Registro | null> {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const [id] = await redis([["GET", `trueque:tok:${sha(token)}`]]);
  if (!id) return null;
  const [j] = await redis([["HGET", "trueque", String(id)]]);
  return j ? (JSON.parse(j as string) as Registro) : null;
}
export const baja = quitar;

// ---- Mantenimiento (lo corre el proceso automático): vencidas se bajan solas y se borra su foto ----
export async function mantener() {
  const ahora = Date.now();
  for (const r of await todas()) {
    const vencida = r.situacion === "aprobada"
      ? !!r.vence && new Date(r.vence).getTime() <= ahora
      : ahora - new Date(r.creado).getTime() > config.trueque.diasVigencia * DIAS; // una pendiente sin revisar también vence
    if (vencida) await quitar(r.id);
  }
  // Aviso diario (solo para quien lo prendió): entre las 19 y las 20, juntando lo publicado hoy
  const ahoraStr = ahoraAR(), hm = ahoraStr.slice(11, 16);
  if (hm >= config.trueque.horaResumen.desde && hm < config.trueque.horaResumen.hasta) {
    const hoy = ahoraStr.slice(0, 10);
    const n = (await publicas()).publicaciones.filter((m) => ahoraAR(new Date(m.aprobada)).slice(0, 10) === hoy).length;
    if (n > 0) {
      await notificarSeguro({
        tipo: "trueque", clave: `trueque:resumen:${hoy}`, ttl: 2 * 86400,
        titulo: "Trueque", cuerpo: `Hoy hay ${n} ${n === 1 ? "trueque nuevo" : "trueques nuevos"} en Lomas`, url: "/?v=trueque",
      });
    }
  }
}
