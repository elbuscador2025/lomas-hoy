// Las tareas de actualización: leen cada fuente (tren, luz, colectivos, subte, clima...) y le pasan el resultado a `guardar`.
// Las usan dos "cadetes": el despertador externo (el sitio, en /api/actualizar) y GitHub Actions (scripts/actualizar.mjs, de respaldo).
// Si una fuente falla, no se pisa el último dato bueno: solo se anota el error.
import { config as cfg } from "../lomas.config.mjs";
import { leerTren, leerLuz, leerRss, buscarParos, buscarAgua, leerProgramados, leerSubte, armarNoticias } from "./fuentes.mjs";
import { leerAlertas } from "./alertas.mjs";
import { leerListaCiudad, leerResultadoCiudad, leerProvincia, componerDias, leerQuiniCompleto, URL_CIUDAD, URL_CIUDAD_DATOS, URL_PROVINCIA, leerQuiniNacion, URL_QUINI_NACION, leerQuinielaNacion, URL_NACION } from "./quiniela.mjs";
import { leerPronostico, urlOpenMeteo, leerPron5d, leerZipSmn, URL_SMN_5DIAS } from "./clima.mjs";

const TIEMPO = 20000; // ninguna fuente puede demorar más que esto

async function traer(url, tipo) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (LomasHoy)" }, signal: AbortSignal.timeout(TIEMPO) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return tipo === "json" ? r.json() : r.text();
}

// guardar(clave, { contenido } | { error }) → guarda en el sitio. Devuelve cuántas fuentes fallaron.
export async function correrTareas({ guardar, env = process.env, log = console }) {
  // Los diarios se leen una sola vez por corrida: de ahí salen los paros de colectivos y las notas de cortes de agua.
  let diarios;
  const leerDiarios = () => (diarios ??= (async () => {
    const lista = cfg.colectivos.diarios;
    const lecturas = await Promise.allSettled(lista.map(async (d) => leerRss(await traer(d.url, "text"), d.medio)));
    const ok = lecturas.flatMap((l, i) => (l.status === "fulfilled" && l.value.length ? [lista[i].medio] : []));
    if (ok.length === 0) throw new Error("No se pudo leer ningún diario");
    return { notas: lecturas.flatMap((l) => (l.status === "fulfilled" ? l.value : [])), diariosLeidos: ok, diariosSinLeer: lista.map((d) => d.medio).filter((m) => !ok.includes(m)) };
  })());

  // Diarios locales (Lomas Conectado, Diario Lomas): se leen una sola vez por corrida; de ahí salen las Noticias de Lomas y también avisos de cortes de agua.
  let locales;
  const leerLocales = () => (locales ??= (async () => {
    const lista = cfg.noticias.diarios;
    const lecturas = await Promise.allSettled(lista.map(async (d) => leerRss(await traer(d.url, "text"), d.medio)));
    const ok = lista.filter((_, i) => lecturas[i].status === "fulfilled" && lecturas[i].value.length).map((d) => d.medio);
    if (!ok.length) throw new Error("No se pudo leer ningún diario local");
    return { notas: lecturas.flatMap((l) => (l.status === "fulfilled" ? l.value : [])), diariosLeidos: ok, diariosSinLeer: lista.map((d) => d.medio).filter((m) => !ok.includes(m)) };
  })());

  const tareas = {
    // Mascotas y Trueque: no traen datos; avisan al sitio para que baje lo vencido y mande los avisos de las 19 hs
    mascotas: async () => ({ ok: true }),
    // Fuentes de la lluvia: el modelo del SMN (pronóstico a 5 días) y Open-Meteo para Lomas y para Capital. Si el SMN o Capital fallan, sigue con lo que haya.
    pronostico: async () => {
      const [lomas, capital, smn] = await Promise.allSettled([
        traer(urlOpenMeteo(cfg), "json"),
        traer(urlOpenMeteo(cfg, cfg.clima.capital), "json"),
        fetch(URL_SMN_5DIAS, { headers: { "User-Agent": "Mozilla/5.0 (LomasHoy)" }, signal: AbortSignal.timeout(TIEMPO) }).then(async (r) => { if (!r.ok) throw new Error(`SMN ${r.status}`); return leerZipSmn(Buffer.from(await r.arrayBuffer())); }),
      ]);
      if (lomas.status !== "fulfilled") throw lomas.reason;
      const txt = smn.status === "fulfilled" ? smn.value : null;
      const extra = {
        capital: capital.status === "fulfilled" ? capital.value : null,
        smn: txt ? { lomas: leerPron5d(txt, cfg.clima.pronSmn.estacionLomas), capital: leerPron5d(txt, cfg.clima.pronSmn.estacionCapital) } : null,
      };
      for (const [n, r] of [["Capital", capital], ["SMN", smn]]) if (r.status !== "fulfilled") log.error(`pronostico: ${n} no respondió (${r.reason?.message})`);
      return { ...leerPronostico(lomas.value, extra), consultadoEn: new Date().toISOString() };
    },
    // Alertas oficiales del SMN (tormentas, lluvias, viento) que alcanzan a Lomas o a la Ciudad
    alertas: async () => leerAlertas((u) => traer(u, "text"), cfg),
    tren: async () => leerTren(await traer(cfg.tren.url, "text"), cfg),
    luz: async () => leerLuz(await traer(cfg.luz.url, "text"), cfg),
    programados: async () => leerProgramados(await traer(cfg.programados.url, "json"), cfg),
    // Sin clave todavía: se omite (el sitio muestra "Sin datos por ahora" en gris)
    subte: async () => {
      const { SUBTE_CLIENT_ID: id, SUBTE_CLIENT_SECRET: secreto } = env;
      if (!id || !secreto) return null;
      return leerSubte(await traer(`${cfg.subte.url}?json=1&client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(secreto)}`, "json"), cfg);
    },
    // Noticias de los diarios locales (solo título y enlace). Si un diario no responde, se muestran los otros.
    noticias: async () => {
      const d = await leerLocales();
      return { notas: armarNoticias([d.notas], cfg.noticias.maximo), diariosLeidos: d.diariosLeidos, diariosSinLeer: d.diariosSinLeer };
    },
    // Quiniela (Provincia y Nacional): hoy y el último día con sorteos, de la fuente oficial apenas lo publica; el diario (La Nación) solo respalda.
    quiniela: async () => {
      const hoy = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10); // fecha de hoy en Argentina
      // Lo oficial se lee primero y manda; el diario (La Nación) solo respalda lo que el sitio oficial no tiene o si no responde
      const [listaLeida, prov, nacP, nacN, nacS] = await Promise.all([
        traer(URL_CIUDAD, "text").then(leerListaCiudad).catch(() => []),
        traer(URL_PROVINCIA, "text").then(leerProvincia).catch(() => null),
        traer(URL_NACION.provincia, "text").then(leerQuinielaNacion).catch(() => null),
        traer(URL_NACION.nacional, "text").then(leerQuinielaNacion).catch(() => null),
        traer(URL_NACION.santafe, "text").then(leerQuinielaNacion).catch(() => null),
      ]);
      const lista = listaLeida;
      const ayer = [...new Set(lista.map((x) => x.fecha))].sort().filter((f) => f < hoy).pop();
      const leidos = await Promise.allSettled(lista.filter((x) => x.fecha === hoy || x.fecha === ayer).map(async (x) => [x.sorteo, leerResultadoCiudad(await traer(URL_CIUDAD_DATOS(x.sorteo), "text"))]));
      const resultados = Object.fromEntries(leidos.flatMap((l) => (l.status === "fulfilled" ? [l.value] : [])));
      const dias = componerDias({ lista, resultados, provinciaOficial: prov, externas: { provincia: nacP, nacional: nacN, santafe: nacS }, hoy });
      if (!dias.some((d) => Object.keys(d.sorteos).length)) throw new Error("No se pudo leer ninguna fuente de la quiniela");
      return { dias };
    },
    // Quini 6: el sitio oficial de Santa Fe (último sorteo y anterior); si no responde desde el servidor, La Nación (solo el último: el anterior lo guarda el sitio al cambiar el sorteo)
    quini6: async () => {
      const oficial = await Promise.race([leerQuiniCompleto(), new Promise((_, no) => setTimeout(() => no(new Error("tiempo")), 5000))]).catch(() => null);
      if (oficial?.length) return { sorteos: oficial, fuente: "Lotería de Santa Fe" };
      const q = leerQuiniNacion(await traer(URL_QUINI_NACION, "text"));
      if (!q) throw new Error("No se pudo leer el Quini 6");
      return { sorteos: [q], fuente: "La Nación (datos de Data Factory)" };
    },
    colectivos: async () => {
      const d = await leerDiarios();
      return { paros: buscarParos(d.notas, cfg), diariosLeidos: d.diariosLeidos, diariosSinLeer: d.diariosSinLeer };
    },
    // Cortes de agua: notas de los diarios nacionales y de los locales que anuncian un corte o falta de agua en Lomas o sus localidades
    agua: async () => {
      const [nac, loc] = await Promise.allSettled([leerDiarios(), leerLocales()]);
      if (nac.status === "rejected" && loc.status === "rejected") throw nac.reason;
      const notas = [...(nac.status === "fulfilled" ? nac.value.notas : []), ...(loc.status === "fulfilled" ? loc.value.notas : [])];
      const sinLeer = [...(nac.status === "fulfilled" ? nac.value.diariosSinLeer : cfg.colectivos.diarios.map((x) => x.medio)), ...(loc.status === "fulfilled" ? loc.value.diariosSinLeer : cfg.noticias.diarios.map((x) => x.medio))];
      return { noticias: buscarAgua(notas, cfg), diariosSinLeer: sinLeer };
    },
  };

  // Todas a la vez: así una fuente lenta no demora a las demás
  const activas = Object.entries(tareas).filter(([clave]) => (cfg.secciones[clave === "pronostico" ? "clima" : clave] ?? cfg[clave])?.activa);
  const resultados = await Promise.all(activas.map(async ([clave, tarea]) => {
    try {
      const contenido = await tarea();
      if (contenido === null) { log.log(`${clave}: sin clave, se omite`); return 0; }
      await guardar(clave, { contenido });
      log.log(`${clave}: ok`);
      return 0;
    } catch (e) {
      log.error(`${clave}: falló -> ${e.message}`);
      try { await guardar(clave, { error: e.message }); } catch {}
      return 1;
    }
  }));
  return resultados.reduce((a, b) => a + b, 0);
}
