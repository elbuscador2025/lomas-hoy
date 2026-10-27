// "Pasa en Lomas": avisos de vecinos sobre lo que pasa en la calle. Se publican al instante, duran 24 horas (con su foto) y no tienen comentarios ni notificaciones.
import { createHash, randomUUID } from "node:crypto";
import { put, del } from "@vercel/blob";
import { redis, hoyArgentina } from "@/lib/servidor";
import { estaBloqueado, huella, agregarBloqueo } from "@/lib/moderacion";
import { TIPOS_PASA, MAX_TEXTO_PASA, HORAS_PASA, motivoProhibidoPasa, type AvisoPasa } from "@/lib/pasa-comun";

export const MAX_POR_DIA_PASA = 3;
type Registro = {
  id: string; tipo: string; texto: string; barrio: string; donde: string; lat?: number; lng?: number; foto: { url: string } | null;
  creado: string; vence: string; disp: string; situacion: "aprobada"; solucionado?: boolean; oculta?: boolean; denuncias?: { motivo: string; disp: string; t: string }[];
};
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const limpio = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);

async function todos(): Promise<Registro[]> {
  const [x] = await redis([["HVALS", "pasa"]]);
  return (x as string[]).map((j) => JSON.parse(j) as Registro);
}
const borrarFoto = (r: Registro) => (r.foto ? del(r.foto.url).catch(() => {}) : Promise.resolve());

// Máximo 3 avisos por día por celular
export async function limitePorDia(dispositivo: string, ip: string) {
  const dia = hoyArgentina();
  const kd = `pasa:dia:${dia}:d:${sha(dispositivo).slice(0, 16)}`, ki = `pasa:dia:${dia}:ip:${sha(ip).slice(0, 16)}`;
  const [d, i] = await redis([["INCR", kd], ["INCR", ki]]);
  await redis([["EXPIRE", kd, 2 * 86400], ["EXPIRE", ki, 2 * 86400]]);
  return Number(d) <= MAX_POR_DIA_PASA && Number(i) <= MAX_POR_DIA_PASA * 3;
}

export async function publicar(form: FormData, dispositivo: string): Promise<{ ok: true; id: string; texto: string } | { ok: false; error: string }> {
  const tipo = limpio(form.get("tipo"), 20);
  if (!TIPOS_PASA.some((t) => t.id === tipo)) return { ok: false, error: "Elegí qué pasa." };
  const texto = limpio(form.get("texto"), MAX_TEXTO_PASA + 1);
  if (texto.length < 3) return { ok: false, error: "Contá qué pasa en pocas palabras." };
  if (texto.length > MAX_TEXTO_PASA) return { ok: false, error: `El aviso puede tener hasta ${MAX_TEXTO_PASA} caracteres.` };
  const prohibido = motivoProhibidoPasa(texto);
  if (prohibido) return { ok: false, error: prohibido };
  const disp = huella(dispositivo);
  if (await estaBloqueado(null, disp)) return { ok: false, error: "No podés publicar desde este celular." };

  // Dónde pasó lo escribe el vecino (calle y barrio): no se usa la ubicación del celular
  const donde = limpio(form.get("calle"), 80);
  if (donde.length < 3) return { ok: false, error: "Contanos dónde pasó: la calle y el barrio." };

  const id = randomUUID().slice(0, 10);
  let foto: Registro["foto"] = null;
  const f = form.get("foto");
  if (f instanceof File && f.size > 0) {
    if (f.size > 900_000) return { ok: false, error: "La foto es muy pesada. Probá con otra." };
    const bytes = Buffer.from(await f.arrayBuffer());
    if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) return { ok: false, error: "La foto tiene que ser una imagen JPG." };
    try {
      foto = { url: (await put(`pasa/${id}.jpg`, bytes, { access: "public", contentType: "image/jpeg", addRandomSuffix: true })).url };
    } catch (e) {
      console.error("foto pasa:", e);
      return { ok: false, error: "No se pudo subir la foto. Probá de nuevo en un rato." };
    }
  }
  const ahora = new Date();
  const r: Registro = {
    id, tipo, texto, barrio: "", donde, foto, creado: ahora.toISOString(),
    vence: new Date(ahora.getTime() + HORAS_PASA * 3600_000).toISOString(), disp, situacion: "aprobada",
  };
  await redis([["HSET", "pasa", id, JSON.stringify(r)]]);
  return { ok: true, id, texto };
}

// Lo que se ve en la app: lo que no venció ni fue ocultado por denuncias; los vigentes arriba (el más nuevo primero) y los ya solucionados abajo
export async function publicos(): Promise<AvisoPasa[]> {
  const ahora = Date.now();
  const lista = (await todos()).filter((r) => !r.oculta && new Date(r.vence).getTime() > ahora)
    .sort((a, b) => Number(!!a.solucionado) - Number(!!b.solucionado) || b.creado.localeCompare(a.creado));
  return lista.map((r) => ({
    id: r.id, tipo: r.tipo, texto: r.texto, barrio: r.barrio, donde: r.donde, lat: r.lat, lng: r.lng, foto: r.foto?.url,
    creado: r.creado, solucionado: !!r.solucionado,
  }));
}

// "Ya se solucionó": un toque por celular por aviso. Si lo toca quien lo publicó, o 2 celulares distintos, el aviso queda como solucionado.
export async function marcarSolucionado(id: string, dispositivo: string) {
  const [j] = await redis([["HGET", "pasa", id]]);
  if (!j) return null;
  const r = JSON.parse(j as string) as Registro;
  const quien = huella(dispositivo);
  const clave = `pasa:sol:${id}`;
  await redis([["SADD", clave, quien], ["EXPIRE", clave, 2 * 86400]]);
  const [n] = await redis([["SCARD", clave]]);
  const listo = !!r.solucionado || quien === r.disp || Number(n) >= 2;
  if (listo && !r.solucionado) await redis([["HSET", "pasa", id, JSON.stringify({ ...r, solucionado: true })]]);
  return listo;
}

// Mantenimiento (lo corre el proceso automático): a las 24 horas se borra el aviso y su foto
export async function mantener() {
  const ahora = Date.now();
  for (const r of await todos()) if (new Date(r.vence).getTime() <= ahora) await quitar(r.id);
}
export async function quitar(id: string) {
  const [j] = await redis([["HGET", "pasa", id]]);
  if (!j) return false;
  await borrarFoto(JSON.parse(j as string) as Registro);
  await redis([["HDEL", "pasa", id], ["DEL", `pasa:sol:${id}`]]);
  return true;
}

// ---- Mi panel ----
export async function paraPanel() {
  const ahora = Date.now();
  return (await todos()).filter((r) => new Date(r.vence).getTime() > ahora).sort((a, b) => b.creado.localeCompare(a.creado)).map(({ disp: _d, ...r }) => r);
}
// Bloquear al celular que lo publicó: se bajan todos sus avisos y no puede volver a publicar
export async function bloquearDe(id: string) {
  const [j] = await redis([["HGET", "pasa", id]]);
  if (!j) return false;
  const r = JSON.parse(j as string) as Registro;
  await agregarBloqueo("", r.disp, `Pasa en Lomas: ${r.texto}`);
  for (const x of await todos()) if (x.disp === r.disp) await quitar(x.id);
  return true;
}
