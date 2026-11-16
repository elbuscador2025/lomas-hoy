// Pruebas de cómo se dicen los horarios de las alertas del SMN: siempre con el momento del día y el día.
import test from "node:test";
import assert from "node:assert/strict";
import { cuandoAlerta } from "../lib/alertas-texto.ts";

// 2026-11-16 es lunes
test("empieza en la madrugada siguiente: «esta madrugada», no «mañana»", () => {
  const r = cuandoAlerta("2026-11-17T03:00", "2026-11-17T09:00", "2026-11-16T21:00");
  assert.equal(r.corto, "esta madrugada (martes), de 3 a 9 hs (madrugada y mañana)");
  assert.equal(r.largo, "Esta madrugada (martes), de 3 a 9 hs (madrugada y mañana).");
  assert.equal(r.empieza, "Empieza en 6 horas");
});
test("mañana a la tarde y noche", () => {
  const r = cuandoAlerta("2026-11-17T15:00", "2026-11-17T21:00", "2026-11-16T10:00");
  assert.equal(r.corto, "mañana martes, de 15 a 21 hs (tarde y noche)");
  assert.equal(r.empieza, "Empieza en 29 horas");
});
test("todo dentro de la misma parte del día", () => {
  assert.equal(cuandoAlerta("2026-11-17T08:00", "2026-11-17T11:00", "2026-11-16T10:00").corto, "mañana martes, de 8 a 11 de la mañana");
  assert.equal(cuandoAlerta("2026-11-16T14:00", "2026-11-16T19:00", "2026-11-16T10:00").corto, "hoy lunes, de 14 a 19 de la tarde");
});
test("esta noche, y alerta que cruza la medianoche", () => {
  const r = cuandoAlerta("2026-11-16T21:00", "2026-11-17T03:00", "2026-11-16T15:00");
  assert.equal(r.corto, "esta noche (lunes), de 21 a 3 hs (noche y madrugada), hasta el martes");
});
test("ya empezó: hasta qué hora y qué día", () => {
  assert.equal(cuandoAlerta("2026-11-16T09:00", "2026-11-16T14:00", "2026-11-16T10:00").corto, "ahora, hasta las 14 de la tarde");
  assert.equal(cuandoAlerta(null, "2026-11-17T03:00", "2026-11-16T22:00").corto, "ahora, hasta las 3 de la madrugada del martes");
  assert.equal(cuandoAlerta("2026-11-16T09:00", "2026-11-16T14:00", "2026-11-16T10:00").empieza, "Está en vigencia ahora");
});
test("02:59 es «las 3» y falta poco: minutos", () => {
  assert.equal(cuandoAlerta("2026-11-17T01:00", "2026-11-17T02:59", "2026-11-17T00:20").corto, "esta madrugada (martes), de 1 a 3 de la madrugada");
  assert.equal(cuandoAlerta("2026-11-17T01:00", "2026-11-17T04:00", "2026-11-17T00:20").empieza, "Empieza en 40 minutos");
});
test("dentro de unos días", () => {
  assert.equal(cuandoAlerta("2026-11-19T12:00", "2026-11-19T18:00", "2026-11-16T10:00").corto, "el jueves, de 12 a 18 de la tarde");
});
