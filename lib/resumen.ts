// Resumen de la mañana: una sola notificación por día, con lo que corresponde a cada celular (dos líneas como máximo).
import { config } from "@/lomas.config.mjs";
import { redis } from "@/lib/servidor";
import { ahoraAR } from "@/lib/avisos";
import { asegurarClima } from "@/lib/clima";
import { clasificarTren, hoyMMDD, nombreLindo, type Tren, type Luz, type Colectivos, type Programados } from "@/lib/datos";
import { resumenAnses, terminaciones, type PagoAnses } from "@/lib/anses";
import { avisosDeFeriado } from "@/lib/feriados";
import { mismaLocalidad } from "@/lib/localidades";
import { notificarSeguro, enviarAUno, leerSuscripcion, type Suscripcion } from "@/lib/push";

const hh = (hora: string) => { const [h, m] = hora.split(":"); return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`; };
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const parsear = <T,>(f: unknown) => (f ? (JSON.parse(f as string) as { contenido: T | null }).contenido : null);

type Datos = {
  ahora: string; temp: number | null; frase: string | null;
  tren: Tren | null; colectivos: Colectivos | null; luz: Luz | null; programados: Programados | null; pagos: PagoAnses[];
};

export async function cargar(): Promise<Datos> {
  const [clima, pron, tren, colectivos, luz, programados, anses] = await redis([
    ["GET", "datos:clima"], ["GET", "datos:pronostico"], ["GET", "datos:tren"], ["GET", "datos:colectivos"], ["GET", "datos:luz"], ["GET", "datos:programados"], ["HVALS", "anses"],
  ]);
  const crudo = clima ? JSON.parse(clima as string) : null;
  const fila = await asegurarClima(crudo, pron ? JSON.parse(pron as string) : null).catch(() => crudo);
  return {
    ahora: ahoraAR(), temp: fila?.contenido?.ahora?.temp ?? null, frase: fila?.contenido?.frase ?? null,
    tren: parsear<Tren>(tren), colectivos: parsear<Colectivos>(colectivos), luz: parsear<Luz>(luz), programados: parsear<Programados>(programados),
    pagos: ((anses as string[]) ?? []).map((j) => JSON.parse(j) as PagoAnses),
  };
}

// Renglón 1: el clima. Renglón 2: lo demás, solo si corresponde, separado con "·".
export function textoResumen(d: Datos, localidad?: string) {
  const hoy = d.ahora.slice(0, 10);
  const linea1 = d.temp != null ? `Hoy ${Math.round(d.temp)}°${d.frase ? `, ${minuscula(d.frase.replace(/^Hoy /, ""))}` : ""}.` : "Buen día, Lomas.";

  const partes: string[] = [];
  if (avisosDeFeriado(hoy)[0]?.startsWith("Hoy es feriado")) partes.push("Hoy es feriado");
  if (d.tren) { const dia = clasificarTren(d.tren.novedades, hoyMMDD()).delDia; partes.push(dia.length ? `Roca: ${dia[0].ramal}` : "Roca normal"); }
  if (d.colectivos) {
    const paros = d.colectivos.paros.filter((p) => Date.now() - new Date(p.fecha).getTime() <= config.colectivos.diasMaximos * 86400_000);
    partes.push(paros.length ? "Paro de colectivos" : "Sin paros");
  }
  if (localidad) { // los avisos de luz son solo de la localidad que eligió
    const ahora = (d.luz?.cortes ?? []).filter((c) => mismaLocalidad(localidad, c.localidad));
    const usuarios = ahora.reduce((t, c) => t + c.usuarios, 0);
    if (ahora.length) partes.push(`Luz: corte en ${nombreLindo(ahora[0].localidad ?? localidad)} (${usuarios} usuarios)`);
    const prog = (d.programados?.cortes ?? []).filter((c) => mismaLocalidad(localidad, c.localidad) && c.inicio.slice(0, 10) === hoy && c.fin >= d.ahora);
    if (prog.length) partes.push(`Corte de luz programado hoy, de ${hh(prog[0].inicio.slice(11, 16))} a ${hh(prog[0].fin.slice(11, 16))} hs`);
  }
  const cobran = resumenAnses(d.pagos, hoy).delMes.filter((p) => p.fecha === hoy);
  if (cobran.length) partes.push(`Cobran DNI ${terminaciones([...new Set(cobran.flatMap((p) => p.dnis))].sort((a, b) => a - b))}`);
  return partes.length ? `${linea1}\n${partes.join(" · ")}` : linea1;
}

const TITULO = "Resumen de la mañana";

// Corre en cada vuelta del proceso automático: la primera después de las 7 lo manda (una vez por día).
export async function evaluarResumen() {
  const ahora = ahoraAR();
  const hm = ahora.slice(11, 16);
  const v = config.push.horaResumen;
  if (hm < v.desde || hm >= v.hasta) return;
  const d = await cargar();
  await notificarSeguro({
    tipo: "resumen", clave: `resumen:${ahora.slice(0, 10)}`, ttl: 2 * 86400,
    titulo: TITULO, cuerpo: (s: Suscripcion) => textoResumen(d, s.localidad), url: "/",
  });
}

// Botón de mi panel: se manda ahora a este celular, sin esperar a las 7 (no cuenta para el tope ni se repite).
export async function enviarResumenAhora(endpoint: string) {
  const s = await leerSuscripcion(endpoint);
  if (!s) return { ok: false, mensaje: "Este celular no tiene los avisos activados." };
  const d = await cargar();
  return enviarAUno(endpoint, { titulo: TITULO, cuerpo: textoResumen(d, s.localidad), url: "/", tag: "resumen-prueba", tipo: "resumen" }, "resumen (prueba)");
}
