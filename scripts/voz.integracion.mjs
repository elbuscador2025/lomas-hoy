// Pruebas de La Voz de Lomas contra un servidor local, con datos de prueba aparte (prefijo "voztest") que se borran al terminar.
//   VOZ_PREFIJO=voztest npx next dev -p 3200      y en otra terminal:
//   BASE=http://localhost:3200 node --env-file=.env.local scripts/voz.integracion.mjs
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";

const BASE = process.env.BASE || "http://localhost:3200";
const KV = process.env.KV_REST_API_URL, TOKEN = process.env.KV_REST_API_TOKEN;
if (!KV || !TOKEN) throw new Error("Faltan las claves de la base (.env.local)");
const redis = async (cmds) => (await (await fetch(`${KV}/pipeline`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(cmds) })).json()).map((x) => x.result);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const huella = (s) => sha(s).slice(0, 16);

let n = 0;
const ok = (t) => { n++; console.log("  ✔", t); };
const celu = () => "celu-" + randomBytes(10).toString("hex");
const json = async (ruta, cuerpo, extra = {}) => {
  const r = await fetch(BASE + ruta, { method: "POST", headers: { "Content-Type": "application/json", ...extra }, body: JSON.stringify(cuerpo) });
  return { s: r.status, j: await r.json().catch(() => ({})) };
};
const ver = async (d) => (await (await fetch(`${BASE}/api/voz?d=${d}`)).json());
const sesion = randomBytes(32).toString("hex");
const ADM = { cookie: `sesion=${sesion}` };
const panel = (cuerpo, extra = ADM) => json("/api/panel/voz", cuerpo, extra);
const hoyAR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

async function limpiar() {
  const [ks] = await redis([["KEYS", "voztest:*"]]);
  if (ks?.length) await redis(ks.map((k) => ["DEL", k]));
  await redis([["DEL", `ses:${sha(sesion)}`]]);
}

async function main() {
  await limpiar();
  await redis([["SET", `ses:${sha(sesion)}`, JSON.stringify({ tipo: "admin", id: "admin" }), "EX", 3600]]);
  const bloqueados = [];

  console.log("Pregunta del día");
  const A = celu(), B = celu(), C = celu(), D = celu();
  const e0 = await ver(A);
  assert.equal(e0.ok, true); assert.ok(e0.pregunta.opciones.length >= 2 && e0.pregunta.opciones.length <= 4); ok("hay pregunta con 2 a 4 opciones");
  assert.equal(e0.voto, null); assert.equal(e0.resultados, null); assert.equal(e0.participantes, 0); ok("antes de votar: sin resultados y 0 participantes (se muestra «Sé el primero»)");
  const preg = e0.pregunta, op = preg.opciones.map((o) => o.id);
  assert.equal((await ver(B)).pregunta.id, preg.id); assert.equal((await ver(A)).pregunta.id, preg.id); ok("todos ven la misma pregunta y no cambia durante el día");

  console.log("Votación");
  const v1 = await json("/api/voz", { pregunta: preg.id, opcion: op[0], dispositivo: A });
  assert.equal(v1.s, 200); assert.equal(v1.j.contado, true); assert.equal(v1.j.resultados.total, 1);
  assert.equal(v1.j.resultados.opciones.find((o) => o.id === op[0]).pct, 100); ok("un toque: voto contado, 100% para esa opción, 1 participante");
  const v2 = await json("/api/voz", { pregunta: preg.id, opcion: op[1], dispositivo: A });
  assert.equal(v2.j.repetido, true); assert.equal(v2.j.contado, false); assert.equal(v2.j.opcion, op[0]); assert.equal(v2.j.resultados.total, 1); ok("votar de nuevo (otra opción) no suma y vale el primer voto");
  assert.equal((await json("/api/voz", { pregunta: preg.id, opcion: op[0], dispositivo: A })).j.resultados.total, 1); ok("votar de nuevo (misma opción) no suma");
  const tandas = await Promise.all(Array.from({ length: 12 }, () => json("/api/voz", { pregunta: preg.id, opcion: op[1], dispositivo: B })));
  assert.ok(tandas.every((x) => x.s === 200)); assert.equal(tandas.filter((x) => x.j.contado).length, 1); ok("12 toques simultáneos de un mismo celular suman un solo voto");
  const eA = await ver(A); assert.equal(eA.voto, op[0]); assert.equal(eA.resultados.total, 2); ok("quien votó ve sus resultados y su opción");
  assert.equal(eA.resultados.opciones.reduce((s, o) => s + o.pct, 0), 100); assert.equal(eA.resultados.opciones.find((o) => o.id === op[0]).pct, 50); ok("porcentajes reales: 50% / 50% y suman 100");
  const eC = await ver(C); assert.equal(eC.voto, null); assert.equal(eC.resultados, null); assert.equal(eC.participantes, 2); ok("quien no votó no ve los resultados (solo cuántos votaron)");
  assert.equal((await json("/api/voz", { pregunta: preg.id, opcion: "zz", dispositivo: C })).s, 400); ok("opción inventada → rechazada");
  assert.equal((await json("/api/voz", { pregunta: "otra", opcion: op[0], dispositivo: C })).s, 409); ok("pregunta que no es la de hoy → rechazada");
  assert.equal((await json("/api/voz", { pregunta: preg.id, opcion: op[0], dispositivo: "x" })).s, 400); ok("celular sin identificador válido → rechazado");
  const tp = await fetch(BASE + "/api/voz", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" }); assert.equal(tp.status, 415); ok("pedido que no es JSON → rechazado");

  console.log("Mis votos de dueño no cuentan");
  const vd = await json("/api/voz", { pregunta: preg.id, opcion: op[0], dispositivo: celu(), dueno: true });
  assert.equal(vd.j.contado, false); assert.equal(vd.j.resultados.total, 2); ok("celular marcado como dueño: ve resultados, no suma");
  const vs = await json("/api/voz", { pregunta: preg.id, opcion: op[0], dispositivo: celu() }, ADM);
  assert.equal(vs.j.contado, false); assert.equal((await ver(A)).resultados.total, 2); ok("con la sesión del panel abierta: tampoco suma");

  console.log("Comentarios y protecciones");
  const c1 = await json("/api/voz/comentarios", { texto: "Me encanta la plaza del barrio, falta más sombra", dispositivo: A });
  assert.equal(c1.s, 200); assert.equal((await ver(C)).comentarios[0].texto, "Me encanta la plaza del barrio, falta más sombra"); ok("comentario válido: lo ve cualquiera");
  assert.ok(!JSON.stringify(await ver(C)).includes(huella(A))); ok("el comentario no muestra quién lo escribió");
  const malos = ["Mirá https://oferta.com/ya", "entrá a www.tienda.com.ar", "escribime a @pepe_ventas", "llamame al 11 5555-5555", "mi cel 1155551234", "dni 30123456 para el sorteo", "vendo bici a $50000 transferencia al cbu"];
  for (const t of malos) assert.equal((await json("/api/voz/comentarios", { texto: t, dispositivo: B })).s, 400, t);
  ok("rechaza enlaces, usuarios de redes, teléfonos, DNI y datos bancarios");
  assert.equal((await json("/api/voz/comentarios", { texto: "x".repeat(201), dispositivo: B })).s, 400); ok("más de 200 caracteres → rechazado");
  assert.equal((await json("/api/voz/comentarios", { texto: "   ", dispositivo: B })).s, 400); ok("comentario vacío → rechazado");
  assert.equal((await json("/api/voz/comentarios", { texto: "Me encanta la plaza del barrio, falta más sombra", dispositivo: A })).s, 400); ok("el mismo texto repetido → rechazado");
  const X = celu();
  for (const t of ["Uno bueno", "Dos bueno", "Tres bueno"]) assert.equal((await json("/api/voz/comentarios", { texto: t, dispositivo: X })).s, 200);
  const cuarto = await json("/api/voz/comentarios", { texto: "Cuatro bueno", dispositivo: X });
  assert.equal(cuarto.s, 429); ok("límite: 3 comentarios por día por celular (el 4.º → 429)");
  const tpc = await fetch(BASE + "/api/voz/comentarios", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" }); assert.equal(tpc.status, 415);

  console.log("Denuncias");
  const cid = (await ver(C)).comentarios.find((c) => c.texto.startsWith("Me encanta")).id;
  assert.equal((await json("/api/voz/denunciar", { pregunta: preg.id, cid, motivo: "inventado", dispositivo: B })).s, 200);
  let lp = await panel({ accion: "listar" }); assert.ok(!lp.j.comentarios.find((c) => c.id === cid).denuncias); ok("un motivo inventado no cuenta");
  await json("/api/voz/denunciar", { pregunta: preg.id, cid, motivo: "Otro", dispositivo: B });
  await json("/api/voz/denunciar", { pregunta: preg.id, cid, motivo: "Otro", dispositivo: B });
  assert.equal((await ver(C)).comentarios.some((c) => c.id === cid), true); ok("el mismo celular denunciando dos veces cuenta una sola");
  await Promise.all([C, D].map((d) => json("/api/voz/denunciar", { pregunta: preg.id, cid, motivo: "Insulta o es agresivo", dispositivo: d })));
  assert.equal((await ver(C)).comentarios.some((c) => c.id === cid), false); ok("con 3 celulares distintos el comentario se oculta (aunque lleguen juntas)");
  lp = await panel({ accion: "listar" }); const mc = lp.j.comentarios.find((c) => c.id === cid);
  assert.equal(mc.oculta, true); assert.equal(mc.denuncias.length, 3); assert.ok(!("disp" in mc)); ok("en mi panel se ve oculto, con 3 denuncias y sin datos del celular");
  assert.equal((await panel({ accion: "dejar", id: preg.id, cid })).j.ok, true); assert.equal((await ver(C)).comentarios.some((c) => c.id === cid), true); ok("«Dejar publicado» lo vuelve a mostrar");
  assert.equal((await panel({ accion: "ocultar", id: preg.id, cid, oculta: true })).j.ok, true); assert.equal((await ver(C)).comentarios.some((c) => c.id === cid), false); ok("«Ocultar» desde el panel lo saca de la vista");
  await panel({ accion: "ocultar", id: preg.id, cid, oculta: false });

  console.log("Panel: permisos");
  for (const a of ["listar", "guardar", "activar", "elegir", "ocultar", "borrar", "bloquear", "dejar"]) assert.equal((await json("/api/panel/voz", { accion: a }, {})).s, 401, a);
  ok("sin sesión de dueño, todas las acciones del panel → 401");
  assert.equal((await json("/api/panel/voz", { accion: "listar" }, { cookie: "sesion=" + "a".repeat(64) })).s, 401); ok("con una cookie falsa → 401");

  console.log("Panel: preguntas");
  lp = await panel({ accion: "listar" });
  assert.equal(lp.j.preguntas.length, 30); assert.equal(lp.j.hoy.preguntaId, preg.id); ok("el banco inicial tiene 30 preguntas");
  assert.ok(lp.j.preguntas.every((p) => p.opciones.length >= 2 && p.opciones.length <= 4)); ok("todas con 2 a 4 opciones");
  const pp = lp.j.preguntas.find((p) => p.id === preg.id); assert.equal(pp.resultados.total, 2); assert.ok(pp.fechas.includes(hoyAR)); ok("resultados y votos por pregunta, con las fechas en que fue la del día");
  for (const malo of [{ texto: "¿Pregunta sola?", opciones: ["Una"] }, { texto: "¿Muchas?", opciones: ["a", "b", "c", "d", "e"] }, { texto: "¿Repetidas?", opciones: ["Igual", "igual"] }, { texto: "No", opciones: ["a", "b"] }]) {
    assert.equal((await panel({ accion: "guardar", pregunta: malo })).j.ok, false, malo.texto);
  }
  ok("rechaza preguntas con menos de 2 o más de 4 opciones, repetidas o sin texto");
  const nueva = await panel({ accion: "guardar", pregunta: { texto: "¿Cuál es tu juego de plaza preferido?", opciones: ["Hamaca", "Tobogán", "Subibaja"], activa: true } });
  assert.equal(nueva.j.ok, true); const nid = nueva.j.id; ok("crear una pregunta nueva");
  assert.equal((await panel({ accion: "guardar", pregunta: { id: nid, texto: "¿Cuál es tu juego de plaza favorito?", opciones: [{ id: "a", texto: "Hamaca" }, { id: "b", texto: "Tobogán" }, { id: "c", texto: "Subibaja" }, { texto: "Calesita" }], activa: true } })).j.ok, true);
  lp = await panel({ accion: "listar" }); const np = lp.j.preguntas.find((p) => p.id === nid);
  assert.equal(np.texto, "¿Cuál es tu juego de plaza favorito?"); assert.equal(np.opciones.length, 4); assert.deepEqual(np.opciones.map((o) => o.id), ["a", "b", "c", "d"]); ok("editar texto y agregar una opción (las existentes conservan su identidad)");
  assert.equal((await panel({ accion: "elegir", id: nid, cuando: "hoy" })).j.ok, true);
  const eN = await ver(C); assert.equal(eN.pregunta.id, nid); assert.equal(eN.participantes, 0); ok("elegir la pregunta de hoy a mano: cambia para todos y arranca en 0");
  lp = await panel({ accion: "listar" }); assert.equal(lp.j.hoy.manual, true); ok("el panel indica que la elegí a mano");
  assert.equal((await json("/api/voz", { pregunta: nid, opcion: "d", dispositivo: C })).j.contado, true);
  const rm = await panel({ accion: "guardar", pregunta: { id: nid, texto: "¿Cuál es tu juego de plaza favorito?", opciones: [{ id: "a", texto: "Hamaca" }, { id: "b", texto: "Tobogán" }, { id: "c", texto: "Subibaja" }], activa: true } });
  assert.equal(rm.j.ok, false); ok("no deja sacar una opción que ya tiene votos");
  assert.equal((await panel({ accion: "activar", id: nid, activa: false })).j.ok, true);
  const eD = await ver(C); assert.notEqual(eD.pregunta.id, nid); ok("desactivar la pregunta de hoy: sale otra automáticamente");
  assert.equal((await panel({ accion: "elegir", id: nid, cuando: "hoy" })).j.ok, false); ok("no se puede elegir una pregunta apagada");
  await panel({ accion: "activar", id: nid, activa: true });
  assert.equal((await panel({ accion: "elegir", id: "", cuando: "hoy" })).j.ok, true);
  lp = await panel({ accion: "listar" }); assert.equal(lp.j.hoy.manual, false); assert.ok(lp.j.hoy.preguntaId); ok("volver a la rotación automática");
  assert.equal((await panel({ accion: "elegir", id: preg.id, cuando: "manana" })).j.ok, true); lp = await panel({ accion: "listar" }); assert.equal(lp.j.manana.preguntaId, preg.id); ok("elegir la pregunta de mañana");

  console.log("Respuestas a comentarios");
  const P1 = celu(), Q = celu(), Z = celu(), W = celu(), R1 = celu(), R2 = celu(), R3 = celu();
  assert.equal((await json("/api/voz/comentarios", { texto: "Comentario principal para responder", dispositivo: P1 })).s, 200);
  const hoyP = (await ver(P1)).pregunta.id;
  const padreId = (await ver(P1)).comentarios.find((c) => c.texto === "Comentario principal para responder").id;
  const resp = (texto, dispositivo, padre = padreId) => json("/api/voz/comentarios", { texto, dispositivo, padre });
  const rq = await resp("Estoy de acuerdo, el domingo es lo mejor", Q); assert.equal(rq.s, 200); assert.equal(rq.j.comentario.texto, "Estoy de acuerdo, el domingo es lo mejor");
  let hilo = (await ver(P1)).comentarios.find((c) => c.id === padreId);
  assert.equal(hilo.respuestas.length, 1); assert.equal(hilo.respuestas[0].texto, "Estoy de acuerdo, el domingo es lo mejor"); ok("la respuesta queda dentro del hilo del comentario al que contesta");
  assert.ok(!(await ver(P1)).comentarios.some((c) => c.id === rq.j.comentario.id)); ok("la respuesta no aparece como un comentario suelto");
  assert.equal((await resp("Y yo también", W, rq.j.comentario.id)).s, 400); ok("no se puede responder a una respuesta (un solo nivel)");
  assert.equal((await resp("Hola", W, "noexiste123")).s, 404); ok("responder a un comentario que no existe → 404");
  for (const t of ["mirá https://oferta.com", "escribime a @ventas_ya", "llamá al 11 5555-5555", "mi dni 30123456", "cbu 0000003100010000000001", "x".repeat(201), "   "]) assert.equal((await resp(t, W)).s, 400, t);
  ok("la respuesta tiene las mismas reglas: sin enlaces, usuarios, teléfonos, DNI, CBU, más de 200 letras ni vacía");
  assert.equal((await resp("sos un pelotudo", W)).s, 400); ok("y sin insultos");
  assert.equal((await resp("Estoy de acuerdo, el domingo es lo mejor", Q)).s, 400); ok("el mismo texto repetido → rechazado");
  // Límite: 10 respuestas por día por celular, aparte del límite de 3 comentarios
  for (let i = 1; i <= 10; i++) assert.equal((await resp("Respuesta número " + i + " del vecino", Z)).s, 200, "r" + i);
  assert.equal((await resp("Respuesta número 11 del vecino", Z)).s, 429); ok("límite: 10 respuestas por día por celular (la 11.ª → 429)");
  assert.equal((await json("/api/voz/comentarios", { texto: "Mi comentario propio de hoy", dispositivo: Z })).s, 200); ok("las respuestas no gastan los 3 comentarios del día");
  const X2 = celu();
  for (const t of ["Comentario uno aparte", "Comentario dos aparte", "Comentario tres aparte"]) await json("/api/voz/comentarios", { texto: t, dispositivo: X2 });
  assert.equal((await json("/api/voz/comentarios", { texto: "Comentario cuatro aparte", dispositivo: X2 })).s, 429);
  assert.equal((await resp("Con tres comentarios igual puedo responder", X2)).s, 200); ok("y quien ya hizo 3 comentarios todavía puede responder");
  hilo = (await ver(P1)).comentarios.find((c) => c.id === padreId);
  assert.equal(hilo.respuestas.length, 12); assert.deepEqual(hilo.respuestas.map((r) => r.creado), [...hilo.respuestas.map((r) => r.creado)].sort()); ok("el hilo trae todas las respuestas, de la más vieja a la más nueva (la pantalla muestra 3 y «Ver X más»)");
  // Denunciar una respuesta
  const rid = hilo.respuestas.find((r) => r.texto.startsWith("Respuesta número 1 ")).id;
  await Promise.all([R1, R2, R3].map((d) => json("/api/voz/denunciar", { pregunta: hoyP, cid: rid, motivo: "Insulta o es agresivo", dispositivo: d })));
  hilo = (await ver(P1)).comentarios.find((c) => c.id === padreId);
  assert.equal(hilo.respuestas.some((r) => r.id === rid), false); assert.equal(hilo.respuestas.length, 11); ok("una respuesta con 3 denuncias se oculta y el comentario sigue");
  let lp2 = await panel({ accion: "listar" });
  const enPanel = lp2.j.comentarios.find((c) => c.id === rid);
  assert.equal(enPanel.padre, padreId); assert.equal(enPanel.oculta, true); assert.equal(enPanel.denuncias.length, 3); assert.ok(!("disp" in enPanel)); ok("en mi panel la respuesta figura con su comentario original, oculta y con sus 3 denuncias");
  assert.equal((await panel({ accion: "dejar", id: hoyP, cid: rid })).j.ok, true); assert.equal((await ver(P1)).comentarios.find((c) => c.id === padreId).respuestas.length, 12); ok("«Dejar publicado» devuelve la respuesta");
  const r2id = hilo.respuestas[0].id;
  assert.equal((await panel({ accion: "ocultar", id: hoyP, cid: r2id, oculta: true })).j.ok, true); assert.equal((await ver(P1)).comentarios.find((c) => c.id === padreId).respuestas.some((r) => r.id === r2id), false); ok("ocultar una respuesta desde el panel");
  await panel({ accion: "ocultar", id: hoyP, cid: r2id, oculta: false });
  // Si se oculta el comentario, sus respuestas tampoco se ven (y no se puede responder)
  await panel({ accion: "ocultar", id: hoyP, cid: padreId, oculta: true });
  assert.equal((await ver(P1)).comentarios.some((c) => c.id === padreId || c.respuestas?.length > 11), false); ok("al ocultar un comentario, se oculta todo su hilo");
  assert.equal((await resp("Respondo a algo oculto", W)).s, 404); ok("no se puede responder a un comentario oculto");
  await panel({ accion: "ocultar", id: hoyP, cid: padreId, oculta: false });
  // Bloquear a quien escribió una respuesta
  const Bq = celu(); assert.equal((await resp("Respuesta para bloquear", Bq)).s, 200);
  const bid = (await ver(P1)).comentarios.find((c) => c.id === padreId).respuestas.find((r) => r.texto === "Respuesta para bloquear").id;
  assert.equal((await panel({ accion: "bloquear", id: hoyP, cid: bid })).j.ok, true); bloqueados.push(huella("|" + huella(Bq)));
  assert.equal((await ver(P1)).comentarios.find((c) => c.id === padreId).respuestas.some((r) => r.id === bid), false); ok("bloquear a quien escribió una respuesta la borra");
  assert.equal((await resp("Sigo respondiendo", Bq)).s, 403); ok("y ese celular ya no puede responder");
  // Borrar el comentario borra sus respuestas
  assert.equal((await panel({ accion: "borrar", id: hoyP, cid: padreId })).j.ok, true);
  lp2 = await panel({ accion: "listar" }); assert.ok(!lp2.j.comentarios.some((c) => c.id === padreId || c.padre === padreId)); ok("borrar un comentario borra también sus respuestas (no quedan sueltas)");

  console.log("Panel: comentarios y bloqueo");
  const Y = celu();
  await json("/api/voz/comentarios", { texto: "Comentario para bloquear", dispositivo: Y });
  const hoyId = (await ver(Y)).pregunta.id;
  const cy = (await ver(Y)).comentarios.find((c) => c.texto === "Comentario para bloquear");
  assert.equal((await panel({ accion: "bloquear", id: hoyId, cid: cy.id })).j.ok, true);
  bloqueados.push(huella(`|${huella(Y)}`));
  assert.equal((await ver(Y)).comentarios.some((c) => c.id === cy.id), false); ok("bloquear borra su comentario");
  assert.equal((await json("/api/voz/comentarios", { texto: "Sigo escribiendo", dispositivo: Y })).s, 403); ok("el celular bloqueado ya no puede comentar");
  assert.equal((await json("/api/voz", { pregunta: hoyId, opcion: (await ver(Y)).pregunta.opciones[0].id, dispositivo: Y })).s, 403); ok("ni votar");
  const cb = (await ver(C)).comentarios.find((c) => c.texto.startsWith("Uno bueno") || c.texto.startsWith("Me encanta"));
  if (cb) { assert.equal((await panel({ accion: "borrar", id: hoyId, cid: cb.id })).j.ok, true); assert.equal((await ver(C)).comentarios.some((c) => c.id === cb.id), false); ok("borrar un comentario desde el panel"); }
}

try {
  await main();
  console.log(`\nTODO OK (${n} comprobaciones)`);
} catch (e) {
  console.error("\nFALLÓ:", e.message);
  if (e.stack) console.error(e.stack.split("\n").slice(1, 4).join("\n"));
  process.exitCode = 1;
} finally {
  await limpiar();
  // Los bloqueos de prueba se sacan de la lista real de "Bloqueados"
  const [vals] = await redis([["HVALS", "bloqueados"]]);
  for (const j of vals ?? []) { const b = JSON.parse(j); if (String(b.nota).startsWith("La Voz de Lomas: Comentario para bloquear") || String(b.nota).startsWith("La Voz de Lomas: Respuesta para bloquear")) await redis([["HDEL", "bloqueados", b.id]]); }
}
