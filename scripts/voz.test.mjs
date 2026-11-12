// Pruebas de La Voz de Lomas (la parte que no necesita servidor): filtros de comentarios, porcentajes y rotación.
import { test } from "node:test";
import assert from "node:assert/strict";
import { motivoComentarioInvalido, porcentajes, elegirPorRotacion, numeroDeDia } from "../lib/voz-comun.ts";
import { BANCO } from "../lib/voz-banco.ts";

test("comentarios: bloquea enlaces", () => {
  for (const t of ["entrá a https://algo.com/x", "mirá www.ofertas.com", "pasa por wa.me/5491155555555", "mi insta @pepe_ventas", "bit.ly/abc123", "hola punto com", "tienda.com.ar tiene todo", "w w w . sitio . com"]) {
    assert.ok(motivoComentarioInvalido(t), t);
  }
});
test("comentarios: bloquea teléfonos", () => {
  for (const t of ["llamame al 11 5555-5555", "1155555555", "+54 9 11 5555 5555", "(011) 4244-1234", "mi cel: 11.5555.5555", "cinco cinco cinco uno dos tres cuatro", "15 5555 5555"]) {
    assert.ok(motivoComentarioInvalido(t), t);
  }
});
test("comentarios: deja pasar lo normal (incluso con números chicos y puntos)", () => {
  for (const t of ["Me encanta la plaza. Me voy todos los domingos", "Vivo hace 15 años y tengo 3 hijos", "Faltan más bancos, 2 o 3 alcanzan", "Lo mejor es la gente.", "En 2024 mejoró mucho la luz de la calle", "Somos 40 vecinos, 10 chicos y 5 perros", "Sí. Me gusta, pero falta limpieza", "El colectivo pasa cada 20 minutos"]) {
    assert.equal(motivoComentarioInvalido(t), null, t);
  }
});
test("porcentajes: siempre suman 100 y no hay ceros falsos", () => {
  assert.deepEqual(porcentajes([0, 0, 0]), [0, 0, 0]);
  assert.deepEqual(porcentajes([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(porcentajes([5, 0]), [100, 0]);
  for (const v of [[3, 3, 1], [1, 2, 4, 7], [99, 1], [7, 7, 7, 7], [1, 1, 1, 1, 1, 1, 1]]) assert.equal(porcentajes(v).reduce((a, b) => a + b, 0), 100, v.join());
});
test("rotación: cambia cada día, recorre todas y es estable en el mismo día", () => {
  const act = BANCO.map((b, i) => ({ id: b.id, orden: i }));
  const vistas = new Set();
  let ayer = "";
  for (let d = 0; d < 30; d++) {
    const f = new Date(Date.UTC(2026, 10, 12 + d)).toISOString().slice(0, 10);
    const p = elegirPorRotacion(act, f);
    assert.notEqual(p.id, ayer); ayer = p.id; vistas.add(p.id);
    assert.equal(elegirPorRotacion(act, f).id, p.id);
  }
  assert.equal(vistas.size, 30);
  assert.equal(elegirPorRotacion([], "2026-11-12"), null);
  assert.equal(numeroDeDia("2026-11-13") - numeroDeDia("2026-11-12"), 1);
});
test("banco: 30 preguntas con 2 a 4 opciones, sin repetidos ni temas de peleas", () => {
  assert.equal(BANCO.length, 30);
  assert.equal(new Set(BANCO.map((b) => b.id)).size, 30);
  assert.equal(new Set(BANCO.map((b) => b.texto)).size, 30);
  for (const b of BANCO) {
    assert.ok(b.opciones.length >= 2 && b.opciones.length <= 4, b.id);
    assert.equal(new Set(b.opciones).size, b.opciones.length, b.id);
    assert.ok(b.texto.length <= 120 && b.opciones.every((o) => o.length <= 60), b.id);
    assert.ok(!/(milei|kirchner|macri|peron|peronis|pro\b|radical|intendente|gobernador|presidente|partido|voto|elecciones)/i.test(b.texto + b.opciones.join(" ")), b.id);
  }
});
