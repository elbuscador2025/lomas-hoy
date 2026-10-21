// Las tareas de actualización: leen cada fuente (tren, luz, colectivos, subte, clima...) y le pasan el resultado a `guardar`.
// Las usan dos "cadetes": el despertador externo (el sitio, en /api/actualizar) y GitHub Actions (scripts/actualizar.mjs, de respaldo).
// Si una fuente falla, no se pisa el último dato bueno: solo se anota el error.
import { config as cfg } from "../lomas.config.mjs";
import { leerTren, leerLuz, leerRss, buscarParos, buscarAgua, leerProgramados, leerSubte } from "./fuentes.mjs";
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
    tren: async () => leerTren(await traer(cfg.tren.url, "text"), cfg),
    luz: async () => leerLuz(await traer(cfg.luz.url, "text"), cfg),
    programados: async () => leerProgramados(await traer(cfg.programados.url, "json"), cfg),
    // Sin clave todavía: se omite (el sitio muestra "Sin datos por ahora" en gris)
    subte: async () => {
      const { SUBTE_CLIENT_ID: id, SUBTE_CLIENT_SECRET: secreto } = env;
      if (!id || !secreto) return null;
      return leerSubte(await traer(`${cfg.subte.url}?json=1&client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(secreto)}`, "json"), cfg);
    },
    colectivos: async () => {
      const d = await leerDiarios();
      return { paros: buscarParos(d.notas, cfg), diariosLeidos: d.diariosLeidos, diariosSinLeer: d.diariosSinLeer };
    },
    agua: async () => {
      const d = await leerDiarios();
      return { noticias: buscarAgua(d.notas, cfg), diariosSinLeer: d.diariosSinLeer };
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
