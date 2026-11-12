// La Voz de Lomas: pregunta del día, votos anónimos y comentarios con protecciones. Todo en la misma base Redis que el resto de la app.
// Un voto por celular y por pregunta (el identificador anónimo que ya cuenta visitantes), validado acá en el servidor.
import { createHash, randomUUID } from "node:crypto";
import { redis, hoyArgentina } from "@/lib/servidor";
import { conCandado } from "@/lib/candado";
import { estaBloqueado, agregarBloqueo, huella, DENUNCIAS_PARA_OCULTAR } from "@/lib/moderacion";
import { notificarAdmin } from "@/lib/push";
import { motivoProhibidoPasa } from "@/lib/pasa-comun";
import { datoProhibido } from "@/lib/estafas";
import { BANCO } from "@/lib/voz-banco";
import {
  MAX_COMENTARIO_VOZ, MAX_COMENTARIOS_POR_DIA_VOZ, MAX_RESPUESTAS_POR_DIA_VOZ, MAX_TEXTO_PREGUNTA, MAX_TEXTO_OPCION, MOTIVOS_VOZ,
  motivoComentarioInvalido, porcentajes, elegirPorRotacion, extractoVoz,
  type PreguntaVoz, type ResultadoVoz, type EstadoVoz, type ComentarioVoz,
} from "@/lib/voz-comun";

// En las pruebas se usa otro prefijo (y no se avisa al dueño) para no mezclar nada con los datos reales.
const P = process.env.VOZ_PREFIJO || "voz";
const EN_PRUEBA = !!process.env.VOZ_PREFIJO;
const ANIO = 400 * 86400;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const limpio = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

type Denuncia = { motivo: string; disp: string; t: string };
type Comentario = { id: string; texto: string; creado: string; disp: string; padre?: string; aQuien?: string; oculta?: boolean; denuncias?: Denuncia[] };

const kPreg = `${P}:preg`, kSembrado = `${P}:sembrado`, kHist = `${P}:hist`;
const kDia = (f: string) => `${P}:dia:${f}`, kMan = (f: string) => `${P}:man:${f}`;
const kVotos = (id: string) => `${P}:v:${id}`, kCuenta = (id: string) => `${P}:n:${id}`, kComentarios = (id: string) => `${P}:k:${id}`;

const mañana = (f: string) => { const [y, m, d] = f.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10); };

// ---- Preguntas ----
async function sembrar() {
  await redis([
    ...BANCO.map((b, i) => ["HSETNX", kPreg, b.id, JSON.stringify({
      id: b.id, texto: b.texto, opciones: b.opciones.map((t, j) => ({ id: "abcd"[j], texto: t })), activa: true, orden: i + 1, creada: new Date().toISOString(),
    } satisfies PreguntaVoz)] as (string | number)[]),
    ["SET", kSembrado, "1"],
  ]);
}
export async function listarPreguntas(): Promise<PreguntaVoz[]> {
  const [x] = await redis([["HVALS", kPreg]]);
  return (x as string[]).map((j) => JSON.parse(j) as PreguntaVoz).sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id));
}

/** La pregunta de una fecha: la que elegí a mano; si no, la rotación automática (que queda fija durante todo el día). */
export async function preguntaDeFecha(fecha: string): Promise<PreguntaVoz | null> {
  const [sembrado, man, auto] = await redis([["GET", kSembrado], ["GET", kMan(fecha)], ["GET", kDia(fecha)]]);
  if (!sembrado) await sembrar();
  const todas = await listarPreguntas();
  const activa = (id: unknown) => todas.find((p) => p.id === id && p.activa) ?? null;
  const elegida = activa(man) ?? activa(auto);
  if (elegida) return elegida;
  const rot = elegirPorRotacion(todas.filter((p) => p.activa), fecha);
  if (rot) await redis([["SET", kDia(fecha), rot.id, "EX", ANIO], ["HSET", kHist, fecha, rot.id]]);
  return rot;
}

// ---- Resultados y votos ----
export async function resultadosDe(p: PreguntaVoz): Promise<ResultadoVoz> {
  const [x] = await redis([["HGETALL", kCuenta(p.id)]]);
  const arr = (x as string[]) ?? [];
  const cuenta = new Map<string, number>();
  for (let i = 0; i < arr.length; i += 2) cuenta.set(arr[i], Number(arr[i + 1]) || 0);
  const votos = p.opciones.map((o) => cuenta.get(o.id) ?? 0);
  const pct = porcentajes(votos);
  return { total: votos.reduce((a, b) => a + b, 0), opciones: p.opciones.map((o, i) => ({ id: o.id, votos: votos[i], pct: pct[i] })) };
}

async function comentariosVisibles(pid: string, max = 20): Promise<ComentarioVoz[]> {
  const [x] = await redis([["HVALS", kComentarios(pid)]]);
  const crudos = (x as string[]).map((j) => JSON.parse(j) as Comentario);
  const todos = crudos.filter((c) => !c.oculta);
  // Cada respuesta dice a quién le contesta (si ese mensaje se ocultó o se borró, queda el aviso sin el texto)
  const publico = (c: Comentario): ComentarioVoz => {
    if (!c.aQuien) return { id: c.id, texto: c.texto, creado: c.creado };
    const destino = todos.find((t) => t.id === c.aQuien);
    return { id: c.id, texto: c.texto, creado: c.creado, aQuien: { id: c.aQuien, extracto: destino ? extractoVoz(destino.texto) : "" } };
  };
  const principales = todos.filter((c) => !c.padre).sort((a, b) => b.creado.localeCompare(a.creado)).slice(0, max);
  // Las respuestas van debajo de su comentario (de la más vieja a la más nueva). Si el comentario está oculto, sus respuestas también.
  return principales.map((p) => ({ ...publico(p), respuestas: todos.filter((r) => r.padre === p.id).sort((a, b) => a.creado.localeCompare(b.creado)).map(publico) }));
}

/** Lo que ve un celular: la pregunta de hoy, si ya votó, los resultados (solo si votó) y los comentarios. */
export async function ver(dispositivo: string): Promise<EstadoVoz | null> {
  const p = await preguntaDeFecha(hoyArgentina());
  if (!p) return null;
  const disp = dispositivo ? huella(dispositivo) : "";
  const [voto, comentarios, res] = await Promise.all([
    disp ? redis([["HGET", kVotos(p.id), disp]]).then((r) => (r[0] ? String(r[0]) : null)) : Promise.resolve(null),
    comentariosVisibles(p.id),
    resultadosDe(p),
  ]);
  const valido = voto && p.opciones.some((o) => o.id === voto) ? voto : null;
  return {
    ok: true, pregunta: { id: p.id, texto: p.texto, opciones: p.opciones }, participantes: res.total,
    voto: valido, resultados: valido ? res : null, comentarios,
  };
}

export type ResultadoVotar = { ok: true; contado: boolean; repetido: boolean; opcion: string; resultados: ResultadoVoz } | { ok: false; error: string; status: number };

/** Un solo toque. `contar` es falso para mis visitas de dueño: se ven los resultados pero no suma ningún voto. */
export async function votar(preguntaId: string, opcionId: string, dispositivo: string, ip: string, contar: boolean): Promise<ResultadoVotar> {
  const p = await preguntaDeFecha(hoyArgentina());
  if (!p || p.id !== preguntaId) return { ok: false, error: "Esa pregunta ya no está. Actualizá la pantalla.", status: 409 };
  if (!p.opciones.some((o) => o.id === opcionId)) return { ok: false, error: "Opción inválida.", status: 400 };
  if (!contar) return { ok: true, contado: false, repetido: false, opcion: opcionId, resultados: await resultadosDe(p) };
  const disp = huella(dispositivo);
  if (await estaBloqueado(null, disp)) return { ok: false, error: "No se pudo registrar el voto.", status: 403 };
  // Freno contra programas que inventan celulares: muy alto para no molestar a los vecinos que comparten conexión
  const kIp = `${P}:lim:v:${p.id}:${sha(ip).slice(0, 16)}`;
  const [n] = await redis([["INCR", kIp]]);
  if (Number(n) === 1) await redis([["EXPIRE", kIp, 2 * 86400]]);
  if (Number(n) > 60) return { ok: false, error: "Hubo demasiados votos desde esta conexión. Probá más tarde.", status: 429 };
  // HSETNX es atómico: solo el primer voto de ese celular suma. Dos toques juntos no cuentan dos veces.
  const [nuevo] = await redis([["HSETNX", kVotos(p.id), disp, opcionId]]);
  if (Number(nuevo) === 1) await redis([["HINCRBY", kCuenta(p.id), opcionId, 1], ["EXPIRE", kVotos(p.id), ANIO], ["EXPIRE", kCuenta(p.id), ANIO]]);
  // Si ese celular ya había votado, vale su primer voto (no el de ahora)
  const [previo] = Number(nuevo) === 1 ? [opcionId] : await redis([["HGET", kVotos(p.id), disp]]);
  return { ok: true, contado: Number(nuevo) === 1, repetido: Number(nuevo) !== 1, opcion: String(previo ?? opcionId), resultados: await resultadosDe(p) };
}

// ---- Comentarios ----
export async function comentar(textoCrudo: unknown, dispositivo: string, ip: string, padre?: string): Promise<{ ok: true; comentario: ComentarioVoz } | { ok: false; error: string; status: number }> {
  const p = await preguntaDeFecha(hoyArgentina());
  if (!p) return { ok: false, error: "Hoy no hay pregunta.", status: 404 };
  const esRespuesta = !!padre;
  let raiz: string | undefined; // la respuesta queda en el hilo del comentario original, aunque le conteste a otra respuesta
  let origenTexto = "";
  if (padre) { // se le puede responder a cualquier mensaje que esté a la vista
    const [jp] = await redis([["HGET", kComentarios(p.id), padre]]);
    const origen = jp ? (JSON.parse(jp as string) as Comentario) : null;
    if (!origen || origen.oculta) return { ok: false, error: "Ese comentario ya no está.", status: 404 };
    raiz = origen.padre ?? origen.id;
    origenTexto = origen.texto;
    if (origen.padre) {
      const [jr] = await redis([["HGET", kComentarios(p.id), raiz]]);
      const r = jr ? (JSON.parse(jr as string) as Comentario) : null;
      if (!r || r.oculta) return { ok: false, error: "Ese comentario ya no está.", status: 404 };
    }
  }
  const texto = limpio(textoCrudo, MAX_COMENTARIO_VOZ + 1);
  if (texto.length < 2) return { ok: false, error: esRespuesta ? "Escribí tu respuesta." : "Escribí tu comentario.", status: 400 };
  if (texto.length > MAX_COMENTARIO_VOZ) return { ok: false, error: `${esRespuesta ? "La respuesta" : "El comentario"} puede tener hasta ${MAX_COMENTARIO_VOZ} caracteres.`, status: 400 };
  const motivo = motivoComentarioInvalido(texto) ?? motivoProhibidoPasa(texto) ?? datoProhibido(texto);
  if (motivo) return { ok: false, error: motivo, status: 400 };
  const disp = huella(dispositivo);
  if (await estaBloqueado(null, disp)) return { ok: false, error: "No podés comentar desde este celular.", status: 403 };
  // Los comentarios (3 por día) y las respuestas (20 por día) cuentan aparte
  const tipo = esRespuesta ? "r" : "c", tope = esRespuesta ? MAX_RESPUESTAS_POR_DIA_VOZ : MAX_COMENTARIOS_POR_DIA_VOZ;
  const dia = hoyArgentina(), kd = `${P}:lim:${tipo}:${dia}:d:${sha(dispositivo).slice(0, 16)}`, ki = `${P}:lim:${tipo}:${dia}:ip:${sha(ip).slice(0, 16)}`;
  const [d, i] = await redis([["INCR", kd], ["INCR", ki]]);
  await redis([["EXPIRE", kd, 2 * 86400], ["EXPIRE", ki, 2 * 86400]]);
  if (Number(d) > tope) return { ok: false, error: esRespuesta ? `Ya dejaste ${tope} respuestas hoy. Probá mañana.` : `Ya dejaste ${tope} comentarios hoy. Probá mañana.`, status: 429 };
  if (Number(i) > tope * 15) return { ok: false, error: "Hubo demasiados mensajes desde esta conexión. Probá más tarde.", status: 429 };
  // El mismo texto desde el mismo celular no se repite
  const [x] = await redis([["HVALS", kComentarios(p.id)]]);
  const previos = (x as string[]).map((j) => JSON.parse(j) as Comentario);
  if (previos.some((c) => c.disp === disp && c.texto.toLowerCase() === texto.toLowerCase())) return { ok: false, error: "Ya dejaste ese comentario.", status: 400 };
  const c: Comentario = { id: randomUUID().slice(0, 10), texto, creado: new Date().toISOString(), disp, ...(padre ? { padre: raiz, aQuien: padre } : {}) };
  await redis([["HSET", kComentarios(p.id), c.id, JSON.stringify(c)], ["EXPIRE", kComentarios(p.id), ANIO]]);
  return { ok: true, comentario: { id: c.id, texto: c.texto, creado: c.creado, ...(padre ? { aQuien: { id: padre, extracto: extractoVoz(origenTexto) } } : {}) } };
}

/** Cada celular cuenta una vez; con 3 denuncias el comentario se oculta hasta que yo lo revise (mismo criterio que el resto de la app). */
export async function denunciar(preguntaId: string, cid: string, motivo: string, dispositivo: string) {
  if (!MOTIVOS_VOZ.includes(motivo)) return false;
  const disp = huella(dispositivo);
  return conCandado(`den:voz:${preguntaId}:${cid}`, async () => {
    const [j] = await redis([["HGET", kComentarios(preguntaId), cid]]);
    if (!j) return false as const;
    const c = JSON.parse(j as string) as Comentario;
    const lista = (c.denuncias ?? []).filter((d) => d.disp !== disp);
    lista.push({ motivo, disp, t: new Date().toISOString() });
    const x: Comentario = { ...c, denuncias: lista, oculta: lista.length >= DENUNCIAS_PARA_OCULTAR || !!c.oculta };
    await redis([["HSET", kComentarios(preguntaId), cid, JSON.stringify(x)]]);
    return { avisar: async () => { if (!EN_PRUEBA) await notificarAdmin(x.oculta ? "Comentario oculto por denuncias" : "Denuncia en La Voz de Lomas", `${motivo}: ${x.texto.slice(0, 100)}`, "/panel#voz"); } };
  });
}

// ---- Mi panel ----
export async function paraPanel() {
  const hoy = hoyArgentina(), man = mañana(hoy);
  const [pHoy] = await Promise.all([preguntaDeFecha(hoy)]);
  const preguntas = await listarPreguntas();
  const [manHoy, manMan, histRaw] = await redis([["GET", kMan(hoy)], ["GET", kMan(man)], ["HGETALL", kHist]]);
  const hist = new Map<string, string[]>();
  const h = (histRaw as string[]) ?? [];
  for (let i = 0; i < h.length; i += 2) hist.set(h[i + 1], [...(hist.get(h[i + 1]) ?? []), h[i]]);
  const res = preguntas.length ? await Promise.all(preguntas.map(resultadosDe)) : [];
  const coms = preguntas.length ? await redis(preguntas.map((p) => ["HVALS", kComentarios(p.id)])) : [];
  const comentarios = preguntas.flatMap((p, i) => (coms[i] as string[]).map((j) => {
    const { disp: _d, ...c } = JSON.parse(j) as Comentario;
    return { ...c, preguntaId: p.id, pregunta: p.texto };
  })).sort((a, b) => b.creado.localeCompare(a.creado)).slice(0, 200);
  return {
    hoy: { fecha: hoy, preguntaId: pHoy?.id ?? null, manual: !!manHoy && manHoy === pHoy?.id },
    manana: { fecha: man, preguntaId: manMan ? String(manMan) : null },
    preguntas: preguntas.map((p, i) => ({ ...p, resultados: res[i], fechas: (hist.get(p.id) ?? []).sort() })),
    comentarios,
  };
}

type EntradaPregunta = { id?: unknown; texto?: unknown; opciones?: unknown; activa?: unknown };
export async function guardarPregunta(e: EntradaPregunta): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const texto = limpio(e.texto, MAX_TEXTO_PREGUNTA + 1);
  if (texto.length < 5) return { ok: false, error: "Escribí la pregunta." };
  if (texto.length > MAX_TEXTO_PREGUNTA) return { ok: false, error: `La pregunta puede tener hasta ${MAX_TEXTO_PREGUNTA} caracteres.` };
  const crudas = (Array.isArray(e.opciones) ? e.opciones : []).map((o): { id?: unknown; texto?: unknown } => (typeof o === "object" && o ? o as { id?: unknown; texto?: unknown } : { texto: o }));
  const opciones = crudas.map((o) => ({ id: typeof o.id === "string" && /^[a-d]$/.test(o.id) ? o.id : "", texto: limpio(o.texto, MAX_TEXTO_OPCION + 1) })).filter((o) => o.texto);
  if (opciones.length < 2 || opciones.length > 4) return { ok: false, error: "Tiene que tener entre 2 y 4 opciones." };
  if (opciones.some((o) => o.texto.length > MAX_TEXTO_OPCION)) return { ok: false, error: `Cada opción puede tener hasta ${MAX_TEXTO_OPCION} caracteres.` };
  if (new Set(opciones.map((o) => o.texto.toLowerCase())).size !== opciones.length) return { ok: false, error: "Hay opciones repetidas." };
  const usadas = new Set(opciones.map((o) => o.id).filter(Boolean));
  if (usadas.size !== opciones.filter((o) => o.id).length) return { ok: false, error: "Opciones inválidas." };
  const libres = [..."abcd"].filter((l) => !usadas.has(l));
  for (const o of opciones) if (!o.id) o.id = libres.shift()!;

  const id = typeof e.id === "string" && /^[a-z0-9]{2,12}$/.test(e.id) ? e.id : "";
  const todas = await listarPreguntas();
  const previa = id ? todas.find((p) => p.id === id) : undefined;
  if (id && !previa) return { ok: false, error: "No encontré esa pregunta." };
  if (previa) { // no se puede sacar una opción que ya tiene votos: se perderían
    const res = await resultadosDe(previa);
    const quitada = previa.opciones.find((o) => !opciones.some((n) => n.id === o.id) && (res.opciones.find((r) => r.id === o.id)?.votos ?? 0) > 0);
    if (quitada) return { ok: false, error: `La opción “${quitada.texto}” ya tiene votos y no se puede sacar. Apagá esta pregunta y creá una nueva.` };
  }
  const nueva: PreguntaVoz = {
    id: previa?.id ?? `p${randomUUID().slice(0, 8)}`, texto, opciones, activa: e.activa === undefined ? previa?.activa ?? true : e.activa === true,
    orden: previa?.orden ?? Math.max(0, ...todas.map((p) => p.orden)) + 1, creada: previa?.creada ?? new Date().toISOString(),
  };
  await redis([["HSET", kPreg, nueva.id, JSON.stringify(nueva)]]);
  return { ok: true, id: nueva.id };
}
export async function activarPregunta(id: string, activa: boolean) {
  const [j] = await redis([["HGET", kPreg, id]]);
  if (!j) return false;
  await redis([["HSET", kPreg, id, JSON.stringify({ ...(JSON.parse(j as string) as PreguntaVoz), activa })]]);
  return true;
}
/** Elegir la pregunta de hoy o de mañana a mano. Con id vacío, esa fecha vuelve a la rotación automática. */
export async function elegirPregunta(id: string | null, cuando: "hoy" | "manana") {
  const hoy = hoyArgentina(), fecha = cuando === "hoy" ? hoy : mañana(hoy);
  if (!id) { await redis([["DEL", kMan(fecha)]]); return true; }
  const [j] = await redis([["HGET", kPreg, id]]);
  if (!j || !(JSON.parse(j as string) as PreguntaVoz).activa) return false;
  await redis([["SET", kMan(fecha), id, "EX", 3 * 86400], ["HSET", kHist, fecha, id]]);
  return true;
}

export async function ocultarComentario(pid: string, cid: string, oculta: boolean) {
  const [j] = await redis([["HGET", kComentarios(pid), cid]]);
  if (!j) return false;
  await redis([["HSET", kComentarios(pid), cid, JSON.stringify({ ...(JSON.parse(j as string) as Comentario), oculta })]]);
  return true;
}
export async function dejarComentario(pid: string, cid: string) {
  const [j] = await redis([["HGET", kComentarios(pid), cid]]);
  if (!j) return false;
  const { denuncias: _d, oculta: _o, ...c } = JSON.parse(j as string) as Comentario;
  await redis([["HSET", kComentarios(pid), cid, JSON.stringify(c)]]);
  return true;
}
// Al borrar un comentario se borran también sus respuestas (quedarían sueltas, sin saber a qué contestan)
async function borrarHilo(pid: string, cid: string) {
  const [x] = await redis([["HVALS", kComentarios(pid)]]);
  const hijas = (x as string[]).map((j) => JSON.parse(j) as Comentario).filter((c) => c.padre === cid).map((c) => c.id);
  const [n] = await redis([["HDEL", kComentarios(pid), cid, ...hijas]]);
  return Number(n) > 0;
}
export async function borrarComentario(pid: string, cid: string) {
  return borrarHilo(pid, cid);
}
/** Bloquear a quien escribió: se borra su comentario (o respuesta) y ese celular no puede votar ni comentar (mismo sistema de "Bloqueados"). */
export async function bloquearAutor(pid: string, cid: string) {
  const [j] = await redis([["HGET", kComentarios(pid), cid]]);
  if (!j) return false;
  const c = JSON.parse(j as string) as Comentario;
  await agregarBloqueo("", c.disp, `La Voz de Lomas: ${c.texto}`);
  await borrarHilo(pid, cid);
  return true;
}
