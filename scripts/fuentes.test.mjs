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
test("clima: la frase tiene dos renglones, hoy (o esta noche) y mañana", () => {
  const h = (dia, hora, o = {}) => ({ hora: `2026-10-${dia}T${hora}:00`, lluvia: 0, lluviaCap: 0, mm: 0, codigo: 3, sensacion: 18, viento: 10, ...o });
  const nublado = { icono: "nube" };
  // 11 hs del 11: hoy llueve a la tarde (90%), mañana llueve a la tarde
  const dia = [h(11, "10"), h(11, "13", { lluvia: 90, lluviaCap: 90 }), h(11, "21"), h(12, "08"), h(12, "14", { lluvia: 80, lluviaCap: 80 }), h(12, "21")];
  assert.equal(armarFrase({ horas: dia, ahora: "2026-10-11T10:30", ahoraEstado: nublado }), "Hoy: lluvia a la tarde, llevá paraguas\nMañana: lluvia a la tarde, llevá paraguas");
  assert.equal(armarFrase({ horas: dia, ahora: "2026-10-11T10:30", ahoraEstado: { icono: "lluvia" } }), "Hoy: está lloviendo ahora, llevá paraguas\nMañana: lluvia a la tarde, llevá paraguas");
  // 21 hs: "Esta noche" y "Mañana"
  assert.equal(armarFrase({ horas: dia, ahora: "2026-10-11T21:10", ahoraEstado: nublado }), "Esta noche: sin lluvias\nMañana: lluvia a la tarde, llevá paraguas");
  // sin lluvia ni hoy ni mañana: un solo renglón (con el aviso de frío si corresponde)
  const seco = [h(11, "10", { sensacion: 9 }), h(11, "15", { sensacion: 11 }), h(12, "10"), h(12, "15")];
  assert.equal(armarFrase({ horas: seco, ahora: "2026-10-11T10:30", ahoraEstado: nublado }), "Hoy y mañana sin lluvias, hace fresco, salí abrigado");
  assert.equal(armarFrase({ horas: [h(11, "10"), h(12, "10")], ahora: "2026-10-11T10:30", ahoraEstado: nublado }), "Hoy y mañana sin lluvias");
  // si en Capital es peor, se agrega corto; chaparrones aislados es el escalón más bajo; y nunca "a la mañana"
  const cap = [h(11, "14", { lluvia: 5, lluviaCap: 45 }), h(12, "08", { lluvia: 15, lluviaCap: 15 })];
  assert.equal(armarFrase({ horas: cap, ahora: "2026-10-11T10:30", ahoraEstado: nublado }), "Hoy: sin lluvias · Capital: probable lluvia a la tarde\nMañana: chaparrones aislados");
  assert.ok(!/a la mañana/.test(armarFrase({ horas: [h(12, "08", { lluvia: 90, lluviaCap: 90 })], ahora: "2026-10-11T10:30", ahoraEstado: nublado })));
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

import { leerAlertas } from "./alertas.mjs";
test("alertas SMN: junta las zonas del mismo aviso, ignora las vencidas y las reemplazadas", async () => {
  const cap = (id, refs, poligono, onset, expires, sev = "Moderate") => `<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>${id}</identifier><status>Actual</status><msgType>Update</msgType><references>${refs}</references><info><event>Tormentas</event><severity>${sev}</severity><onset>${onset}</onset><expires>${expires}</expires><description>d</description><instruction>1- Evitá salir.</instruction><area><polygon>${poligono}</polygon></area></info></alert>`;
  const caja = (a, b, c, d) => `${a},${c} ${a},${d} ${b},${d} ${b},${c} ${a},${c}`; // lat1,lng1 ...
  const lomas = caja(-34.9, -34.6, -58.6, -58.2), capital = caja(-34.65, -34.5, -58.6, -58.3);
  const feed = `RSS CAP <a href="https://x/xml_generados/CAP_20261022091000_Tormenta_Llanura_alertas_1.xml">a</a><a href="https://x/xml_generados/CAP_20261022091000_Tormenta_Llanura_alertas_2.xml">b</a><a href="https://x/xml_generados/CAP_20261022091000_Tormenta_Llanura_alertas_3.xml">c</a><a href="https://x/xml_generados/CAP_20261022091000_Tormenta_Llanura_alertas_4.xml">d</a>`;
  const archivos = {
    "1": cap("id1", "", lomas, "2026-10-22T21:00:00-03:00", "2026-10-23T02:59:59-03:00"),
    "2": cap("id2", "", capital, "2026-10-22T21:00:00-03:00", "2026-10-23T02:59:59-03:00"),
    "3": cap("id3", "", lomas, "2026-10-22T09:00:00-03:00", "2026-10-22T18:00:00-03:00"), // vencida (son las 20)
    "4": cap("id4", "smn,id1,2026-10-22T09:00:00-03:00", lomas, "2026-10-22T22:00:00-03:00", "2026-10-23T03:59:59-03:00"), // actualiza al id1
  };
  const traer = async (u) => (u.endsWith("AR.php") ? feed : archivos[u.match(/alertas_(\d)\.xml/)[1]]);
  const r = await leerAlertas(traer, { alertas: { url: "https://x/AR.php", horasAtras: 48, puntos: [{ nombre: "Lomas de Zamora", lat: -34.76, lng: -58.4 }, { nombre: "Capital", lat: -34.6, lng: -58.38 }] } }, new Date("2026-10-22T23:00:00Z")); // 20:00 en Argentina
  assert.deepEqual(r.alertas.map((a) => [a.id, a.zonas.join("+"), a.desde, a.hasta]), [["id4", "Lomas de Zamora", "2026-10-22T22:00", "2026-10-23T03:59"], ["id2", "Capital", "2026-10-22T21:00", "2026-10-23T02:59"]]);
});

import { leerEstacionesSmn } from "./clima.mjs";
test("clima: la temperatura de ahora es el promedio de las estaciones con datos de menos de 1 hora", () => {
  const txt = [" Ezeiza;23-octubre-2026;18:00;Parcialmente nublado;10 km;21;No se calcula; 50;Sur  9;1010 /", " Morón;23-octubre-2026;18:00;Algo nublado;10 km;24;No se calcula; 45;Sur  14;1009 /",
    " Buenos Aires;23-octubre-2026;18:00;Algo nublado;10 km;25;No se calcula; 44;Sur  11;1009 /", " El Palomar;23-octubre-2026;15:00;Despejado;10 km;30;No se calcula; 40;Sur  13;1011 /"].join("\n");
  const o = leerEstacionesSmn(txt, ["Ezeiza", "El Palomar", "Morón", "Buenos Aires"], new Date("2026-10-23T21:10:00Z")); // 18:10 en Argentina; El Palomar tiene 3 horas: no entra
  assert.deepEqual([o.temp, o.estaciones, o.etiqueta], [23.3, ["Ezeiza", "Morón", "Buenos Aires"], "Parcialmente nublado"]);
  assert.equal(leerEstacionesSmn(txt, ["Ezeiza", "El Palomar"], new Date("2026-10-23T21:10:00Z")), null); // con una sola estación vigente no alcanza
});

import { armarNoticias } from "./fuentes.mjs";
test("noticias: mezcla los diarios, la más nueva arriba, sin repetidos ni enlaces raros, y baja los títulos en mayúsculas", () => {
  const n = (titular, link, fecha, medio) => ({ titular, link, fecha: new Date(fecha), medio });
  const r = armarNoticias([
    [n("AYSA QUIERE SUBIR LA TARIFA", "https://a.com/1", "2026-10-26T13:00:00Z", "A"), n("Nota vieja", "https://a.com/2", "2026-10-25T10:00:00Z", "A"), n("Repetida", "javascript:alert(1)", "2026-10-26T12:00:00Z", "A")],
    [n("Nota de B", "https://b.com/1", "2026-10-26T14:00:00Z", "B"), n("Nota vieja", "https://a.com/2", "2026-10-25T10:00:00Z", "B"), n("", "https://b.com/2", "2026-10-26T14:00:00Z", "B")],
  ]);
  assert.deepEqual(r.map((x) => [x.titulo, x.medio]), [["Nota de B", "B"], ["Aysa quiere subir la tarifa", "A"], ["Nota vieja", "A"]]);
});

import { buscarAgua } from "./fuentes.mjs";
import { config as cfgAgua } from "../lomas.config.mjs";
test("agua: solo notas que anuncian un corte o falta de agua en Lomas o sus localidades", () => {
  const ahora = new Date("2026-10-26T15:00:00Z");
  const n = (titular, medio = "Diario Lomas") => ({ titular, link: `https://x.com/${encodeURIComponent(titular)}`, fecha: new Date("2026-10-26T04:00:00Z"), medio });
  const r = buscarAgua([
    n("AySA anunció cortes de agua en Lomas de Zamora: días y zonas afectadas"),
    n("Barrio sin agua hace 4 días en Llavallol"),
    n("AySA quiere subir un 22% la tarifa en todo el AMBA"),
    n("AySA: aumento de la tarifa y cortes de agua en Lomas"),
    n("Vecinos de Lomas reclaman por una obra de AySA"),
    n("Corte de agua en Córdoba"),
  ], cfgAgua, ahora);
  assert.deepEqual(r.map((x) => x.localidad), ["Lomas de Zamora", "Llavallol"]);
});

import { textoDeNota, barriosEnTexto, cuandoEnTexto } from "./fuentes.mjs";
test("agua: barrios de Lomas y horario que nombra la nota completa", () => {
  const html = `<html><nav>Lomas Banfield</nav><article><p>Zonas de Lomas de Zamora y Temperley podrían tener cortes.</p><p>El martes 27, de 8 a 12, en Villa Lamadrid y Banfield Oeste. También Lanús y Almirante Brown.</p><p>Afectaría a Budge y Lomas centro.</p></article><aside>Lomas: retiro de muebles</aside></html>`;
  const t = textoDeNota(html);
  assert.deepEqual(barriosEnTexto(t, cfgAgua), ["Temperley", "Villa Lamadrid", "Banfield", "Ingeniero Budge", "Lomas"]);
  assert.equal(cuandoEnTexto(t), "martes 27 de 8 a 12 hs");
  assert.equal(cuandoEnTexto("Habrá corte en Lanús"), null);
  assert.deepEqual(barriosEnTexto("Corte en Lanús y Esteban Echeverría", cfgAgua), []);
});

import { leerListaCiudad, leerResultadoCiudad, leerProvincia, componerDias, leerQuini } from "./quiniela.mjs";
test("quiniela: sale apenas lo publica la fuente oficial, sin esperar a nadie", () => {
  const lista = leerListaCiudad("<li class='custom-option' data-value='5'>27/10/2026 - 10:15 - Sorteo Nº 5 - PREVIA</li><li class='custom-option' data-value='4'>26/10/2026 - 21:00 - Sorteo Nº 4 - NOCTURNA</li><li class='custom-option' data-value='3'>24/10/2026 - 21:00 - Sorteo Nº 3 - NOCTURNA</li>");
  assert.deepEqual(lista.map((x) => [x.sorteo, x.fecha, x.hora, x.id]), [[5, "2026-10-27", "10:15", "PREV"], [4, "2026-10-26", "21:00", "NOCT"], [3, "2026-10-24", "21:00", "NOCT"]]);
  const nums = (base) => Array.from({ length: 20 }, (_, i) => ({ pos: String(i + 1).padStart(2, "0"), val: String(base + i).padStart(4, "0") }));
  const js = (n, base, fecha = ({ 5: "27/10/2026", 4: "26/10/2026", 3: "24/10/2026" })[n]) => "window.RESULTADOS_DATA = " + JSON.stringify([{ sorteo: n, fecha, jurisdicciones: { 51: { numeros: nums(base) }, 53: { numeros: nums(base + 100) }, 72: { numeros: nums(base + 200) } } }]) + ";window.POZO_ULTIMO_SORTEO = 0";
  const resultados = { 5: leerResultadoCiudad(js(5, 1000)), 4: leerResultadoCiudad(js(4, 2000)), 3: leerResultadoCiudad(js(3, 3000)) };
  const spans = (base) => nums(base).map((n) => "<div><span>" + n.pos + "</span><span>" + n.val + "</span></div>").join("");
  const html = (base) => '<div class="sorteo"><h3>Quiniela La Previa<i class="x"></i></h3><div class="datosSorteo"><p class="fechaSorteo">27/10/2026</p><div class="bolillas">' + spans(base) + '</div></div></div><div class="contenedorExtractos"></div>';
  const hoy = "2026-10-27";
  let dias = componerDias({ lista, resultados, hoy });
  assert.deepEqual(dias.map((d) => d.fecha), ["2026-10-26", "2026-10-27"]); // ayer = el último día con sorteos antes de hoy
  assert.deepEqual([dias[1].sorteos.PREV.provincia[0], dias[1].sorteos.PREV.nacional[0], dias[1].sorteos.PREV.santafe[0], dias[0].sorteos.NOCT.provincia[0]], ["1100", "1000", "1200", "2100"]);
  // Si la Lotería de la Provincia ya lo publicó, manda su resultado; mientras muestre "----", se usa la Ciudad
  dias = componerDias({ lista, resultados, provinciaOficial: leerProvincia(html(5555)), hoy });
  assert.equal(dias[1].sorteos.PREV.provincia[0], "5555");
  dias = componerDias({ lista, resultados, provinciaOficial: leerProvincia(html(1100).replace(/<span>11\d\d<\/span>/g, "<span>----</span>")), hoy });
  assert.equal(dias[1].sorteos.PREV.provincia[0], "1100");
  dias = componerDias({ lista: [], resultados: {}, hoy }); // sin datos: nada inventado
  assert.deepEqual(dias.map((d) => Object.keys(d.sorteos).length), [0]);
});
test("quini 6: lee las 4 modalidades con sus 6 números y la fecha del sorteo", () => {
  const html = "<div>Tradicional Primer Sorteo 00 02 03 08 19 39 Premio</div><div>Tradicional La Segunda del Quini 08 25 30 36 43 45 Premio</div><div>Revancha 05 22 23 29 41 43 Premio</div><div>Siempre Sale 00 13 22 24 40 43 Premio</div>";
  const q = leerQuini(html, "Domingo 25 - 3420", "Octubre 2026");
  assert.deepEqual([q.sorteo, q.fecha, q.modalidades.map((m) => m.nombre), q.modalidades[0].numeros], [3420, "2026-10-25", ["Tradicional", "La Segunda", "Revancha", "Siempre Sale"], ["00", "02", "03", "08", "19", "39"]]);
  assert.equal(leerQuini(html.replace("Revancha 05 22 23 29 41 43", ""), "Domingo 25 - 3420", "Octubre 2026"), null);
});

import { sorteosDe, QUINIELAS } from "./quiniela.mjs";
test("quinielas: las 6 en orden, Montevideo con menos sorteos y 3 cifras", () => {
  assert.deepEqual(QUINIELAS.map((q) => q.nombre), ["Nacional", "Provincia", "Santa Fe", "Córdoba", "Entre Ríos", "Montevideo"]);
  assert.equal(sorteosDe("provincia", "2026-10-27").length, 5);
  assert.deepEqual(sorteosDe("montevideo", "2026-10-26").map((s) => s.id), ["MATU", "NOCT"]); // lunes
  assert.deepEqual(sorteosDe("montevideo", "2026-10-24").map((s) => s.id), ["NOCT"]); // sábado: solo a las 21
  const js = "window.RESULTADOS_DATA = " + JSON.stringify([{ sorteo: 1, jurisdicciones: { 0: { numeros: Array.from({ length: 20 }, (_, i) => ({ pos: String(i + 1).padStart(2, "0"), val: String(1876 + i) })) }, 55: { numeros: Array.from({ length: 20 }, (_, i) => ({ pos: String(i + 1).padStart(2, "0"), val: String(3342 + i) })) } } }]) + ";";
  const r = leerResultadoCiudad(js);
  assert.deepEqual([r.montevideo[0], r.cordoba[0], r.entrerios], ["876", "3342", null]);
});

import { controlarYComponer, controlarQuini } from "./quiniela.mjs";
test("control básico de la quiniela: 20 números de 4 cifras y la fecha del día; si no cierra, no se muestra", () => {
  const lista = leerListaCiudad("<li data-value='5'>27/10/2026 - 10:15 - Sorteo Nº 5 - PREVIA</li><li data-value='4'>26/10/2026 - 21:00 - Sorteo Nº 4 - NOCTURNA</li>");
  const nums = (base, n = 20) => Array.from({ length: n }, (_, i) => ({ pos: String(i + 1).padStart(2, "0"), val: String(base + i).padStart(4, "0") }));
  const js = (n, fecha, jur) => "window.RESULTADOS_DATA = " + JSON.stringify([{ sorteo: n, fecha, jurisdicciones: jur }]) + ";";
  const bien = (base) => ({ 51: { numeros: nums(base) }, 53: { numeros: nums(base + 100) } });
  const hoy = "2026-10-27";
  let r = controlarYComponer({ lista, resultados: { 5: leerResultadoCiudad(js(5, "27/10/2026", bien(1000))), 4: leerResultadoCiudad(js(4, "26/10/2026", bien(2000))) }, hoy });
  assert.deepEqual([r.controles.length, r.dias[1].sorteos.PREV.nacional[0]], [0, "1000"]);
  // 19 números: no se muestra
  r = controlarYComponer({ lista, resultados: { 5: leerResultadoCiudad(js(5, "27/10/2026", { 51: { numeros: nums(1000, 19) }, 53: { numeros: nums(1100) } })), 4: leerResultadoCiudad(js(4, "26/10/2026", bien(2000))) }, hoy });
  assert.deepEqual([r.dias[1].sorteos.PREV.nacional, r.dias[1].sorteos.PREV.provincia[0], r.controles.map((c) => c.quiniela + " " + c.sorteo)], [null, "1100", ["Nacional Previa"]]);
  // números de 5 cifras: no se muestra
  r = controlarYComponer({ lista, resultados: { 5: leerResultadoCiudad(js(5, "27/10/2026", { 51: { numeros: nums(10000) }, 53: { numeros: nums(1100) } })), 4: leerResultadoCiudad(js(4, "26/10/2026", bien(2000))) }, hoy });
  assert.equal(r.dias[1].sorteos.PREV.nacional, null);
  // fecha distinta a la del día: no se muestra
  r = controlarYComponer({ lista, resultados: { 5: leerResultadoCiudad(js(5, "26/10/2026", bien(1000))), 4: leerResultadoCiudad(js(4, "26/10/2026", bien(2000))) }, hoy });
  assert.deepEqual([r.dias[1].sorteos.PREV, r.controles.filter((m) => /fecha/.test(m.motivo)).length], [undefined, 2]);
});
test("control básico del Quini 6: 6 números distintos entre 00 y 45 y fecha no futura", () => {
  const q = (fecha, nums) => ({ sorteo: null, fecha, modalidades: ["Tradicional", "La Segunda", "Revancha", "Siempre Sale"].map((nombre) => ({ nombre, numeros: nums })) });
  const ok = ["00", "02", "03", "08", "19", "39"];
  assert.equal(controlarQuini(q("2026-10-25", ok), "2026-10-27").ok, true);
  assert.match(controlarQuini(q("2026-10-25", ["00", "02", "03", "08", "19"]), "2026-10-27").motivo, /6 números/);
  assert.match(controlarQuini(q("2026-10-25", ["00", "02", "03", "08", "19", "46"]), "2026-10-27").motivo, /fuera de 00 a 45/);
  assert.match(controlarQuini(q("2026-10-25", ["00", "02", "03", "08", "19", "19"]), "2026-10-27").motivo, /repetidos/);
  assert.match(controlarQuini(q("2026-10-29", ok), "2026-10-27").motivo, /futura/);
});
