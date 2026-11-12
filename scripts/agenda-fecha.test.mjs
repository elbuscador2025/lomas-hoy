// Pruebas de la tarjeta "Agenda de Lomas" de la pantalla principal: qué día es cada evento y cuáles son los 3 que se muestran.
import test from "node:test";
import assert from "node:assert/strict";
import { diaDelEvento, diaCorto, lugarDeTitulo, proximosEventos } from "../lib/agenda-fecha.ts";

const LOC = ["Lomas de Zamora", "Banfield", "Temperley", "Llavallol", "Turdera", "Villa Fiorito"];

test("el día del evento sale del título, solo si lo dice", () => {
  assert.equal(diaDelEvento("Fondo de ojo gratis este viernes en el Gandulfo", "2026-11-12"), "2026-11-13"); // jueves → viernes
  assert.equal(diaDelEvento("Habrá un show el sábado en Llavallol", "2026-11-12"), "2026-11-14");
  assert.equal(diaDelEvento("Festival el domingo", "2026-11-12"), "2026-11-15");
  assert.equal(diaDelEvento("Feria este jueves en la plaza", "2026-11-12"), "2026-11-12"); // el mismo día
  assert.equal(diaDelEvento("Feria del libro el 21 de noviembre en Banfield", "2026-11-12"), "2026-11-21");
  assert.equal(diaDelEvento("Show de música hoy en Temperley", "2026-11-12"), "2026-11-12");
  assert.equal(diaDelEvento("Taller gratis mañana en Turdera", "2026-11-12"), "2026-11-13");
  assert.equal(diaDelEvento("Turdera celebra sus 52 años con un festival en la Plaza San Martín", "2026-11-12"), null);
  assert.equal(diaDelEvento("Lalcec anunció controles gratuitos de piel para noviembre y diciembre", "2026-11-06"), null);
  assert.equal(diaDelEvento("Feria el 1 de enero", "2026-12-20"), "2027-01-01"); // pasa de año
  assert.equal(diaDelEvento("Fiesta el 31 de febrero", "2026-11-12"), null); // fecha imposible
});

test("día corto: «Sáb 15»", () => {
  assert.equal(diaCorto("2026-11-14"), "Sáb 14");
  assert.equal(diaCorto("2026-11-09"), "Lun 9");
});

test("el lugar es el barrio que nombra el título", () => {
  assert.equal(lugarDeTitulo("Cultura en las Plazas: habrá artistas en vivo en Llavallol", LOC), "Llavallol");
  assert.equal(lugarDeTitulo("Halloween en Banfield: más de 100 comercios", LOC), "Banfield");
  assert.equal(lugarDeTitulo("Nueva Expo Ambiental con emprendedores", LOC), "");
});

const N = (titulo, fecha, medio = "Diario Lomas") => ({ titulo, medio, link: "https://x.com/" + encodeURIComponent(titulo), fecha: `${fecha}T14:00:00.000Z` });

test("los próximos 3: primero los que tienen día, el más cercano primero", () => {
  const notas = [
    N("Show el domingo en Banfield", "2026-11-12"), N("Feria el sábado en Llavallol", "2026-11-12"), N("Taller gratis este viernes en Turdera", "2026-11-12"),
    N("Festival de Temperley sin día", "2026-11-12"),
  ];
  const r = proximosEventos(notas, "2026-11-12", LOC);
  assert.deepEqual(r.map((e) => e.dia), ["2026-11-13", "2026-11-14", "2026-11-15"]);
  assert.ok(r.every((e) => !e.esNota));
  assert.equal(r[0].lugar, "Turdera");
});

test("los eventos que ya pasaron no cuentan como próximos", () => {
  const notas = [N("Show el sábado en Banfield", "2026-11-05"), N("Taller gratis este viernes en Turdera", "2026-11-12")];
  const r = proximosEventos(notas, "2026-11-12", LOC);
  assert.equal(r[0].dia, "2026-11-13"); assert.equal(r[0].esNota, false);
  assert.equal(r[1].esNota, true); // la nota vieja entra solo para completar, marcada como nota
});

test("sin eventos con día: las 3 notas más nuevas", () => {
  const notas = [N("Nota A sin día", "2026-11-01"), N("Nota B sin día", "2026-11-10"), N("Nota C sin día", "2026-11-05"), N("Nota D sin día", "2026-11-11")];
  const r = proximosEventos(notas, "2026-11-12", LOC);
  assert.deepEqual(r.map((e) => e.titulo), ["Nota D sin día", "Nota B sin día", "Nota C sin día"]);
  assert.ok(r.every((e) => e.esNota));
});

test("sin notas: lista vacía", () => assert.deepEqual(proximosEventos([], "2026-11-12", LOC), []));
