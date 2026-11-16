// Lee el Padrón Oficial de Establecimientos Educativos (Ministerio de Educación de la Nación, Relevamiento Anual) y se queda solo con Lomas de Zamora.
// Fuente oficial: https://www.argentina.gob.ar/educacion/evaluacion-informacion-educativa/padron-oficial-de-establecimientos-educativos
// Este archivo no depende de nada de la app (solo de fflate), así lo usan igual el panel y el script de carga.
import { unzipSync } from "fflate";

export const URL_PADRON = "https://www.argentina.gob.ar/educacion/evaluacion-informacion-educativa/padron-oficial-de-establecimientos-educativos";
export type Nivel = "Inicial" | "Primaria" | "Secundaria" | "Técnica" | "Especial" | "Adultos" | "Terciario";
export type Escuela = { id: string; nombre: string; sector: "Estatal" | "Privada"; niveles: Nivel[]; direccion: string; barrio: string; telefono: string };
export type ResultadoPadron = { escuelas: Escuela[]; fuente: string; anio: string; total: number };

const DEPARTAMENTO = "Lomas de Zamora";
const decodificar = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");
const colNum = (c: string) => [...c].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);

const limpiarEspacios = (s: string) => s.replace(/\s+/g, " ").trim();

// Los nombres y direcciones del padrón vienen en mayúsculas o mezclados: se pasan a "Inicial en mayúscula", dejando las siglas y los números como están
const SIGLAS = new Set(["EP", "EPB", "EES", "ESB", "ES", "ESA", "EEST", "EET", "ET", "EEE", "EEM", "EM", "EMTP", "ESRN", "JI", "JIN", "JII", "JMI", "CEA", "CEBAS", "CEB", "CENS", "CFP", "CIIE", "CEC", "CEPT", "ISFD", "ISFT", "IES", "ISP", "INET", "FP", "SNU", "UNLZ", "UNLP", "UTN", "UBA", "CABA", "SA", "SRL", "SAIC", "SACIFI", "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII"]);
const MINUSCULAS = new Set(["e/", "de", "del", "la", "las", "los", "el", "y", "e", "en", "a", "al", "por", "con", "para"]);
const palabraLinda = (p: string, primera: boolean): string => {
  const m = /^([^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]*)(.*?)([^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]*)$/.exec(p) ?? [];
  const pre = m[1] ?? "", core = m[2] ?? p, post = m[3] ?? "";
  if (!core) return p;
  if (/^(?:[A-Za-z]\.){1,6}[A-Za-z]?$/.test(core)) return pre + core.toUpperCase() + post; //
  if (core.includes(".") && !/\d/.test(core)) return pre + core.split(".").filter(Boolean).map((x) => palabraLinda(x, primera)).join(". ") + post; //
  if (/\d/.test(core)) return pre + core + post; //
  if (/^[Nn][°º]$/.test(core)) return pre + "N°" + post;
  if (SIGLAS.has(core.toUpperCase())) return pre + core.toUpperCase() + post;
  const baja = core.toLowerCase();
  if (!primera && MINUSCULAS.has(baja)) return pre + baja + post;
  if (core !== core.toUpperCase() && core !== baja) return pre + core + post; //
  return pre + baja.charAt(0).toUpperCase() + baja.slice(1) + post;
};
const linda = (s: string) => limpiarEspacios(s.replace(/\bE\/\s*/gi, "e/ ")).split(" ").map((p, i) => palabraLinda(p, i === 0)).join(" ").replace(/N[°º]\s*(\d)/g, "N°$1"); //
const nombreLindo = linda;

// Teléfono: código de área + número; si hay varios se toma el primero. "011" + "4282-7587" → "011 4282-7587"
function telefonoLindo(area: string, tel: string) {
  const primero = limpiarEspacios(tel.split(/[\/;,]| y /i)[0] ?? "");
  const digitos = primero.replace(/\D/g, "");
  if (digitos.length < 6) return "";
  const a = limpiarEspacios(area).replace(/\D/g, "");
  const local = digitos.length >= 10 ? digitos : (a ? a + digitos : digitos);
  return local;
}

export function leerPadron(xlsx: Uint8Array, fuente: string): ResultadoPadron {
  const archivos = unzipSync(xlsx, { filter: (f) => f.name === "xl/sharedStrings.xml" || f.name === "xl/worksheets/sheet1.xml" });
  const td = new TextDecoder("utf-8");
  const compartidas = td.decode(archivos["xl/sharedStrings.xml"]);
  const textos: string[] = [];
  for (let i = compartidas.indexOf("<si>"); i >= 0; i = compartidas.indexOf("<si>", i + 4)) {
    const fin = compartidas.indexOf("</si>", i);
    const bloque = compartidas.slice(i, fin);
    let t = "";
    for (let j = bloque.indexOf("<t"); j >= 0; j = bloque.indexOf("<t", j + 2)) {
      const ini = bloque.indexOf(">", j) + 1;
      t += bloque.slice(ini, bloque.indexOf("</t>", ini));
    }
    textos.push(decodificar(t));
  }
  const anio = /Relevamiento Anual (\d{4})/.exec(textos.find((x) => /Relevamiento Anual \d{4}/.test(x)) ?? "")?.[1] ?? "";
  const hoja = td.decode(archivos["xl/worksheets/sheet1.xml"]);
  const filas = new Map<string, string>(); // id → ... (solo las del partido)
  const escuelas: Escuela[] = [];
  const idsDepto = textos.flatMap((x, k) => (limpiarEspacios(x).toUpperCase() === DEPARTAMENTO.toUpperCase() ? [k] : []));
  let leidas = 0;
  for (let i = hoja.indexOf("<row "); i >= 0; i = hoja.indexOf("<row ", i + 5)) {
    const fin = hoja.indexOf("</row>", i);
    if (fin < 0) break;
    const fila = hoja.slice(i, fin);
    leidas++;
    if (!idsDepto.some((k) => fila.includes(`<v>${k}</v>`))) continue;
    const celdas: Record<number, string> = {};
    for (let c = fila.indexOf("<c "); c >= 0; c = fila.indexOf("<c ", c + 3)) {
      const finC = fila.indexOf("</c>", c), autoCierre = fila.indexOf("/>", c);
      if (autoCierre >= 0 && (finC < 0 || autoCierre < finC) && fila.slice(c, autoCierre).indexOf(">") === -1) continue; // celda vacía
      const cab = fila.slice(c, fila.indexOf(">", c));
      const ref = /r="([A-Z]+)\d+"/.exec(cab)?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(fila.slice(c, finC < 0 ? undefined : finC))?.[1];
      if (!ref || v === undefined) continue;
      celdas[colNum(ref)] = / t="s"/.test(cab) ? textos[Number(v)] ?? "" : decodificar(v);
    }
    const g = (col: string) => celdas[colNum(col)] ?? "";
    if (limpiarEspacios(g("D")).toUpperCase() !== DEPARTAMENTO.toUpperCase() || !/buenos aires/i.test(g("A")) || /ciudad/i.test(g("A"))) continue;
    const marca = (...cols: string[]) => cols.some((c) => g(c) === "1");
    const niveles: Nivel[] = [];
    if (marca("U", "V", "AB", "AC", "AN")) niveles.push("Inicial");
    if (marca("W", "AD", "AO")) niveles.push("Primaria");
    if (marca("X", "AE", "AP")) niveles.push("Secundaria");
    if (marca("Y")) niveles.push("Técnica");
    if (marca("Q")) niveles.push("Especial");
    if (marca("R", "AG", "AH", "AI", "AJ", "AK", "AL")) niveles.push("Adultos");
    if (marca("Z", "AA")) niveles.push("Terciario");
    if (!niveles.length) continue;
    const cue = limpiarEspacios(g("I") || g("H"));
    const nombre = nombreLindo(g("J"));
    if (!cue || !nombre) continue;
    escuelas.push({
      id: cue, nombre, sector: /estatal|p[úu]blic/i.test(g("B")) ? "Estatal" : "Privada", niveles,
      direccion: linda(g("K")), barrio: linda(g("F")), telefono: telefonoLindo(g("M"), g("N")),
    });
  }
  void filas; void leidas;
  escuelas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return { escuelas, fuente, anio, total: escuelas.length };
}

// Busca en la página oficial el padrón más nuevo (el primer .xlsx del listado) y lo baja
export async function bajarPadron(): Promise<{ bytes: Uint8Array; url: string }> {
  const cab = { "User-Agent": "Mozilla/5.0 (LomasHoy)" };
  const pagina = await (await fetch(URL_PADRON, { headers: cab, signal: AbortSignal.timeout(30_000) })).text();
  const rel = /href="([^"]+padron[^"]*establecimientos[^"]*\.xlsx)"/i.exec(pagina)?.[1];
  if (!rel) throw new Error("No se encontró el archivo del padrón en la página oficial");
  const url = new URL(rel, "https://www.argentina.gob.ar").toString();
  const r = await fetch(url, { headers: cab, signal: AbortSignal.timeout(120_000) });
  if (!r.ok) throw new Error(`El padrón respondió ${r.status}`);
  return { bytes: new Uint8Array(await r.arrayBuffer()), url };
}
