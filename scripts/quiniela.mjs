// Quiniela y Quini 6: solo resultados. Reglas fijas, sin IA.
// Fuentes oficiales: Lotería de la Ciudad (sitio de la Quiniela: trae Nacional = "Ciudad" y también Provincia), Lotería de la Provincia de Buenos Aires
// (sus resultados del día, para comparar) y Lotería de Santa Fe (Quini 6). Provincia se muestra solo cuando las dos fuentes coinciden.

export const SORTEOS = [
  { id: "PREV", nombre: "Previa", hora: "10:15" },
  { id: "PRIM", nombre: "Primera", hora: "12:00" },
  { id: "MATU", nombre: "Matutina", hora: "15:00" },
  { id: "VESP", nombre: "Vespertina", hora: "18:00" },
  { id: "NOCT", nombre: "Nocturna", hora: "21:00" },
];
export const URL_CIUDAD = "https://quiniela.loteriadelaciudad.gob.ar/";
export const URL_CIUDAD_DATOS = (n) => `https://quiniela.loteriadelaciudad.gob.ar/includes/resultados-data.php?sorteo=${n}`;
export const URL_PROVINCIA = "https://loteria.gba.gob.ar/resultados";
export const URL_QUINI = "https://apps.loteriasantafe.gov.ar:8443/Extractos/paginas/mostrarQuini6.xhtml?display=0";

const sinTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const idDe = (nombre) => SORTEOS.find((s) => sinTildes(nombre).startsWith(s.nombre.toLowerCase().slice(0, 5)))?.id ?? null; // Previa, Primera, Matutina...

// Lista de sorteos que ya salieron según la Lotería de la Ciudad: "26/10/2026 - 21:00 - Sorteo Nº 53086 - NOCTURNA"
export function leerListaCiudad(html) {
  return [...html.matchAll(/data-value='(\d+)'>\s*(\d{2})\/(\d{2})\/(\d{4}) - (\d{2}:\d{2}) - Sorteo N[ºo°] ?\d+ - ([A-ZÁÉÍÓÚ]+)/gi)]
    .map((m) => ({ sorteo: Number(m[1]), fecha: `${m[4]}-${m[3]}-${m[2]}`, hora: m[5], id: idDe(m[6]) }))
    .filter((x) => x.id);
}

const veinte = (numeros) => {
  const l = (numeros ?? []).sort((a, b) => Number(a.pos) - Number(b.pos)).map((n) => String(n.val).padStart(4, "0"));
  return l.length === 20 && l.every((v) => /^\d{4}$/.test(v)) ? l : null;
};
// Un sorteo según la Ciudad: Nacional = jurisdicción 51 (Ciudad de Buenos Aires), Provincia = jurisdicción 53
export function leerResultadoCiudad(js) {
  const j = JSON.parse(js.match(/=\s*(\[[\s\S]*\])\s*;/)[1]); // el archivo trae después otra línea (el pozo): se toma solo la lista de resultados
  const x = j[0];
  const jur = x?.jurisdicciones ?? {};
  return { sorteo: x?.sorteo, nacional: veinte(jur["51"]?.numeros), provincia: veinte(jur["53"]?.numeros) };
}

// Los resultados del día que publica la Lotería de la Provincia ("----" = todavía no salió)
export function leerProvincia(html) {
  const fecha = html.match(/class="fechaSorteo">\s*(\d{2})\/(\d{2})\/(\d{4})/);
  const sorteos = {};
  for (const m of html.matchAll(/<h3>\s*Quiniela\s+([^<]+?)\s*<i[\s\S]*?class="bolillas">([\s\S]*?)(?=<div class="sorteo|<div class="contenedorExtractos)/g)) {
    const id = idDe(m[1].replace(/^(La|El)\s+/i, ""));
    if (!id) continue;
    const pares = [...m[2].matchAll(/<span>(\d{2})<\/span>\s*<span>([^<]*)<\/span>/g)].map((p) => ({ pos: p[1], val: p[2].trim() }));
    sorteos[id] = pares.length === 20 && pares.every((p) => /^\d{1,4}$/.test(p.val)) ? veinte(pares) : null;
  }
  return { fecha: fecha ? `${fecha[3]}-${fecha[2]}-${fecha[1]}` : null, sorteos };
}

// Arma los días: hoy y el último día anterior con sorteos (los domingos no hay). Provincia de hoy solo si las dos fuentes coinciden.
export function componerDias({ lista, resultados, provinciaHoy, hoy }) {
  const dias = [];
  const fechas = [...new Set(lista.map((x) => x.fecha))].sort();
  const ayer = fechas.filter((f) => f < hoy).pop();
  for (const fecha of [ayer, hoy].filter(Boolean)) {
    const sorteos = {};
    for (const s of SORTEOS) {
      const l = lista.find((x) => x.fecha === fecha && x.id === s.id);
      const r = l && resultados[l.sorteo];
      if (!r) continue;
      let provincia = r.provincia;
      if (fecha === hoy) { // la segunda fuente: la propia Lotería de la Provincia
        const p = provinciaHoy?.fecha === hoy ? provinciaHoy.sorteos[s.id] : null;
        if (!p || !provincia || p.join() !== provincia.join()) provincia = null;
      }
      sorteos[s.id] = { hora: l.hora, nacional: r.nacional, provincia };
    }
    dias.push({ fecha, sorteos });
  }
  return dias;
}

// ---- Quini 6 (Lotería de Santa Fe) ----
const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const textoPlano = (h) => h.replace(/<!\[CDATA\[|\]\]>/g, " ").replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
export const opcionesQuini = (html, campo) => [...html.matchAll(new RegExp(`<select id="form:${campo}_input"[\\s\\S]*?</select>`, "g"))]
  .flatMap((s) => [...s[0].matchAll(/<option value="([^"]+)"/g)].map((o) => o[1]));
const MODALIDADES = [["Tradicional", /Tradicional Primer Sorteo((?: \d{2}){6})/], ["La Segunda", /Tradicional La Segunda del Quini((?: \d{2}){6})/], ["Revancha", /Revancha((?: \d{2}){6})/], ["Siempre Sale", /Siempre Sale((?: \d{2}){6})/]];
// El sorteo que muestra la página: modalidades con sus 6 números. "mes" = "Octubre 2026"; "etiqueta" = "Domingo 25 - 3420"
export function leerQuini(html, etiqueta, mes) {
  const t = textoPlano(html);
  const modalidades = MODALIDADES.map(([nombre, rx]) => ({ nombre, numeros: t.match(rx)?.[1].trim().split(" ") ?? null })).filter((m) => m.numeros);
  const e = etiqueta.match(/(\d{1,2}) - (\d+)/), mm = mes.match(/([A-Za-zéÉ]+) (\d{4})/);
  if (!e || !mm || !MESES[sinTildes(mm[1])] || modalidades.length < 4) return null; // si falta alguna modalidad, no se muestra
  return { sorteo: Number(e[2]), fecha: `${mm[2]}-${String(MESES[sinTildes(mm[1])]).padStart(2, "0")}-${e[1].padStart(2, "0")}`, modalidades };
}

// Pide el último sorteo del Quini 6 y el anterior (la página de Santa Fe es JSF: hay que mandar el formulario para cambiar de sorteo).
export async function leerQuiniCompleto(traerPagina = fetch) {
  const ua = { "User-Agent": "Mozilla/5.0 (LomasHoy)" };
  const r = await traerPagina(URL_QUINI, { headers: ua, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Santa Fe ${r.status}`);
  const cookie = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  const html = await r.text();
  const viewState = html.match(/name="javax\.faces\.ViewState"[^>]*value="([^"]+)"/)?.[1];
  const meses = opcionesQuini(html, "mesSeleccionado"), sorteos = opcionesQuini(html, "sorteoSeleccionado");
  if (!viewState || !meses.length || !sorteos.length) throw new Error("Formato del Quini 6 no reconocido");
  const cambiar = async (campo, valor, mes, sorteo) => {
    const body = new URLSearchParams({
      "javax.faces.partial.ajax": "true", "javax.faces.source": `form:${campo}`, "javax.faces.partial.execute": `form:${campo}`, "javax.faces.partial.render": "form",
      "javax.faces.behavior.event": "change", "javax.faces.partial.event": "change", form: "form",
      "form:mesSeleccionado_input": mes, "form:sorteoSeleccionado_input": sorteo, [`form:${campo}_input`]: valor, "javax.faces.ViewState": viewState,
    });
    const x = await traerPagina(URL_QUINI, { method: "POST", headers: { ...ua, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "Faces-Request": "partial/ajax", Cookie: cookie }, body, signal: AbortSignal.timeout(20000) });
    if (!x.ok) throw new Error(`Santa Fe ${x.status}`);
    return x.text();
  };
  const ultimo = leerQuini(html, sorteos[0], meses[0]);
  if (!ultimo) throw new Error("No se pudo leer el último Quini 6");
  let anterior = null;
  try {
    if (sorteos[1]) anterior = leerQuini(await cambiar("sorteoSeleccionado", sorteos[1], meses[0], sorteos[1]), sorteos[1], meses[0]);
    else if (meses[1]) { // era el primer sorteo del mes: el anterior es el último del mes anterior
      const h2 = await cambiar("mesSeleccionado", meses[1], meses[1], sorteos[0]);
      const s2 = opcionesQuini(h2, "sorteoSeleccionado");
      if (s2[0]) anterior = leerQuini(h2, s2[0], meses[1]);
    }
  } catch {}
  return [ultimo, anterior].filter(Boolean);
}
