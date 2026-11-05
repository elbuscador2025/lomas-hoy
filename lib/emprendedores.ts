// Emprendedores: publicaciones de vecinos con su propia conversación. Se publican al instante, duran 30 días (con "Renovar") y se moderan con denuncias y desde mi panel.
// El dueño se identifica con un código secreto que guarda su celular (y su enlace propio); en el servidor solo queda su huella.
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { del } from "@vercel/blob";
import { put, operacionesDelMes, LIMITE_OPERACIONES } from "@/lib/blobcuenta";
import { redis, hoyArgentina } from "@/lib/servidor";
import { estaBloqueado, huella, agregarBloqueo, DENUNCIAS_PARA_OCULTAR } from "@/lib/moderacion";
import { MOTIVOS_EMP } from "@/lib/moderacion-comun";
import { motivoProhibidoPasa } from "@/lib/pasa-comun";
import { datoProhibido } from "@/lib/estafas";
import { normalizarWhatsapp } from "@/lib/mascotas-comun";
import { enviarAUno, notificarAdmin } from "@/lib/push";
import {
  MAX_FOTOS, MAX_TITULO, MAX_DESCRIPCION, MAX_COMENTARIO, DIAS_VIGENCIA, MAX_BYTES_SERVIDOR, hayProhibida, MENSAJE_PROHIBIDO,
  type EmprendimientoPublico, type EmprendimientoDetalle, type ComentarioEmp,
} from "@/lib/emprendedores-comun";

export const MAX_POR_DIA_EMP = 3, MAX_COMENTARIOS_POR_DIA = 10;
const DIA = 86400_000;
type Denuncia = { motivo: string; disp: string; t: string };
type Registro = {
  id: string; titulo: string; descripcion: string; fotos: { url: string }[]; telefono: string; whatsapp: string;
  creado: string; vence: string; disp: string; tokenHash: string; aviso?: string; // aviso = el celular del dueño, para avisarle de las preguntas
  avisoVence?: boolean; oculta?: boolean; denuncias?: Denuncia[];
};
type Comentario = { id: string; texto: string; creado: string; duenio: boolean; disp: string; oculta?: boolean; denuncias?: Denuncia[] };

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const limpio = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
const claveC = (id: string) => `emp:c:${id}`;

async function todos(): Promise<Registro[]> {
  const [x] = await redis([["HVALS", "emp"]]);
  return (x as string[]).map((j) => JSON.parse(j) as Registro);
}
async function uno(id: string): Promise<Registro | null> {
  const [j] = await redis([["HGET", "emp", id]]);
  return j ? (JSON.parse(j as string) as Registro) : null;
}
async function comentariosDe(id: string): Promise<Comentario[]> {
  const [x] = await redis([["HVALS", claveC(id)]]);
  return (x as string[]).map((j) => JSON.parse(j) as Comentario).sort((a, b) => a.creado.localeCompare(b.creado));
}
const esDuenio = (r: Registro, token: unknown) => {
  if (typeof token !== "string" || !/^[a-f0-9]{48}$/.test(token)) return false;
  const a = Buffer.from(sha(token)), b = Buffer.from(r.tokenHash);
  return a.length === b.length && timingSafeEqual(a, b);
};
const vigente = (r: Registro) => !r.oculta && new Date(r.vence).getTime() > Date.now();
const publico = (r: Registro, comentarios: number): EmprendimientoPublico => ({
  id: r.id, titulo: r.titulo, descripcion: r.descripcion, fotos: r.fotos.map((f) => f.url), telefono: r.telefono, whatsapp: r.whatsapp, creado: r.creado, vence: r.vence, comentarios,
});
const endpointValido = (v: unknown) => (typeof v === "string" && /^https:\/\/[^\s]{10,500}$/.test(v) ? v : undefined);

// ---- Lo que ve cualquiera ----
export async function publicos(): Promise<EmprendimientoPublico[]> {
  const lista = (await todos()).filter(vigente).sort((a, b) => b.creado.localeCompare(a.creado));
  if (!lista.length) return [];
  const cuentas = await redis(lista.map((r) => ["HVALS", claveC(r.id)]));
  return lista.map((r, i) => publico(r, (cuentas[i] as string[]).map((j) => JSON.parse(j) as Comentario).filter((c) => !c.oculta).length));
}
export async function detalle(id: string): Promise<EmprendimientoDetalle | null> {
  const r = await uno(id);
  if (!r || !vigente(r)) return null;
  const conv: ComentarioEmp[] = (await comentariosDe(id)).filter((c) => !c.oculta).map((c) => ({ id: c.id, texto: c.texto, creado: c.creado, duenio: c.duenio }));
  return { ...publico(r, conv.length), conversacion: conv };
}

// ---- Publicar ----
export async function limitePorDia(dispositivo: string, ip: string) {
  const dia = hoyArgentina();
  const kd = `emp:dia:${dia}:d:${sha(dispositivo).slice(0, 16)}`, ki = `emp:dia:${dia}:ip:${sha(ip).slice(0, 16)}`;
  const [d, i] = await redis([["INCR", kd], ["INCR", ki]]);
  await redis([["EXPIRE", kd, 2 * 86400], ["EXPIRE", ki, 2 * 86400]]);
  return Number(d) <= MAX_POR_DIA_EMP && Number(i) <= MAX_POR_DIA_EMP * 3;
}

type Texto = { ok: true; titulo: string; descripcion: string; telefono: string; whatsapp: string } | { ok: false; error: string };
function leerTextos(v: { titulo: unknown; descripcion: unknown; telefono: unknown }): Texto {
  const titulo = limpio(v.titulo, MAX_TITULO + 1), descripcion = limpio(v.descripcion, MAX_DESCRIPCION + 1);
  if (titulo.length < 3) return { ok: false, error: "Escribí el nombre de tu emprendimiento." };
  if (titulo.length > MAX_TITULO) return { ok: false, error: `El título puede tener hasta ${MAX_TITULO} caracteres.` };
  if (descripcion.length < 10) return { ok: false, error: "Contá un poco qué ofrecés." };
  if (descripcion.length > MAX_DESCRIPCION) return { ok: false, error: `La descripción puede tener hasta ${MAX_DESCRIPCION} caracteres.` };
  if (hayProhibida(titulo, descripcion)) return { ok: false, error: MENSAJE_PROHIBIDO };
  const insulto = motivoProhibidoPasa(`${titulo} ${descripcion}`);
  if (insulto) return { ok: false, error: insulto };
  const prohibido = datoProhibido(titulo, descripcion);
  if (prohibido) return { ok: false, error: prohibido };
  const crudo = limpio(v.telefono, 30);
  let telefono = "", whatsapp = "";
  if (crudo) {
    const n = normalizarWhatsapp(crudo);
    const digitos = crudo.replace(/\D/g, "");
    if (n) { whatsapp = n; telefono = crudo; }
    else if (digitos.length >= 8 && digitos.length <= 13) telefono = crudo;
    else return { ok: false, error: "El teléfono no es válido. Ponelo con código de área (ej. 11 5555-5555) o dejalo vacío." };
  }
  return { ok: true, titulo, descripcion, telefono, whatsapp };
}

export async function crear(form: FormData, dispositivo: string): Promise<{ ok: true; id: string; token: string; titulo: string } | { ok: false; error: string }> {
  const t = leerTextos({ titulo: form.get("titulo"), descripcion: form.get("descripcion"), telefono: form.get("telefono") });
  if (!t.ok) return t;
  const disp = huella(dispositivo);
  if (await estaBloqueado(t.whatsapp || null, disp)) return { ok: false, error: "No podés publicar desde este celular o con este número." };

  const archivos = form.getAll("foto").filter((f): f is File => f instanceof File && f.size > 0);
  if (archivos.length > MAX_FOTOS) return { ok: false, error: `Podés subir hasta ${MAX_FOTOS} fotos.` };
  const partes: Buffer[] = [];
  for (const f of archivos) {
    if (f.size > MAX_BYTES_SERVIDOR) return { ok: false, error: "Una foto es muy pesada. Probá con otra." };
    const bytes = Buffer.from(await f.arrayBuffer());
    if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) return { ok: false, error: "Las fotos tienen que ser imágenes JPG." };
    partes.push(bytes);
  }
  // Cuidado con el límite gratis de Vercel Blob: si ya casi se llega, no se aceptan más fotos hasta el mes que viene
  if (partes.length && (await operacionesDelMes()) + partes.length > LIMITE_OPERACIONES - 100)
    return { ok: false, error: "Por ahora no se pueden subir fotos nuevas. Probá sin fotos o más adelante." };

  const id = randomUUID().slice(0, 10), token = randomBytes(24).toString("hex");
  const fotos: { url: string }[] = [];
  try {
    for (const [i, b] of partes.entries()) fotos.push({ url: (await put(`emp/${id}-${i}.jpg`, b, { access: "public", contentType: "image/jpeg", addRandomSuffix: true })).url });
  } catch (e) {
    console.error("fotos emp:", e);
    await Promise.all(fotos.map((f) => del(f.url).catch(() => {})));
    return { ok: false, error: "No se pudieron subir las fotos. Probá de nuevo en un rato." };
  }
  const ahora = new Date();
  const r: Registro = {
    id, titulo: t.titulo, descripcion: t.descripcion, fotos, telefono: t.telefono, whatsapp: t.whatsapp, creado: ahora.toISOString(),
    vence: new Date(ahora.getTime() + DIAS_VIGENCIA * DIA).toISOString(), disp, tokenHash: sha(token), aviso: endpointValido(form.get("aviso")),
  };
  await redis([["HSET", "emp", id, JSON.stringify(r)], ["SET", `emp:tok:${sha(token)}`, id, "EX", (DIAS_VIGENCIA + 10) * 86400]]);
  return { ok: true, id, token, titulo: t.titulo };
}

// ---- Dueño: editar, renovar, borrar ----
export async function editar(id: string, token: unknown, v: { titulo: unknown; descripcion: unknown; telefono: unknown; aviso?: unknown }): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await uno(id);
  if (!r || !esDuenio(r, token)) return { ok: false, error: "No se pudo." };
  const t = leerTextos(v);
  if (!t.ok) return t;
  const aviso = endpointValido(v.aviso) ?? r.aviso;
  await redis([["HSET", "emp", id, JSON.stringify({ ...r, titulo: t.titulo, descripcion: t.descripcion, telefono: t.telefono, whatsapp: t.whatsapp, aviso })]]);
  return { ok: true };
}
export async function renovar(id: string, token: unknown) {
  const r = await uno(id);
  if (!r || !esDuenio(r, token)) return null;
  const vence = new Date(Date.now() + DIAS_VIGENCIA * DIA).toISOString();
  await redis([["HSET", "emp", id, JSON.stringify({ ...r, vence, avisoVence: false })], ["EXPIRE", `emp:tok:${r.tokenHash}`, (DIAS_VIGENCIA + 10) * 86400]]);
  return vence;
}
export async function quitar(id: string) {
  const r = await uno(id);
  if (!r) return false;
  await Promise.all(r.fotos.map((f) => del(f.url).catch(() => {})));
  await redis([["HDEL", "emp", id], ["DEL", claveC(id)], ["DEL", `emp:tok:${r.tokenHash}`], ["DEL", `emp:push:${id}`]]);
  return true;
}
export async function borrarDelDuenio(id: string, token: unknown) {
  const r = await uno(id);
  return r && esDuenio(r, token) ? quitar(id) : false;
}
export async function porToken(token: string) {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const [id] = await redis([["GET", `emp:tok:${sha(token)}`]]);
  const r = id ? await uno(String(id)) : null;
  return r && esDuenio(r, token) ? { id: r.id, titulo: r.titulo } : null;
}

// ---- Conversación ----
export async function comentar(id: string, textoCrudo: unknown, dispositivo: string, ip: string, token: unknown): Promise<{ ok: true; avisar?: () => Promise<void> } | { ok: false; error: string }> {
  const r = await uno(id);
  if (!r || !vigente(r)) return { ok: false, error: "Esta publicación ya no está." };
  const texto = limpio(textoCrudo, MAX_COMENTARIO + 1);
  if (texto.length < 2) return { ok: false, error: "Escribí tu mensaje." };
  if (texto.length > MAX_COMENTARIO) return { ok: false, error: `El mensaje puede tener hasta ${MAX_COMENTARIO} caracteres.` };
  const insulto = motivoProhibidoPasa(texto);
  if (insulto) return { ok: false, error: insulto };
  const disp = huella(dispositivo);
  if (await estaBloqueado(null, disp)) return { ok: false, error: "No podés escribir desde este celular." };
  const dia = hoyArgentina(), kd = `emp:cdia:${dia}:d:${sha(dispositivo).slice(0, 16)}`, ki = `emp:cdia:${dia}:ip:${sha(ip).slice(0, 16)}`;
  const [d, i] = await redis([["INCR", kd], ["INCR", ki]]);
  await redis([["EXPIRE", kd, 2 * 86400], ["EXPIRE", ki, 2 * 86400]]);
  if (Number(d) > MAX_COMENTARIOS_POR_DIA || Number(i) > MAX_COMENTARIOS_POR_DIA * 3) return { ok: false, error: "Ya escribiste muchos mensajes hoy. Probá mañana." };
  const duenio = esDuenio(r, token); // lo decide el servidor con el código secreto, no el celular
  const cid = randomUUID().slice(0, 10);
  const c: Comentario = { id: cid, texto, creado: new Date().toISOString(), duenio, disp };
  await redis([["HSET", claveC(id), cid, JSON.stringify(c)], ["EXPIRE", claveC(id), (DIAS_VIGENCIA + 5) * 86400]]);
  // Al emprendedor le llega un aviso cuando alguien pregunta (como mucho uno cada 30 minutos por publicación)
  const avisar = !duenio && r.aviso ? async () => {
    const [primera] = await redis([["SET", `emp:push:${id}`, "1", "NX", "EX", 1800]]);
    if (primera) await enviarAUno(r.aviso!, { titulo: "Te preguntaron en tu emprendimiento", cuerpo: `${r.titulo}: ${texto.slice(0, 100)}`, url: `/?v=emprendedores-ver:${id}`, tag: `emp-${id}`, tipo: "emprendedores" }, "emprendedores").catch(() => {});
  } : undefined;
  return { ok: true, avisar };
}

// ---- Denuncias: cada celular cuenta una vez; con 3 se oculta hasta que yo lo revise. Se guarda antes de responder (así dos denuncias casi juntas no se pisan); el aviso para mí sale después. ----
export async function denunciar(id: string, cid: string | undefined, motivo: string, dispositivo: string) {
  if (!MOTIVOS_EMP.includes(motivo)) return false;
  const disp = huella(dispositivo);
  const marcar = <T extends { denuncias?: Denuncia[]; oculta?: boolean }>(x: T) => {
    const lista = (x.denuncias ?? []).filter((d) => d.disp !== disp);
    lista.push({ motivo, disp, t: new Date().toISOString() });
    return { ...x, denuncias: lista, oculta: lista.length >= DENUNCIAS_PARA_OCULTAR || !!x.oculta };
  };
  if (cid) {
    const [j] = await redis([["HGET", claveC(id), cid]]);
    if (!j) return false;
    const c = marcar(JSON.parse(j as string) as Comentario);
    await redis([["HSET", claveC(id), cid, JSON.stringify(c)]]);
    return { avisar: () => notificarAdmin(c.oculta ? "Comentario oculto por denuncias" : "Denuncia de un comentario", `${motivo}: ${c.texto.slice(0, 100)}`, "/panel#emprendedores") };
  }
  const r = await uno(id);
  if (!r) return false;
  const x = marcar(r);
  await redis([["HSET", "emp", id, JSON.stringify(x)]]);
  return { avisar: () => notificarAdmin(x.oculta ? "Emprendimiento oculto por denuncias" : "Denuncia de un emprendimiento", `${motivo}: ${r.titulo.slice(0, 100)}`, "/panel#emprendedores") };
}

// ---- Mi panel ----
export async function paraPanel() {
  const lista = (await todos()).sort((a, b) => b.creado.localeCompare(a.creado));
  const convs = lista.length ? await redis(lista.map((r) => ["HVALS", claveC(r.id)])) : [];
  return lista.map(({ disp: _d, tokenHash: _t, aviso, ...r }, i) => ({
    ...r, conAviso: !!aviso, fotos: r.fotos.map((f) => f.url),
    conversacion: (convs[i] as string[]).map((j) => { const { disp: _x, ...c } = JSON.parse(j) as Comentario; return c; }).sort((a, b) => a.creado.localeCompare(b.creado)),
  }));
}
export async function borrarComentario(id: string, cid: string) {
  const [n] = await redis([["HDEL", claveC(id), cid]]);
  return Number(n) > 0;
}
export async function dejarPublicado(id: string, cid?: string) {
  if (cid) {
    const [j] = await redis([["HGET", claveC(id), cid]]);
    if (!j) return false;
    const { denuncias: _d, oculta: _o, ...c } = JSON.parse(j as string) as Comentario;
    await redis([["HSET", claveC(id), cid, JSON.stringify(c)]]);
    return true;
  }
  const r = await uno(id);
  if (!r) return false;
  const { denuncias: _d, oculta: _o, ...x } = r;
  await redis([["HSET", "emp", id, JSON.stringify(x)]]);
  return true;
}
// Bloquear a quien publicó (o a quien comentó): se bajan todas sus publicaciones y no puede volver a publicar ni comentar desde ese celular
export async function bloquear(id: string, cid?: string) {
  const r = await uno(id);
  if (!r) return false;
  let disp = r.disp, whatsapp = r.whatsapp, nota = `Emprendedores: ${r.titulo}`;
  if (cid) {
    const [j] = await redis([["HGET", claveC(id), cid]]);
    if (!j) return false;
    const c = JSON.parse(j as string) as Comentario;
    disp = c.disp; whatsapp = ""; nota = `Emprendedores (comentario): ${c.texto}`;
    await redis([["HDEL", claveC(id), cid]]);
  }
  await agregarBloqueo(whatsapp, disp, nota);
  for (const x of await todos()) if (x.disp === disp) await quitar(x.id);
  return true;
}

// ---- Mantenimiento (lo corre el proceso automático): se baja lo vencido y se avisa 3 días antes ----
export async function mantener() {
  const ahora = Date.now();
  for (const r of await todos()) {
    const resta = new Date(r.vence).getTime() - ahora;
    if (resta <= 0) await quitar(r.id);
    else if (resta < 3 * DIA && !r.avisoVence && r.aviso) {
      await redis([["HSET", "emp", r.id, JSON.stringify({ ...r, avisoVence: true })]]);
      await enviarAUno(r.aviso, { titulo: "Tu emprendimiento vence pronto", cuerpo: `${r.titulo}: entrá y tocá "Renovar" para que siga publicado`, url: `/?v=emprendedores-ver:${r.id}`, tag: `emp-vence-${r.id}`, tipo: "emprendedores" }, "emprendedores").catch(() => {});
    }
  }
}
