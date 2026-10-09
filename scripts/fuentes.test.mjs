import test from "node:test";
import assert from "node:assert/strict";
import { config as cfg } from "../lomas.config.mjs";
import { leerLuz } from "./fuentes.mjs";

test("luz: toma solo los cortes de Lomas de Zamora (Edesur)", () => {
  const js = `var addressPoints_Cuadro_D = [
    [-34.79, -58.42, 21, "<b>CORTE DE BAJA TENSION</b>, EDESUR S.A., Partido: LOMAS DE ZAMORA, Localidad: LAVALLOL, Usuarios afectados: 3 "]
    ,[-34.6, -58.4, 21, "<b>CORTE DE BAJA TENSION</b>, EDESUR S.A., Partido: CAPITAL, Localidad: FLORESTA, Usuarios afectados: 18 "]];`;
  const r = leerLuz(js, cfg);
  assert.deepEqual(r.cortes, [{ tension: "baja", localidad: "LAVALLOL", usuarios: 3, normalizacion: null }]);
});

import { leerTren } from "./fuentes.mjs";
const alerta = (t, d) => `<div class="alert alert-warning"><h5 class="h5">${t}\n</h5><p>${d}</p></div>`;

test("tren: descarta estaciones fuera del partido y guarda las fechas", () => {
  const html = `<summary> Línea Roca</summary>` +
    alerta("Ramal Temperley - Haedo", "Del sábado 10/10 al martes 13/10 inclusive recorrido limitado entre Temperley y San Justo.") +
    alerta("Ramales Plaza Constitución – Ezeiza", "La estación Hipólito Yrigoyen se encuentra cerrada.") +
    `</details>`;
  const { novedades } = leerTren(html, cfg);
  assert.equal(novedades.length, 1);
  assert.deepEqual([novedades[0].desde, novedades[0].hasta, novedades[0].disrupcion], ["10-10", "10-13", true]);
});
