import test from "node:test";
import assert from "node:assert/strict";
import { config as cfg } from "../lomas.config.mjs";
import { leerLuz } from "./fuentes.mjs";

test("luz: toma solo los cortes de Lomas de Zamora (Edesur)", () => {
  const js = `var addressPoints_Cuadro_D = [
    [-34.79, -58.42, 21, "<b>CORTE DE BAJA TENSION</b>, EDESUR S.A., Partido: LOMAS DE ZAMORA, Localidad: LAVALLOL, Usuarios afectados: 3 "]
    ,[-34.6, -58.4, 21, "<b>CORTE DE BAJA TENSION</b>, EDESUR S.A., Partido: CAPITAL, Localidad: FLORESTA, Usuarios afectados: 18 "]];`;
  const r = leerLuz(js, cfg);
  assert.deepEqual(r.cortes, [{ tension: "baja", localidad: "LLAVALLOL", usuarios: 3, lat: -34.79, lng: -58.42, normalizacion: null }]);
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

import { buscarParos } from "./fuentes.mjs";
test("colectivos: detecta paros del AMBA y descarta otras provincias", () => {
  const nota = (titular) => ({ titular, link: `https://x/${titular}`, fecha: new Date(), medio: "Diario" });
  const r = buscarParos([nota("La UTA anunció un paro de colectivos en el AMBA"), nota("Paro de colectivos en Córdoba"), nota("Tomó un colectivo y paró en seco")], cfg);
  assert.deepEqual(r.map((x) => x.titular), ["La UTA anunció un paro de colectivos en el AMBA"]);
});

import { leerObservacionSmn } from "./clima.mjs";
test("clima: lee Ezeiza del SMN y dice que llueve cuando la observación dice lluvia", () => {
  const txt = " Ezeiza;09-octubre-2026;20:00;Cubierto con lluvia;10 km;13;No se calcula; 87;Sudeste  13;1019.8 /\n";
  const o = leerObservacionSmn(txt, "Ezeiza", new Date("2026-10-09T23:20:00Z")); // 20:20 en Argentina
  assert.deepEqual([o.temp, o.sensacion, o.humedad, o.viento, o.icono, o.etiqueta, o.medidoEn], [13, null, 87, 13, "lluvia", "Lluvia", "20:00"]);
  assert.equal(leerObservacionSmn(txt, "Ezeiza", new Date("2026-10-10T03:00:00Z")), null); // observación de hace 7 h: no se usa
});

import { leerProgramados } from "./fuentes.mjs";
test("cortes programados: toma solo el partido (aunque Edesur escriba mal la localidad) y junta repetidos", () => {
  const corte = (localidad, lat, lng) => ({ fechaInicio: "10/10/2026 08:00:00", fechaFin: "10/10/2026 16:00:00", latitud: lat, longitud: lng, clientesAfectados: 16, motivo: "Pedido de instalacion para obras", localidad });
  const json = [corte("BANDFIELD", "-34.745", "-58.39"), corte("BANDFIELD", "-34.745", "-58.39"), corte("LANUS ESTE", "-34.70", "-58.38"), corte("DOMSELAAR", "-35.06", "-58.30")];
  const r = leerProgramados(json, cfg, new Date("2026-10-09T23:00:00Z"));
  assert.deepEqual(r.cortes.map((c) => [c.localidad, c.inicio, c.fin]), [["Banfield", "2026-10-10T08:00", "2026-10-10T16:00"]]);
});

import { armarFrase } from "./clima.mjs";
test("clima: la frase pone primero la lluvia, y sino lo más importante", () => {
  const h = (hora, o = {}) => ({ hora: `2026-10-11T${hora}:00`, lluvia: 0, mm: 0, codigo: 3, sensacion: 18, viento: 10, ...o });
  const dia = [h("10"), h("13", { lluvia: 90, mm: 1.5, codigo: 63 }), h("21", { lluvia: 50 })];
  const nublado = { icono: "nube" };
  assert.equal(armarFrase({ horas: dia, ahora: "2026-10-11T10:30", ahoraEstado: nublado }), "Llueve a la tarde, llevá paraguas");
  assert.equal(armarFrase({ horas: dia, ahora: "2026-10-11T10:30", ahoraEstado: { icono: "lluvia" } }), "Está lloviendo ahora, llevá paraguas");
  const frio = [h("10", { sensacion: 9 }), h("15", { sensacion: 11 })];
  assert.equal(armarFrase({ horas: frio, ahora: "2026-10-11T10:30", ahoraEstado: nublado }), "Hoy hace fresco, salí abrigado");
  assert.equal(armarFrase({ horas: [h("10")], ahora: "2026-10-11T10:30", ahoraEstado: nublado }), "Hoy no llueve");
});

import { esDeNoche, deNoche } from "./clima.mjs";
test("clima: de noche (entre la puesta y la salida del sol) el sol pasa a luna", () => {
  const sol = [{ fecha: "2026-10-11", sale: "06:35", pone: "19:12" }];
  assert.equal(esDeNoche(sol, "2026-10-11T22:00"), true);
  assert.equal(esDeNoche(sol, "2026-10-11T12:00"), false);
  assert.deepEqual([deNoche("sol"), deNoche("solnube"), deNoche("lluvia")], ["luna", "lunanube", "lluvia"]);
});

import { fraseLluvia, chanceFinal } from "./clima.mjs";
test("clima: la lluvia no exagera, no usa \"a la mañana\" y no enumera todo el día", () => {
  const h = (hora, lluvia, lluviaCap) => ({ hora: `2026-10-21T${hora}:00`, lluvia, lluviaCap });
  assert.equal(chanceFinal(90, 0), 29); // un solo pronóstico lo dice: escalón más bajo
  assert.equal(fraseLluvia([h("08", 5, 5), h("14", 45, 45)]), "Probable lluvia a la tarde");
  assert.equal(fraseLluvia([h("08", 50, 50), h("14", 45, 45), h("21", 40, 40)]), "Probable lluvia durante el día");
  assert.equal(fraseLluvia([h("08", 50, 50), h("14", 5, 5)]), "Probable lluvia temprano");
  assert.equal(fraseLluvia([h("14", 5, 45)]), "En Lomas no llueve. En Capital, probable lluvia a la tarde: llevá paraguas");
  assert.equal(fraseLluvia([h("14", 15, 15)]), "No se descartan chaparrones aislados");
});
