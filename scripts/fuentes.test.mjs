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
