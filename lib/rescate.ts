// Perro al rescate: animales heridos, abandonados o en peligro en la calle, publicados por vecinos, con su propia conversación.
// Se publican al instante, duran 15 días y se moderan con denuncias y desde mi panel. El que publica se identifica con un código secreto que guarda su celular
// (el mismo sistema que Emprendedores); en el servidor solo queda su huella. No se guarda ningún nombre, teléfono ni domicilio.
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { del } from "@vercel/blob";
import { put, operacionesDelMes, LIMITE_OPERACIONES } from "@/lib/blobcuenta";
import { redis, hoyArgentina } from "@/lib/servidor";
import { conCandado } from "@/lib/candado";
import { estaBloqueado, huella, agregarBloqueo, DENUNCIAS_PARA_OCULTAR } from "@/lib/moderacion";
import { motivoProhibidoPasa } from "@/lib/pasa-comun";
import { datoProhibido } from "@/lib/estafas";
import { extractoHilo, MAX_RESPUESTAS_POR_DIA } from "@/lib/hilo-comun";
import {
  MAX_FOTOS_RESCATE, MAX_DESCRIPCION_RESCATE, MAX_ZONA_RESCATE, MAX_COMENTARIO_RESCATE, DIAS_VIGENCIA_RESCATE, MAX_BYTES_SERVIDOR_RESCATE,
  MAX_POR_DIA_RESCATE, MAX_COMENTARIOS_POR_DIA_RESCATE, MOTIVOS_RESCATE, motivoRescateInvalido,
  type RescatePublico, type RescateDetalle, type Mensaje,
} from "@/lib/rescate-comun";

const DIA = 86400_000;
type Denuncia = { motivo: string; disp: string; t: string };
type Registro = {
  id: string; descripcion: string; zona: string; fotos: { url: string }[]; creado: string; vence: string; disp: string; tokenHash: string;
  rescatado?: boolean; rescatadoEn?: string; oculta?: boolean; denuncias?: Denuncia[];
};
type Comentario = { id: string; texto: string; creado: string; duenio: boolean; disp: string; padre?: string; aQuien?: string; oculta?: boolean; denuncias?: Denuncia[] };

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const limpio = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/[ \t]+/g, " ").trim().slice(0, max);
const claveC = (id: string) => `resc:c:${id}`;

async function todos(): Promise<Registro[]> {
  const [x] = await redis([["HVALS", "resc"]]);
  return (x as string[]).map((j) => JSON.parse(j) as Registro);
}
async function uno(id: string): Promise<Registro | null> {
  const [j] = await redis([["HGET", "resc", id]]);
  return j ? (JSON.parse(j as string) as Registro) : null;
}
async function comentariosDe(id: string): Promise<Comentario[]> {
  const [x] = await redis([["HVALS", claveC(id)]]);
  return (x as string[]).map((j) => JSON.parse(j) as Comentario).sort((a, b) => a.creado.localeCompare(b.creado));
}
// Lo que se ve: los comentarios y respuestas que no están ocultos; si un comentario está oculto, sus respuestas también
function visiblesDe(cs: Comentario[]): Comentario[] {
  const raices = new Set(cs.filter((c) => !c.padre && !c.oculta).map((c) => c.id));
  return cs.filter((c) => !c.oculta && (c.padre ? raices.has(c.padre) : true));
}
const esDuenio = (r: Registro, token: unknown) => {
  if (typeof token !== "string" || !/^[a-f0-9]{48}$/.test(token)) return false;
  const a = Buffer.from(sha(token)), b = Buffer.from(r.tokenHash);
  return a.length === b.length && timingSafeEqual(a, b);
};
const vigente = (r: Registro) => !r.oculta && new Date(r.vence).getTime() > Date.now();
const publico = (r: Registro, comentarios: number): RescatePublico => ({
  id: r.id, descripcion: r.descripcion, zona: r.zona, fotos: r.fotos.map((f) => f.url), creado: r.creado, vence: r.vence, rescatado: !!r.rescatado, comentarios,
});

// ---- Lo que ve cualquiera ----
export async function publicos(): Promise<RescatePublico[]> {
  const lista = (await todos()).filter(vigente);
  if (!lista.length) return [];
  const cuentas = await redis(lista.map((r) => ["HVALS", claveC(r.id)]));
  return lista
    .map((r, i) => publico(r, visiblesDe((cuentas[i] as string[]).map((j) => JSON.parse(j) as Comentario)).length))
    .sort((a, b) => Number(a.rescatado) - Number(b.rescatado) || b.creado.localeCompare(a.creado)); // los que siguen necesitando ayuda, primero
}
export async function detalle(id: string): Promise<RescateDetalle | null> {
  const r = await uno(id);
  if (!r || !vigente(r)) return null;
  const vis = visiblesDe(await comentariosDe(id));
  const publicoC = (c: Comentario): Mensaje => {
    if (!c.aQuien) return { id: c.id, texto: c.texto, creado: c.creado, duenio: c.duenio };
    const destino = vis.find((t) => t.id === c.aQuien);
    return { id: c.id, texto: c.texto, creado: c.creado, duenio: c.duenio, aQuien: { id: c.aQuien, extracto: destino ? extractoHilo(destino.texto) : "" } };
  };
  const conv: Mensaje[] = vis.filter((c) => !c.padre).map((c) => ({ ...publicoC(c), respuestas: vis.filter((x) => x.padre === c.id).map(publicoC) }));
  return { ...publico(r, vis.length), conversacion: conv };
}

// ---- Publicar ----
export async function limitePorDia(dispositivo: string, ip: string) {
  const dia = hoyArgentina();
  const kd = `resc:dia:${dia}:d:${sha(dispositivo).slice(0, 16)}`, ki = `resc:dia:${dia}:ip:${sha(ip).slice(0, 16)}`;
  const [d, i] = await redis([["INCR", kd], ["INCR", ki]]);
  await redis([["EXPIRE", kd, 2 * 86400], ["EXPIRE", ki, 2 * 86400]]);
  return Number(d) <= MAX_POR_DIA_RESCATE && Number(i) <= MAX_POR_DIA_RESCATE * 3;
}

export async function crear(form: FormData, dispositivo: string): Promise<{ ok: true; id: string; token: string } | { ok: false; error: string }> {
  const descripcion = limpio(form.get("descripcion"), MAX_DESCRIPCION_RESCATE + 1), zona = limpio(form.get("zona"), MAX_ZONA_RESCATE + 1);
  if (zona.length < 3) return { ok: false, error: "Contanos en qué zona o esquina está el animal." };
  if (zona.length > MAX_ZONA_RESCATE) return { ok: false, error: `La zona puede tener hasta ${MAX_ZONA_RESCATE} caracteres.` };
  if (descripcion.length < 10) return { ok: false, error: "Contá en pocas palabras qué le pasa al animal." };
  if (descripcion.length > MAX_DESCRIPCION_RESCATE) return { ok: false, error: `La descripción puede tener hasta ${MAX_DESCRIPCION_RESCATE} caracteres.` };
  const motivo = motivoRescateInvalido(descripcion) ?? motivoRescateInvalido(zona) ?? motivoProhibidoPasa(`${descripcion} ${zona}`) ?? datoProhibido(descripcion, zona);
  if (motivo) return { ok: false, error: motivo };
  const disp = huella(dispositivo);
  if (await estaBloqueado(null, disp)) return { ok: false, error: "No podés publicar desde este celular." };

  const archivos = form.getAll("foto").filter((f): f is File => f instanceof File && f.size > 0);
  if (archivos.length > MAX_FOTOS_RESCATE) return { ok: false, error: `Podés subir hasta ${MAX_FOTOS_RESCATE} fotos.` };
  const partes: Buffer[] = [];
  for (const f of archivos) {
    if (f.size > MAX_BYTES_SERVIDOR_RESCATE) return { ok: false, error: "Una foto es muy pesada. Probá con otra." };
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
    for (const [i, b] of partes.entries()) fotos.push({ url: (await put(`resc/${id}-${i}.jpg`, b, { access: "public", contentType: "image/jpeg", addRandomSuffix: true })).url });
  } catch (e) {
    console.error("fotos rescate:", e);
    await Promise.all(fotos.map((f) => del(f.url).catch(() => {})));
    return { ok: false, error: "No se pudieron subir las fotos. Probá de nuevo en un rato." };
  }
  const ahora = new Date();
  const r: Registro = { id, descripcion, zona, fotos, creado: ahora.toISOString(), vence: new Date(ahora.getTime() + DIAS_VIGENCIA_RESCATE * DIA).toISOString(), disp, tokenHash: sha(token) };
  await redis([["HSET", "resc", id, JSON.stringify(r)], ["SET", `resc:tok:${sha(token)}`, id, "EX", (DIAS_VIGENCIA_RESCATE + 10) * 86400]]);
  return { ok: true, id, token };
}

// ---- El que publicó: marcar "ya fue rescatado" y borrar ----
export async function marcarRescatado(id: string, token: unknown, valor: boolean) {
  const r = await uno(id);
  if (!r || !esDuenio(r, token)) return false;
  await redis([["HSET", "resc", id, JSON.stringify({ ...r, rescatado: valor, rescatadoEn: valor ? new Date().toISOString() : undefined })]]);
  return true;
}
export async function quitar(id: string) {
  const r = await uno(id);
  if (!r) return false;
  await Promise.all(r.fotos.map((f) => del(f.url).catch(() => {})));
  await redis([["HDEL", "resc", id], ["DEL", claveC(id)], ["DEL", `resc:tok:${r.tokenHash}`]]);
  return true;
}
export async function borrarDelDuenio(id: string, token: unknown) {
  const r = await uno(id);
  return r && esDuenio(r, token) ? quitar(id) : false;
}

// ---- Conversación (el mismo sistema que La Voz de Lomas y Emprendedores: se le puede responder a cualquier mensaje) ----
export async function comentar(id: string, textoCrudo: unknown, dispositivo: string, ip: string, token: unknown, padre?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await uno(id);
  if (!r || !vigente(r)) return { ok: false, error: "Esta publicación ya no está." };
  let raiz: string | undefined;
  if (padre) {
    const cs = await comentariosDe(id);
    const origen = cs.find((c) => c.id === padre);
    if (!origen || !visiblesDe(cs).some((c) => c.id === origen.id)) return { ok: false, error: "Ese mensaje ya no está." };
    raiz = origen.padre ?? origen.id;
  }
  const texto = limpio(textoCrudo, MAX_COMENTARIO_RESCATE + 1);
  if (texto.length < 2) return { ok: false, error: "Escribí tu mensaje." };
  if (texto.length > MAX_COMENTARIO_RESCATE) return { ok: false, error: `El mensaje puede tener hasta ${MAX_COMENTARIO_RESCATE} caracteres.` };
  const motivo = motivoRescateInvalido(texto) ?? motivoProhibidoPasa(texto) ?? datoProhibido(texto);
  if (motivo) return { ok: false, error: motivo };
  const disp = huella(dispositivo);
  if (await estaBloqueado(null, disp)) return { ok: false, error: "No podés escribir desde este celular." };
  // Los comentarios (10 por día) y las respuestas (20 por día) cuentan aparte
  const dia = hoyArgentina(), tipo = padre ? "rdia" : "cdia", tope = padre ? MAX_RESPUESTAS_POR_DIA : MAX_COMENTARIOS_POR_DIA_RESCATE;
  const kd = `resc:${tipo}:${dia}:d:${sha(dispositivo).slice(0, 16)}`, ki = `resc:${tipo}:${dia}:ip:${sha(ip).slice(0, 16)}`;
  const [d, i] = await redis([["INCR", kd], ["INCR", ki]]);
  await redis([["EXPIRE", kd, 2 * 86400], ["EXPIRE", ki, 2 * 86400]]);
  if (Number(d) > tope || Number(i) > tope * 3) return { ok: false, error: padre ? `Ya dejaste ${tope} respuestas hoy. Probá mañana.` : "Ya escribiste muchos mensajes hoy. Probá mañana." };
  const duenio = esDuenio(r, token); // lo decide el servidor con el código secreto, no el celular
  const cid = randomUUID().slice(0, 10);
  const c: Comentario = { id: cid, texto, creado: new Date().toISOString(), duenio, disp, ...(padre ? { padre: raiz, aQuien: padre } : {}) };
  await redis([["HSET", claveC(id), cid, JSON.stringify(c)], ["EXPIRE", claveC(id), (DIAS_VIGENCIA_RESCATE + 5) * 86400]]);
  return { ok: true };
}

// ---- Denuncias: cada celular cuenta una vez; con 3 se oculta hasta que yo lo revise ----
export async function denunciar(id: string, cid: string | undefined, motivo: string, dispositivo: string) {
  const { notificarAdmin } = await import("@/lib/push");
  if (!MOTIVOS_RESCATE.includes(motivo)) return false;
  const disp = huella(dispositivo);
  const marcar = <T extends { denuncias?: Denuncia[]; oculta?: boolean }>(x: T) => {
    const lista = (x.denuncias ?? []).filter((d) => d.disp !== disp);
    lista.push({ motivo, disp, t: new Date().toISOString() });
    return { ...x, denuncias: lista, oculta: lista.length >= DENUNCIAS_PARA_OCULTAR || !!x.oculta };
  };
  if (cid) return conCandado(`den:resc:${id}:${cid}`, async () => {
    const [j] = await redis([["HGET", claveC(id), cid]]);
    if (!j) return false as const;
    const c = marcar(JSON.parse(j as string) as Comentario);
    await redis([["HSET", claveC(id), cid, JSON.stringify(c)]]);
    return { avisar: () => notificarAdmin(c.oculta ? "Comentario oculto por denuncias" : "Denuncia de un comentario", `${motivo}: ${c.texto.slice(0, 100)}`, "/panel#rescate") };
  });
  return conCandado(`den:resc:${id}`, async () => {
    const r = await uno(id);
    if (!r) return false as const;
    const x = marcar(r);
    await redis([["HSET", "resc", id, JSON.stringify(x)]]);
    return { avisar: () => notificarAdmin(x.oculta ? "Publicación de rescate oculta por denuncias" : "Denuncia en Perro al rescate", `${motivo}: ${r.descripcion.slice(0, 100)}`, "/panel#rescate") };
  });
}

// ---- Mi panel ----
export async function paraPanel() {
  const lista = (await todos()).sort((a, b) => b.creado.localeCompare(a.creado));
  const convs = lista.length ? await redis(lista.map((r) => ["HVALS", claveC(r.id)])) : [];
  return lista.map(({ disp: _d, tokenHash: _t, ...r }, i) => ({
    ...r, fotos: r.fotos.map((f) => f.url),
    conversacion: (convs[i] as string[]).map((j) => { const { disp: _x, ...c } = JSON.parse(j) as Comentario; return c; }).sort((a, b) => a.creado.localeCompare(b.creado)),
  }));
}
// Al borrar un comentario se borran también sus respuestas
export async function borrarComentario(id: string, cid: string) {
  const hijas = (await comentariosDe(id)).filter((c) => c.padre === cid).map((c) => c.id);
  const [n] = await redis([["HDEL", claveC(id), cid, ...hijas]]);
  return Number(n) > 0;
}
export async function ocultar(id: string, cid: string | undefined, oculta: boolean) {
  if (cid) {
    const [j] = await redis([["HGET", claveC(id), cid]]);
    if (!j) return false;
    await redis([["HSET", claveC(id), cid, JSON.stringify({ ...(JSON.parse(j as string) as Comentario), oculta })]]);
    return true;
  }
  const r = await uno(id);
  if (!r) return false;
  await redis([["HSET", "resc", id, JSON.stringify({ ...r, oculta })]]);
  return true;
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
  await redis([["HSET", "resc", id, JSON.stringify(x)]]);
  return true;
}
// Bloquear a quien publicó (o a quien comentó): se bajan todas sus publicaciones y no puede volver a publicar ni comentar desde ese celular
export async function bloquear(id: string, cid?: string) {
  const r = await uno(id);
  if (!r) return false;
  let disp = r.disp, nota = `Perro al rescate: ${r.descripcion.slice(0, 60)}`;
  if (cid) {
    const [j] = await redis([["HGET", claveC(id), cid]]);
    if (!j) return false;
    const c = JSON.parse(j as string) as Comentario;
    disp = c.disp; nota = `Perro al rescate (comentario): ${c.texto.slice(0, 60)}`;
    await borrarComentario(id, cid);
  }
  await agregarBloqueo("", disp, nota);
  for (const x of await todos()) if (x.disp === disp) await quitar(x.id);
  return true;
}

// ---- Mantenimiento (lo corre el proceso automático): se baja lo vencido ----
export async function mantener() {
  const ahora = Date.now();
  for (const r of await todos()) if (new Date(r.vence).getTime() <= ahora) await quitar(r.id);
}
