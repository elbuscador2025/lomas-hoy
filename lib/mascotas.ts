// Mascotas perdidas: guardado, moderación, fotos y limpieza. Todo se valida acá, en el servidor.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { put, del } from "@vercel/blob";
import { config } from "@/lomas.config.mjs";
import { redis, hoyArgentina } from "@/lib/servidor";
import { ahoraAR } from "@/lib/avisos";
import { barriosActuales } from "@/lib/municipio";
import { notificarSeguro } from "@/lib/push";
import { normalizarWhatsapp, type Estado, type Especie, type MascotaPublica } from "@/lib/mascotas-comun";

type Registro = {
  id: string; estado: Estado; especie: Especie; barrio: string; descripcion: string; whatsapp: string;
  foto: { url: string }; creado: string; situacion: "pendiente" | "aprobada";
  aprobada?: string; vence?: string; tokenHash: string; // el enlace propio de quien publicó se guarda solo como huella
};

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const limpio = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
const DIAS = 86400_000;

async function todas(): Promise<Registro[]> {
  const [x] = await redis([["HVALS", "mascotas"]]);
  return (x as string[]).map((j) => JSON.parse(j) as Registro);
}
const borrarFoto = (r: Registro) => del(r.foto.url).catch(() => {});

// Lo que se muestra en la app: aprobadas y que no vencieron
export async function publicas(): Promise<MascotaPublica[]> {
  const ahora = Date.now();
  return (await todas())
    .filter((r) => r.situacion === "aprobada" && r.vence && new Date(r.vence).getTime() > ahora)
    .sort((a, b) => b.aprobada!.localeCompare(a.aprobada!))
    .map((r) => ({ id: r.id, estado: r.estado, especie: r.especie, barrio: r.barrio, descripcion: r.descripcion, whatsapp: r.whatsapp, foto: r.foto.url, creado: r.creado, aprobada: r.aprobada!, vence: r.vence! }));
}

// ---- Publicar (pendiente de aprobación) ----
export async function limitePorDia(dispositivo: string, ip: string) {
  const dia = hoyArgentina();
  const [d, i] = await redis([["INCR", `mascotas:dia:${dia}:d:${sha(dispositivo).slice(0, 16)}`], ["INCR", `mascotas:dia:${dia}:ip:${sha(ip).slice(0, 16)}`]]);
  await redis([["EXPIRE", `mascotas:dia:${dia}:d:${sha(dispositivo).slice(0, 16)}`, 2 * 86400], ["EXPIRE", `mascotas:dia:${dia}:ip:${sha(ip).slice(0, 16)}`, 2 * 86400]]);
  // 3 por celular; la dirección de internet puede compartirse entre varios celulares, por eso tiene más margen
  return Number(d) <= config.mascotas.maxPorDiaPorCelular && Number(i) <= config.mascotas.maxPorDiaPorCelular * 3;
}

export async function crearPendiente(form: FormData): Promise<{ ok: true; token: string; id: string } | { ok: false; error: string }> {
  const estado = limpio(form.get("estado"), 12), especie = limpio(form.get("especie"), 8), barrio = limpio(form.get("barrio"), 40);
  const descripcion = limpio(form.get("descripcion"), config.mascotas.maxDescripcion + 1);
  if (estado !== "perdido" && estado !== "encontrado") return { ok: false, error: "Contanos si la perdiste o la encontraste." };
  if (!["perro", "gato", "otro"].includes(especie)) return { ok: false, error: "Elegí si es perro, gato u otro." };
  if (!(await barriosActuales()).includes(barrio)) return { ok: false, error: "Elegí el barrio." };
  if (descripcion.length < 5) return { ok: false, error: "Escribí una descripción corta." };
  if (descripcion.length > config.mascotas.maxDescripcion) return { ok: false, error: `La descripción puede tener hasta ${config.mascotas.maxDescripcion} caracteres.` };
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
    url = (await put(`mascotas/${id}.jpg`, bytes, { access: "public", contentType: "image/jpeg", addRandomSuffix: true })).url;
  } catch (e) {
    console.error("foto:", e);
    return { ok: false, error: "No se pudo subir la foto. Probá de nuevo en un rato." };
  }
  const r: Registro = { id, estado, especie: especie as Especie, barrio, descripcion, whatsapp, foto: { url }, creado: new Date().toISOString(), situacion: "pendiente", tokenHash: sha(token) };
  await redis([["HSET", "mascotas", id, JSON.stringify(r)], ["SET", `mascotas:tok:${sha(token)}`, id, "EX", 40 * 86400]]);
  return { ok: true, token, id };
}

// ---- Moderación (mi panel) ----
export async function paraModerar() {
  const t = await todas();
  const ordenar = (a: Registro, b: Registro) => b.creado.localeCompare(a.creado);
  const ver = ({ tokenHash: _t, ...r }: Registro) => r;
  return { pendientes: t.filter((r) => r.situacion === "pendiente").sort(ordenar).map(ver), aprobadas: t.filter((r) => r.situacion === "aprobada").sort(ordenar).map(ver) };
}
export async function aprobar(id: string) {
  const [j] = await redis([["HGET", "mascotas", id]]);
  if (!j) return false;
  const r = JSON.parse(j as string) as Registro;
  const ahora = new Date();
  await redis([["HSET", "mascotas", id, JSON.stringify({ ...r, situacion: "aprobada", aprobada: ahora.toISOString(), vence: new Date(ahora.getTime() + config.mascotas.diasVigencia * DIAS).toISOString() })]]);
  return true;
}
// Rechazar o bajar: se borra la publicación y su foto
export async function quitar(id: string) {
  const [j] = await redis([["HGET", "mascotas", id]]);
  if (!j) return false;
  const r = JSON.parse(j as string) as Registro;
  await borrarFoto(r);
  await redis([["HDEL", "mascotas", id], ["DEL", `mascotas:tok:${r.tokenHash}`]]);
  return true;
}

// ---- Enlace propio de quien publicó ("Ya apareció") ----
export async function porToken(token: string): Promise<Registro | null> {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const [id] = await redis([["GET", `mascotas:tok:${sha(token)}`]]);
  if (!id) return null;
  const [j] = await redis([["HGET", "mascotas", String(id)]]);
  return j ? (JSON.parse(j as string) as Registro) : null;
}
export const baja = quitar;

// ---- Mantenimiento (lo corre el proceso automático): vencidas se bajan solas y se borra su foto ----
export async function mantener() {
  const ahora = Date.now();
  for (const r of await todas()) {
    const vencida = r.situacion === "aprobada"
      ? !!r.vence && new Date(r.vence).getTime() <= ahora
      : ahora - new Date(r.creado).getTime() > config.mascotas.diasVigencia * DIAS; // una pendiente sin revisar también vence
    if (vencida) await quitar(r.id);
  }
  // Aviso diario (solo para quien lo prendió): entre las 19 y las 20, juntando lo publicado hoy
  const ahoraStr = ahoraAR(), hm = ahoraStr.slice(11, 16);
  if (hm >= config.mascotas.horaResumen.desde && hm < config.mascotas.horaResumen.hasta) {
    const hoy = ahoraStr.slice(0, 10);
    const n = (await publicas()).filter((m) => ahoraAR(new Date(m.aprobada)).slice(0, 10) === hoy).length;
    if (n > 0) {
      await notificarSeguro({
        tipo: "mascotas", clave: `mascotas:resumen:${hoy}`, ttl: 2 * 86400,
        titulo: "Mascotas perdidas", cuerpo: `Hoy se publicaron ${n} ${n === 1 ? "mascota" : "mascotas"} en Lomas`, url: "/?v=mascotas",
      });
    }
  }
}
