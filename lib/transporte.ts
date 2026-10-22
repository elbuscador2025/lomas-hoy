// Estado del transporte (Tren Roca, Colectivos, Subte): lo usan la pantalla principal y el saludo de la mañana.
import { config } from "@/lomas.config.mjs";
import { clasificarTren, hoyMMDD, type Todo } from "@/lib/datos";

export type Punto = "ok" | "alerta" | "problema" | "sin"; // verde, amarillo, rojo, gris
export type Renglon = {
  id: "tren" | "colectivos" | "subte"; nombre: string; punto: Punto;
  texto: string; // lo que se ve en el renglón: "Normal", "Paro de la línea 60", "Sin datos por ahora"
  ojo?: string; // lo mismo, para decirlo en una frase ("paro de la línea 60")
};

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const unir = (l: string[]) => (l.length > 1 ? `${l.slice(0, -1).join(", ")} y ${l[l.length - 1]}` : l[0]);

function claveTren(motivo: string) {
  return /interrump|suspendid|sin servicio|cerrad/i.test(motivo) ? "Interrumpido" : /demora/i.test(motivo) ? "Demoras" : /limitad|reduc/i.test(motivo) ? "Servicio limitado" : "Con novedades";
}

export function transporteDe(d: Todo): Renglon[] {
  // Tren Roca
  let tren: Renglon = { id: "tren", nombre: "Tren Roca", punto: "sin", texto: "Sin datos por ahora" };
  if (d.tren?.contenido) {
    const delDia = clasificarTren(d.tren.contenido.novedades, hoyMMDD()).delDia;
    tren = delDia.length
      ? { ...tren, punto: "problema", texto: `${claveTren(delDia[0].motivo)} · ${delDia[0].ramal}${delDia.length > 1 ? ` (+${delDia.length - 1})` : ""}`, ojo: `tren Roca: ${minuscula(claveTren(delDia[0].motivo))}` }
      : { ...tren, punto: "ok", texto: "Normal" };
  }
  // Colectivos
  let col: Renglon = { id: "colectivos", nombre: "Colectivos", punto: "sin", texto: "Sin datos por ahora" };
  if (d.colectivos?.contenido) {
    const paros = d.colectivos.contenido.paros.filter((p) => Date.now() - new Date(p.fecha).getTime() <= config.colectivos.diasMaximos * 86400_000);
    const resumen = paros[0] ? ((paros[0] as { resumen?: string }).resumen ?? "Paro de colectivos") : "";
    col = paros.length ? { ...col, punto: "problema", texto: resumen, ojo: minuscula(resumen) } : { ...col, punto: "ok", texto: "Normal" };
  }
  // Subte
  let subte: Renglon = { id: "subte", nombre: "Subte", punto: "sin", texto: "Sin datos por ahora" };
  if (d.subte?.contenido) {
    const l = d.subte.contenido.lineas;
    const rotas = l.filter((x) => x.estado === "interrumpida" || x.estado === "paro"), demoras = l.filter((x) => x.estado === "demora");
    const nombre = (x: { id: string }) => (x.id === "Premetro" ? "Premetro" : x.id);
    const dicho = (xs: typeof l, verbo: string) => (xs.length === 1 && xs[0].id !== "Premetro" ? `Línea ${xs[0].id} ${verbo}` : xs.length === 1 ? `Premetro ${verbo}` : `Líneas ${unir(xs.map(nombre))} ${verbo}`);
    if (rotas.length) {
      const algunoParo = rotas.some((x) => x.estado === "paro");
      const t = dicho(rotas, algunoParo ? "con paro" : "interrumpida" + (rotas.length > 1 ? "s" : ""));
      subte = { ...subte, punto: "problema", texto: t, ojo: t };
    } else if (demoras.length) {
      subte = { ...subte, punto: "alerta", texto: `Demoras en ${demoras.length === 1 ? "línea" : "líneas"} ${unir(demoras.map(nombre))}` };
    } else subte = { ...subte, punto: "ok", texto: "Normal" };
  }
  return [tren, col, subte];
}

// La luz en el saludo: el corte programado de hoy, o "sin cortes de luz informados" si no hay ninguno (ni ahora ni programado).
// Si hay cortes en este momento no se dice nada de la luz (no se puede decir "sin cortes").
export type LuzSaludo = { programado: string | null; sinCortes: boolean };
const hhLuz = (f: string) => { const [h, m] = f.slice(11, 16).split(":"); return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`; };
export function luzParaSaludo(d: Todo, ahoraAR: string, viejo = false): LuzSaludo {
  const hoy = ahoraAR.slice(0, 10);
  const p = (d.programados?.contenido?.cortes ?? []).find((x) => x.inicio.slice(0, 10) === hoy && x.fin >= ahoraAR);
  const programado = p ? `corte de luz programado hoy en ${p.localidad}, de ${hhLuz(p.inicio)} a ${hhLuz(p.fin)} hs` : null;
  const sinCortes = !viejo && !!d.luz?.contenido && d.luz.contenido.cortes.length === 0 && !programado;
  return { programado, sinCortes };
}

// Segunda línea del saludo (pantalla principal y notificación): "Tren, colectivos y subte normales[, sin cortes en tu zona]." o "Ojo: ...".
export function estadoEnUnaFrase(r: Renglon[], luz: LuzSaludo) {
  const ojos = r.map((x) => x.ojo).filter((x): x is string => !!x);
  if (luz.programado) ojos.push(luz.programado);
  if (ojos.length) return `Ojo: ${ojos.join("; ")}.`;
  const normales = r.filter((x) => x.punto === "ok" || x.punto === "alerta").map((x) => (x.id === "tren" ? "Tren" : x.nombre.toLowerCase()));
  if (!normales.length) return "";
  return `${unir(normales)} ${normales.length > 1 ? "normales" : "normal"}${luz.sinCortes ? ", sin cortes de luz informados" : ""}.`;
}
